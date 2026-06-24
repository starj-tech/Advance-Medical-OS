"use client";

/**
 * Device transport layer — the web re-architecture of hardware_bridge.rs.
 *
 * The original Rust bridge ran a `physical_serial_producer` (read serial bytes,
 * buffer them, split on '\n', emit one SensorData per frame, with a 5s watchdog
 * that reset a hung port) alongside a `simulator_producer`, multiplexed into a
 * single stream. We preserve that behaviour:
 *
 *   - Framing: bytes are accumulated and split on '\n'; only complete frames
 *     are parsed (prevents fragmentation across reads), exactly as before.
 *   - Watchdog: if no frame arrives within WATCHDOG_MS, we emit a "resetting"
 *     status and tear the connection down to retry — the Rust HARDWARE_RESET.
 *   - Dual mode: a simulator transport provides data when no device is present,
 *     so demo/training works and this is verifiable without hardware.
 *
 * The physical connection now lives on the *client* (the machine next to the
 * device) via the browser's Web Serial / Web Bluetooth APIs — the only place a
 * web app can touch local hardware. A Vercel server cannot, by design.
 */

import type { DriverDescriptor, DeviceStatus } from "./types";

export const WATCHDOG_MS = 5000; // matches the 5000ms watchdog in hardware_bridge.rs

export type TransportEvent =
  | { type: "status"; status: DeviceStatus; message?: string }
  | { type: "reading"; metrics: Record<string, number | string> };

export interface Transport {
  /** Begin streaming; invokes `onEvent` for each status change / reading. */
  start(onEvent: (e: TransportEvent) => void): Promise<void>;
  stop(): Promise<void>;
}

/** Feature detection so the UI can disable unavailable transports. */
export const capabilities = {
  webSerial: () => typeof navigator !== "undefined" && "serial" in navigator,
  webBluetooth: () =>
    typeof navigator !== "undefined" && "bluetooth" in navigator,
};

/* -------------------------------------------------------------------------- */
/* Simulator — the simulator_producer port. Always available.                  */
/* -------------------------------------------------------------------------- */

export class SimulatorTransport implements Transport {
  private timer: ReturnType<typeof setInterval> | null = null;
  constructor(
    private driver: DriverDescriptor,
    private intervalMs = 1500, // 1500ms cadence, as in the Rust simulator
  ) {}

  async start(onEvent: (e: TransportEvent) => void): Promise<void> {
    onEvent({ type: "status", status: "streaming" });
    const tick = () => {
      // Occasionally inject a disconnect blip so the UI's error path is real,
      // mirroring the 5% error injection in simulator_producer.
      if (Math.random() < 0.04) {
        onEvent({
          type: "status",
          status: "error",
          message: "Simulated signal dropout — retrying…",
        });
        return;
      }
      onEvent({ type: "reading", metrics: this.driver.simulate() });
    };
    tick();
    this.timer = setInterval(tick, this.intervalMs);
  }

  async stop(): Promise<void> {
    if (this.timer) clearInterval(this.timer);
    this.timer = null;
  }
}

/* -------------------------------------------------------------------------- */
/* Web Serial — the physical_serial_producer port (Chromium, HTTPS).          */
/* -------------------------------------------------------------------------- */

export class WebSerialTransport implements Transport {
  private port: SerialPort | null = null;
  private reader: ReadableStreamDefaultReader<Uint8Array> | null = null;
  private running = false;

  constructor(
    private driver: DriverDescriptor,
    private baudRate = 9600, // 9600 baud, as in hardware_bridge.rs
  ) {}

  async start(onEvent: (e: TransportEvent) => void): Promise<void> {
    if (!capabilities.webSerial()) {
      onEvent({
        type: "status",
        status: "error",
        message: "Web Serial not supported in this browser (use Chrome/Edge).",
      });
      return;
    }
    onEvent({ type: "status", status: "connecting" });
    try {
      // Prompts the user to pick a port — required user gesture.
      this.port = await navigator.serial.requestPort();
      await this.port.open({ baudRate: this.baudRate });
    } catch (err) {
      onEvent({
        type: "status",
        status: "error",
        message:
          err instanceof Error ? err.message : "Failed to open serial port",
      });
      return;
    }

    onEvent({ type: "status", status: "streaming" });
    this.running = true;
    void this.readLoop(onEvent);
  }

