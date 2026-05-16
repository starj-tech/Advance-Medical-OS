#!/bin/bash
cat << 'INNER_EOF' > omni_med_nexus_os/next_app/src/lib/nexusBridge.ts
import { io, Socket } from 'socket.io-client';
import { useHospitalStore } from '../store';

let tauriInvoke: any = null;
let tauriListen: any = null;

try {
  if (typeof window !== 'undefined' && window.__TAURI__) {
    const tauriApi = require('@tauri-apps/api');
    tauriInvoke = tauriApi.invoke;
    tauriListen = tauriApi.event.listen;
  }
} catch (e) {
  console.log("Tauri API not found, assuming Web Browser Mode.");
}

class NexusBridge {
  private socket: Socket | null = null;
  public isConnected: boolean = false;
  public connectionMode: 'NATIVE_IPC' | 'WEBSOCKET' | 'NONE' = 'NONE';
  private reconnectAttempts = 0;

  async connect() {
    if (this.isConnected) return;
    this.reconnectAttempts = 0;
    await this._establishConnection();
  }

  private async _establishConnection() {
    useHospitalStore.getState().setHardwareStatus("CONNECTING");

    if (tauriListen) {
      this.connectionMode = 'NATIVE_IPC';
      this.isConnected = true;
      useHospitalStore.getState().setHardwareStatus("CONNECTED");

      await tauriListen('hardware-stream-icu', (event: any) => {
        useHospitalStore.getState().setHardwareStatus("CONNECTED");
        useHospitalStore.getState().updateHardwareData(event.payload);
        this.reconnectAttempts = 0; // Reset on successful frame
      });

      await tauriListen('hardware-stream-error', (event: any) => {
        // Watchdog can send HARDWARE_RESET or DISCONNECT
        if (event.payload.includes("HARDWARE_RESET")) {
           useHospitalStore.getState().setHardwareStatus("ERROR");
           useHospitalStore.getState().addAlert(event.payload);
        } else {
           this.handleDisconnect(event.payload);
        }
      });

    } else {
      this.connectionMode = 'WEBSOCKET';
      this.socket = io('ws://localhost:9090', { reconnection: false });

      this.socket.on('connect', () => {
        this.isConnected = true;
        this.reconnectAttempts = 0;
        useHospitalStore.getState().setHardwareStatus("CONNECTED");
      });

      this.socket.on('disconnect', () => {
        this.handleDisconnect("SYSTEM: Nexus Bridge Offline. Manual mode enabled.");
      });

      this.socket.on('hardware-stream-error', (errorMsg: string) => {
         if (errorMsg.includes("HARDWARE_RESET")) {
           useHospitalStore.getState().setHardwareStatus("ERROR");
           useHospitalStore.getState().addAlert(errorMsg);
        } else {
           this.handleDisconnect(errorMsg);
        }
      });

      this.socket.on('hardware-stream-icu', (data: any) => {
        useHospitalStore.getState().setHardwareStatus("CONNECTED");
        useHospitalStore.getState().updateHardwareData(data);
        this.reconnectAttempts = 0;
      });
    }
  }

  private handleDisconnect(msg: string) {
    if (this.isConnected) {
      this.isConnected = false;
      useHospitalStore.getState().setHardwareStatus("DISCONNECTED");
      useHospitalStore.getState().addAlert(msg);
    }

    // Exponential Backoff Reconnection Logic
    if (this.reconnectAttempts < 6) {
      const backoffTime = Math.pow(2, this.reconnectAttempts) * 1000;
      this.reconnectAttempts++;
      console.log(`Connection lost. Retrying in ${backoffTime/1000}s...`);

      setTimeout(() => {
        if (!this.isConnected) {
          this._establishConnection();
        }
      }, backoffTime);
    } else {
      useHospitalStore.getState().setHardwareStatus("ERROR");
      useHospitalStore.getState().addAlert("CRITICAL: Reconnection failed permanently. Call IT Support.");
    }
  }

  async triggerRollback() {
    if (tauriInvoke) {
      try {
        const res = await tauriInvoke('tauri_trigger_rollback');
        useHospitalStore.getState().addAlert(res as string);
      } catch (err) {
        useHospitalStore.getState().addAlert(`Rollback Error: ${err}`);
      }
    } else {
      this.socket?.emit('trigger-rollback');
      useHospitalStore.getState().addAlert("EMERGENCY ROLLBACK INITIATED via WebSocket.");
    }
  }
}

export const nexusBridge = new NexusBridge();
INNER_EOF
