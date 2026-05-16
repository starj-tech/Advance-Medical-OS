#!/bin/bash

# 1. Update Nexus Bridge to listen to hardware disconnects
cat << 'INNER_EOF' > omni_med_nexus_os/next_app/src/lib/nexusBridge.ts
import { io, Socket } from 'socket.io-client';
import { useHospitalStore } from '../store';

class NexusBridge {
  private socket: Socket | null = null;
  public isConnected: boolean = false;

  connect() {
    if (this.isConnected) return;

    // In Tauri environment, we use local IPC. For Web/mock we use WebSockets.
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

    // Hardware Watchdog from Rust
    this.socket.on('hardware-stream-error', (errorMsg: string) => {
      useHospitalStore.getState().setHardwareStatus("ERROR");
      useHospitalStore.getState().addAlert(errorMsg);
    });

    this.socket.on('hardware-stream-icu', (data: any) => {
      useHospitalStore.getState().setHardwareStatus("CONNECTED");
      useHospitalStore.getState().updateHardwareData(data);
    });
  }

  triggerRollback() {
    console.log("Triggering 1-Click Rollback to Tauri Backend...");
    this.socket?.emit('trigger-rollback');
    useHospitalStore.getState().addAlert("EMERGENCY ROLLBACK INITIATED. Reverting to legacy DB.");
  }
}

export const nexusBridge = new NexusBridge();
INNER_EOF

# 2. Update Zustand Store
cat << 'INNER_EOF' > omni_med_nexus_os/next_app/src/store.ts
import { create } from 'zustand';

interface HardwareData {
  device_id: string;
  heart_rate: number;
  spo2: number;
  blood_pressure: string;
}

interface HospitalState {
  userRole: string | null;
  hardwareData: HardwareData | null;
  hardwareStatus: "CONNECTED" | "DISCONNECTED" | "ERROR" | "CONNECTING";
  ewsAlerts: string[];
  login: (role: string) => void;
  logout: () => void;
  updateHardwareData: (data: HardwareData) => void;
  setHardwareStatus: (status: "CONNECTED" | "DISCONNECTED" | "ERROR" | "CONNECTING") => void;
  addAlert: (alert: string) => void;
}

export const useHospitalStore = create<HospitalState>((set) => ({
  userRole: null,
  hardwareData: null,
  hardwareStatus: "CONNECTING",
  ewsAlerts: [],
  login: (role) => set({ userRole: role }),
  logout: () => set({ userRole: null, hardwareData: null, ewsAlerts: [] }),
  updateHardwareData: (data) => set({ hardwareData: data }),
  setHardwareStatus: (status) => set({ hardwareStatus: status }),
  addAlert: (alert) => set((state) => ({ ewsAlerts: [...state.ewsAlerts, alert] })),
}));
INNER_EOF

# 3. Create Support Widget & Update ER UI
cat << 'INNER_EOF' > omni_med_nexus_os/next_app/src/app/page.tsx
'use client';
import { useEffect, useState } from 'react';
import { useHospitalStore } from '@/store';
import { nexusBridge } from '@/lib/nexusBridge';
import { GlassCard } from '@/components/GlassCard';
import { ClinicalButton } from '@/components/ClinicalButton';