  /** Buffered, newline-delimited frame parsing + watchdog (Rust port). */
  private async readLoop(onEvent: (e: TransportEvent) => void): Promise<void> {
    const decoder = new TextDecoder();
    let buffer = "";
    let lastFrameAt = Date.now();

    const watchdog = setInterval(() => {
      if (Date.now() - lastFrameAt > WATCHDOG_MS) {
        onEvent({
          type: "status",
          status: "resetting",
          message: "Device hung — resetting port…",
        });
        void this.stop();
      }
    }, 1000);

    try {
      while (this.running && this.port?.readable) {
        this.reader = this.port.readable.getReader();
        try {
          while (this.running) {
            const { value, done } = await this.reader.read();
            if (done) break;
            if (!value) continue;
            buffer += decoder.decode(value, { stream: true });
            // Process only complete frames; keep the remainder.
            let nl: number;
            while ((nl = buffer.indexOf("\n")) >= 0) {
              const frame = buffer.slice(0, nl);
              buffer = buffer.slice(nl + 1);
              const metrics = this.driver.parseFrame(frame);
              if (metrics) {
                lastFrameAt = Date.now();
                onEvent({ type: "reading", metrics });
              }
            }
          }
        } finally {
          this.reader.releaseLock();
          this.reader = null;
        }
      }
    } catch (err) {
      onEvent({
        type: "status",
        status: "error",
        message: err instanceof Error ? err.message : "Serial read error",
      });
    } finally {
      clearInterval(watchdog);
    }
  }

  async stop(): Promise<void> {
    this.running = false;
    try {
      await this.reader?.cancel();
    } catch {
      /* ignore */
    }
    try {
      await this.port?.close();
    } catch {
      /* ignore */
    }
    this.reader = null;
    this.port = null;
  }
}

/* -------------------------------------------------------------------------- */
/* Web Bluetooth — BLE devices (Chromium, HTTPS).                              */
/* -------------------------------------------------------------------------- */

export class WebBluetoothTransport implements Transport {
  private device: BluetoothDevice | null = null;
  private char: BluetoothRemoteGATTCharacteristic | null = null;
  private onEvent: ((e: TransportEvent) => void) | null = null;

  // Heart Rate Service (0x180D) is the canonical, widely-supported example.
  constructor(
    private driver: DriverDescriptor,
    private serviceUuid: BluetoothServiceUUID = "heart_rate",
    private charUuid: BluetoothCharacteristicUUID = "heart_rate_measurement",
  ) {}

  async start(onEvent: (e: TransportEvent) => void): Promise<void> {
    this.onEvent = onEvent;
    if (!capabilities.webBluetooth()) {
      onEvent({
        type: "status",
        status: "error",
        message: "Web Bluetooth not supported in this browser (use Chrome/Edge).",
      });
      return;
    }
    onEvent({ type: "status", status: "connecting" });
    try {
      this.device = await navigator.bluetooth.requestDevice({
        filters: [{ services: [this.serviceUuid] }],
      });
      const server = await this.device.gatt!.connect();
      const service = await server.getPrimaryService(this.serviceUuid);
      this.char = await service.getCharacteristic(this.charUuid);
      await this.char.startNotifications();
      this.char.addEventListener(
        "characteristicvaluechanged",
        this.handleValue,
      );
      this.device.addEventListener("gattserverdisconnected", this.handleDrop);
      onEvent({ type: "status", status: "streaming" });
    } catch (err) {
      onEvent({
        type: "status",
        status: "error",
        message: err instanceof Error ? err.message : "BLE connection failed",
      });
    }
  }

  private handleValue = (event: Event) => {
    const target = event.target as BluetoothRemoteGATTCharacteristic;
    const dv = target.value;
    if (!dv || !this.onEvent) return;
    // Decode standard Heart Rate Measurement (flags byte + uint8/uint16 HR).
    const flags = dv.getUint8(0);
    const hr = flags & 0x1 ? dv.getUint16(1, true) : dv.getUint8(1);
    this.onEvent({ type: "reading", metrics: { pr: hr, spo2: 0, hr } });
  };

  private handleDrop = () => {
    this.onEvent?.({
      type: "status",
      status: "disconnected",
      message: "BLE device disconnected",
    });
  };

  async stop(): Promise<void> {
    try {
      this.char?.removeEventListener(
        "characteristicvaluechanged",
        this.handleValue,
      );
      await this.char?.stopNotifications();
      this.device?.gatt?.disconnect();
    } catch {
      /* ignore */
    }
    this.char = null;
    this.device = null;
  }
}

/** Factory: pick a transport implementation for a driver + kind. */
export function makeTransport(
  driver: DriverDescriptor,
  kind: "web-serial" | "web-bluetooth" | "simulator",
): Transport {
  if (kind === "web-serial") return new WebSerialTransport(driver);
  if (kind === "web-bluetooth") return new WebBluetoothTransport(driver);
  return new SimulatorTransport(driver);
}
