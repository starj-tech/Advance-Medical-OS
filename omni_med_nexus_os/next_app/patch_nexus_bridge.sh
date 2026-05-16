#!/bin/bash
cat << 'INNER_EOF' > omni_med_nexus_os/next_app/src/lib/nexusBridge.ts
import { io, Socket } from 'socket.io-client';
import { useHospitalStore } from '../store';

// Conditionally import Tauri API to prevent Web breaking if not inside Tauri container
let tauriInvoke: any = null;
let tauriListen: any = null;

try {
  // Webpack dynamic import handling for Tauri
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

  async connect() {
    if (this.isConnected) return;

    if (tauriListen) {
      console.log('NexusBridge: Connecting via Native Tauri IPC (Zero Latency)');
      this.connectionMode = 'NATIVE_IPC';
      this.isConnected = true;
      useHospitalStore.getState().setHardwareStatus("CONNECTED");

      await tauriListen('hardware-stream-icu', (event: any) => {
        useHospitalStore.getState().setHardwareStatus("CONNECTED");
        useHospitalStore.getState().updateHardwareData(event.payload);
      });

      await tauriListen('hardware-stream-error', (event: any) => {
        useHospitalStore.getState().setHardwareStatus("ERROR");
        useHospitalStore.getState().addAlert(event.payload);
      });

    } else {
      console.log('NexusBridge: Connecting via WebSocket (Browser Fallback)');
      this.connectionMode = 'WEBSOCKET';
      this.socket = io('ws://localhost:9090', { reconnectionDelayMax: 10000 });

      this.socket.on('connect', () => {
        this.isConnected = true;
        useHospitalStore.getState().setHardwareStatus("CONNECTED");
      });

      this.socket.on('disconnect', () => {
        this.isConnected = false;
        useHospitalStore.getState().setHardwareStatus("DISCONNECTED");
        useHospitalStore.getState().addAlert("SYSTEM: Nexus Bridge Offline. Manual mode enabled.");
      });

      this.socket.on('hardware-stream-error', (errorMsg: string) => {
        useHospitalStore.getState().setHardwareStatus("ERROR");
        useHospitalStore.getState().addAlert(errorMsg);
      });

      this.socket.on('hardware-stream-icu', (data: any) => {
        useHospitalStore.getState().setHardwareStatus("CONNECTED");
        useHospitalStore.getState().updateHardwareData(data);
      });
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
      console.log("Triggering 1-Click Rollback via WebSocket...");
      this.socket?.emit('trigger-rollback');
      useHospitalStore.getState().addAlert("EMERGENCY ROLLBACK INITIATED. Reverting to legacy DB.");
    }
  }

  async executeClinicalCommand(command: string, args: any) {
    if (tauriInvoke) {
      return await tauriInvoke(command, args);
    } else {
      console.warn("Clinical command fallback mode (Mock Data)");
      return "Result from Web Socket mock...";
    }
  }
}

export const nexusBridge = new NexusBridge();
INNER_EOF