export default function Home() {
  const { userRole, login, hardwareData, hardwareStatus, ewsAlerts } = useHospitalStore();
  const [showOnboarding, setShowOnboarding] = useState(false);

  useEffect(() => {
    nexusBridge.connect();
    // Simulate initial login onboarding popup
    setTimeout(() => setShowOnboarding(true), 1000);
  }, []);

  if (!userRole) {
    return (
      <main className="flex min-h-screen flex-col items-center justify-center bg-desktop-gradient p-24">
        <GlassCard className="text-center w-full max-w-2xl">
          <h1 className="text-4xl font-bold text-pulse-mintEnd mb-4">OMNI-MED NEXUS OS</h1>
          <p className="text-gray-300 mb-8">Select your specialized workspace</p>
          <div className="flex flex-wrap justify-center gap-4">
            <ClinicalButton label="Login Sp.EM (ER)" onClick={() => login('ER')} />
            <ClinicalButton label="Login Exec (CEO/CFO)" onClick={() => login('EXEC')} variant="success" />
          </div>
        </GlassCard>
      </main>
    );
  }

  return (
    <main className="min-h-screen p-8 bg-desktop-gradient flex relative">
      {/* Interactive Digital Onboarding Overlay */}
      {showOnboarding && (
        <div className="absolute inset-0 bg-black/60 z-50 flex items-center justify-center">
          <GlassCard className="max-w-lg bg-pulse-deepBlueStart/90 border-pulse-mintEnd">
            <h2 className="text-2xl font-bold text-pulse-mintEnd mb-4">Welcome to your Neural Cockpit, Doctor.</h2>
            <p className="text-white mb-6">We've migrated your old legacy records. Let's take a 30-second tour of how to use the AI Triage and Hardware connection safely.</p>
            <ClinicalButton label="Start Guided Tour" onClick={() => setShowOnboarding(false)} />
          </GlassCard>
        </div>
      )}

      {/* Side Navigation */}
      <div className="w-20 flex flex-col items-center bg-black/30 rounded-full py-8 space-y-8 mr-8">
        <div className="w-12 h-12 bg-pulse-mintStart rounded-full"></div>
        <div className="flex-1"></div>
        <button onClick={() => useHospitalStore.getState().logout()} className="w-12 h-12 bg-pulse-alertRed rounded-full text-white text-xs">Exit</button>
      </div>

      {/* Main Content Area */}
      <div className="flex-1">
        {userRole === 'ER' && (
          <div className="space-y-6">
            <h2 className="text-3xl font-bold text-pulse-mintEnd">ER Triage Workspace (Sp.EM)</h2>

            {/* Graceful Degradation Banner */}
            {hardwareStatus === 'ERROR' && (
              <div className="w-full bg-pulse-alertYellow/20 border border-pulse-alertYellow text-pulse-alertYellow p-4 rounded-xl flex items-center gap-4">
                <span className="text-2xl">⚠️</span>
                <div>
                  <p className="font-bold">Hardware Cable Disconnected</p>
                  <p className="text-sm">The Bed Monitor stream was interrupted. Switching to Manual Input Mode to prevent UI freeze.</p>
                </div>
              </div>
            )}

            <div className="flex gap-6">
              <GlassCard className="flex-1">
                <h3 className="text-xl font-semibold mb-4 text-pulse-alertYellow">Live Telemetry</h3>
                {hardwareStatus === 'CONNECTED' && hardwareData ? (
                  <div className="text-4xl font-mono text-pulse-alertGreen">
                    HR: {hardwareData.heart_rate} | SpO2: {hardwareData.spo2}%
                  </div>
                ) : (
                  <div className="flex flex-col gap-2">
                    <p className="text-gray-400">Manual Entry Mode</p>
                    <input type="text" placeholder="Enter HR manually..." className="p-2 rounded bg-black/50 text-white" />
                  </div>
                )}
              </GlassCard>
            </div>
          </div>
        )}

        {userRole === 'EXEC' && (
          <div className="space-y-6">
            <h2 className="text-3xl font-bold text-pulse-mintEnd">Command Center</h2>
            <GlassCard className="w-full">
              <h3 className="text-xl font-semibold mb-4 text-pulse-alertRed">Disaster Recovery Protocol</h3>
              <p className="text-gray-300 mb-4">Use this ONLY if The Great Migration causes systemic failure. This will isolate the NexusConnect ETL and revert to Oracle Legacy DB.</p>
              <ClinicalButton label="Initiate 1-Click Rollback" variant="alert" onClick={() => nexusBridge.triggerRollback()} />
            </GlassCard>
          </div>
        )}
      </div>

      {/* 24/7 SLA Ticketing SOS Widget */}
      <div className="fixed bottom-8 right-8">
        <button
          onClick={() => alert("SOS Triggered. Sending Error Log & Local State to Level 2 Engineering Support...")}
          className="bg-pulse-alertRed hover:bg-red-700 text-white rounded-full p-4 shadow-lg shadow-red-500/50 flex items-center justify-center"
        >
          <span className="font-bold">SOS Helpdesk</span>
        </button>
      </div>
    </main>
  );
}
INNER_EOF
