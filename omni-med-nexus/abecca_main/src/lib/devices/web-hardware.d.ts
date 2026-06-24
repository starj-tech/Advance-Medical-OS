/**
 * Minimal ambient types for the experimental browser hardware APIs
 * (Web Serial + Web Bluetooth). These ship in Chromium but are not yet in
 * TypeScript's default DOM lib, so we declare just the surface we use. This
 * keeps the build strict without pulling in a large external dependency.
 */

interface SerialPort {
  readable: ReadableStream<Uint8Array> | null;
  writable: WritableStream<Uint8Array> | null;
  open(options: { baudRate: number }): Promise<void>;
  close(): Promise<void>;
}

interface Serial {
  requestPort(): Promise<SerialPort>;
  getPorts(): Promise<SerialPort[]>;
}

interface BluetoothRemoteGATTCharacteristic extends EventTarget {
  value?: DataView;
  startNotifications(): Promise<BluetoothRemoteGATTCharacteristic>;
  stopNotifications(): Promise<BluetoothRemoteGATTCharacteristic>;
}

interface BluetoothRemoteGATTService {
  getCharacteristic(
    uuid: BluetoothCharacteristicUUID,
  ): Promise<BluetoothRemoteGATTCharacteristic>;
}

interface BluetoothRemoteGATTServer {
  connect(): Promise<BluetoothRemoteGATTServer>;
  disconnect(): void;
  getPrimaryService(
    uuid: BluetoothServiceUUID,
  ): Promise<BluetoothRemoteGATTService>;
}

interface BluetoothDevice extends EventTarget {
  gatt?: BluetoothRemoteGATTServer;
}

type BluetoothServiceUUID = number | string;
type BluetoothCharacteristicUUID = number | string;

interface Bluetooth {
  requestDevice(options: {
    filters?: Array<{ services?: BluetoothServiceUUID[]; name?: string }>;
    optionalServices?: BluetoothServiceUUID[];
    acceptAllDevices?: boolean;
  }): Promise<BluetoothDevice>;
}

interface Navigator {
  serial: Serial;
  bluetooth: Bluetooth;
}
