#!/bin/bash
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
  const [showVIPBreakGlass, setShowVIPBreakGlass] = useState(false);
  const [scribeApproval, setScribeApproval] = useState<string | null>(null);

  const [batteryMode, setBatteryMode] = useState("Normal");

  useEffect(() => {
    nexusBridge.connect();
    setTimeout(() => setShowOnboarding(true), 1000);
    setTimeout(() => setBatteryMode("Low Power (Adaptive Sync Active)"), 15000);
  }, []);

  if (!userRole) {
    return (
      <main className="flex min-h-screen flex-col items-center justify-center bg-desktop-gradient p-24">
        <GlassCard className="text-center w-full max-w-2xl">
          <h1 className="text-4xl font-bold text-pulse-mintEnd mb-4">OMNI-MED NEXUS OS</h1>
          <p className="text-gray-300 mb-8">Select your specialized workspace</p>
          <div className="flex flex-wrap justify-center gap-4">
            <ClinicalButton label="Login Sp.EM (ER)" onClick={() => login('ER')} />
            <ClinicalButton label="Login Intensivist (ICU)" onClick={() => login('ICU')} />
            <ClinicalButton label="Login Exec (CEO/CFO)" onClick={() => login('EXEC')} variant="success" />
          </div>
        </GlassCard>
      </main>
    );
  }

  return (
    <main className="min-h-screen p-8 bg-desktop-gradient flex relative">
      {/* Onboarding Overlay */}
      {showOnboarding && (
        <div className="absolute inset-0 bg-black/60 z-50 flex items-center justify-center">
          <GlassCard className="max-w-lg bg-pulse-deepBlueStart/90 border-pulse-mintEnd">
            <h2 className="text-2xl font-bold text-pulse-mintEnd mb-4">Welcome, Doctor.</h2>
            <p className="text-white mb-6">Let's take a tour of the new Hardware Diagnostics Interface.</p>
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

        {/* System Bar */}
        <div className="w-full flex justify-between mb-4 p-2 bg-black/40 rounded border border-white/10">
           <span className="text-gray-400">Sync: <span className="text-pulse-alertYellow">{batteryMode}</span></span>
           <span className="text-gray-400">Hardware Mode: <span className="text-pulse-mintEnd font-bold">{nexusBridge.connectionMode}</span> | Status: <span className={hardwareStatus === 'CONNECTED' ? 'text-pulse-alertGreen' : 'text-pulse-alertRed'}>{hardwareStatus}</span></span>
        </div>

        {userRole === 'ER' && (
          <div className="space-y-6">
            <h2 className="text-3xl font-bold text-pulse-mintEnd">ER Triage Workspace</h2>
            <div className="flex gap-4">
               <ClinicalButton label="Start Ghost Scribe AI" onClick={() => setScribeApproval("Give Patient 15mg of Aspirin")} />
            </div>
          </div>
        )}

        {userRole === 'ICU' && (
          <div className="space-y-6">
            <h2 className="text-3xl font-bold text-pulse-mintEnd">ICU Intensivist Workspace</h2>

            {hardwareStatus === 'ERROR' && (
              <div className="w-full bg-pulse-alertYellow/20 border border-pulse-alertYellow text-pulse-alertYellow p-4 rounded-xl flex items-center gap-4">
                <span className="text-2xl">⚠️</span>
                <div>
                  <p className="font-bold">Hardware Cable Disconnected</p>
                  <p className="text-sm">The Bed Monitor stream was interrupted. Switch to Manual Input Mode to prevent UI freeze.</p>
                </div>
              </div>
            )}

            <div className="flex gap-6">
              <GlassCard className="flex-1">
                <h3 className="text-xl font-semibold mb-4 text-pulse-alertYellow">Live Telemetry</h3>
                {hardwareStatus === 'CONNECTED' && hardwareData ? (
                  <div className="space-y-4">
                    <p className="text-sm text-gray-400">Device: {hardwareData.device_id}</p>
                    <div className="text-4xl font-mono text-pulse-alertGreen">HR: {hardwareData.heart_rate} bpm</div>
                    <div className="text-4xl font-mono text-blue-400">SpO2: {hardwareData.spo2}%</div>
                    <div className="text-4xl font-mono text-orange-400">BP: {hardwareData.blood_pressure}</div>
                  </div>
                ) : (
                  <div className="flex flex-col gap-2">
                    <p className="text-gray-400">Manual Entry Mode Active</p>
                    <input type="text" placeholder="Enter HR manually..." className="p-2 rounded bg-black/50 text-white border border-gray-600" />
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
              <ClinicalButton label="Initiate 1-Click Rollback" variant="alert" onClick={() => nexusBridge.triggerRollback()} />
            </GlassCard>
          </div>
        )}
      </div>
    </main>
  );
}
INNER_EOF
