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

  // Power/Network Simulation
  const [batteryMode, setBatteryMode] = useState("Normal");

  useEffect(() => {
    nexusBridge.connect();
    setTimeout(() => setShowOnboarding(true), 1000);
    // Simulate battery dropping over time
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
            <ClinicalButton label="Login Exec (CFO)" onClick={() => login('EXEC')} variant="success" />
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
            <p className="text-white mb-6">Let's take a 30-second tour of how to use the AI Triage safely.</p>
            <ClinicalButton label="Start Guided Tour" onClick={() => setShowOnboarding(false)} />
          </GlassCard>
        </div>
      )}

      {/* Break The Glass VIP Overlay */}
      {showVIPBreakGlass && (
        <div className="absolute inset-0 bg-red-900/80 z-50 flex items-center justify-center">
          <GlassCard className="max-w-lg border-pulse-alertRed">
            <h2 className="text-2xl font-bold text-pulse-alertRed mb-4">RESTRICTED RECORD (VIP)</h2>
            <p className="text-white mb-6">Accessing this record requires the 'Break-the-Glass' protocol. Your action will be audited and the hospital director will be notified.</p>
            <input type="text" placeholder="Enter Justification..." className="w-full p-2 mb-4 bg-black text-white" />
            <div className="flex gap-4">
              <ClinicalButton label="CANCEL" onClick={() => setShowVIPBreakGlass(false)} />
              <ClinicalButton label="BREAK GLASS" variant="alert" onClick={() => { alert("Audited!"); setShowVIPBreakGlass(false); }} />
            </div>
          </GlassCard>
        </div>
      )}

      {/* Human-In-The-Loop Approval Overlay */}
      {scribeApproval && (
        <div className="absolute inset-0 bg-black/60 z-50 flex items-center justify-center">
          <GlassCard className="max-w-lg bg-pulse-deepBlueStart/90 border-pulse-alertYellow">
            <h2 className="text-2xl font-bold text-pulse-alertYellow mb-4">AI Verification Required</h2>
            <p className="text-white mb-2">Ghost Scribe transcribed:</p>
            <textarea defaultValue={scribeApproval} className="w-full p-2 mb-4 bg-black text-white h-32"></textarea>
            <div className="flex gap-4">
              <ClinicalButton label="Edit & Approve" variant="success" onClick={() => { alert("Saved!"); setScribeApproval(null); }} />
              <ClinicalButton label="Discard" variant="alert" onClick={() => setScribeApproval(null)} />
            </div>
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
        <div className="w-full flex justify-between mb-4 p-2 bg-black/40 rounded">
           <span className="text-gray-400">Sync: <span className="text-pulse-alertYellow">{batteryMode}</span></span>
           <span className="text-gray-400">Hardware: <span className={hardwareStatus === 'CONNECTED' ? 'text-pulse-alertGreen' : 'text-pulse-alertRed'}>{hardwareStatus}</span></span>
        </div>

        {userRole === 'ER' && (
          <div className="space-y-6">
            <h2 className="text-3xl font-bold text-pulse-mintEnd">ER Triage Workspace (Sp.EM)</h2>
            <div className="flex gap-4">
               <ClinicalButton label="Open Patient A (Normal)" onClick={() => {}} />
               <ClinicalButton label="Open Patient VIP" variant="alert" onClick={() => setShowVIPBreakGlass(true)} />
               <ClinicalButton label="Start Ghost Scribe AI" onClick={() => setScribeApproval("Give Patient 15mg of Aspirin")} />
               <ClinicalButton label="Queue BPJS Claim Async" variant="success" onClick={() => alert("Claim queued. Patient can go home.")} />
               <ClinicalButton label="Print Thermal Bracelet" onClick={() => alert("Spooled silently to printer.")} />
            </div>
          </div>
        )}

        {userRole === 'EXEC' && (
          <div className="space-y-6">
            <h2 className="text-3xl font-bold text-pulse-mintEnd">Command Center</h2>
            <GlassCard className="w-full">
              <h3 className="text-xl font-semibold mb-4 text-pulse-alertGreen">Data Escrow / Exit Strategy</h3>
              <p className="text-gray-300 mb-4">Export all your legacy data securely to standardized JSON/CSV. We do not hold your data hostage.</p>
              <ClinicalButton label="1-Click Data Escrow" variant="success" onClick={() => alert("Exporting 1.2M records...")} />
            </GlassCard>
            <GlassCard className="w-full">
              <h3 className="text-xl font-semibold mb-4 text-pulse-alertRed">Disaster Recovery Protocol</h3>
              <ClinicalButton label="Initiate 1-Click Rollback" variant="alert" onClick={() => nexusBridge.triggerRollback()} />
            </GlassCard>
          </div>
        )}
      </div>

      {/* 24/7 SLA Ticketing SOS Widget */}
      <div className="fixed bottom-8 right-8">
        <button className="bg-pulse-alertRed hover:bg-red-700 text-white rounded-full p-4 shadow-lg shadow-red-500/50 flex items-center justify-center">
          <span className="font-bold">SOS Helpdesk</span>
        </button>
      </div>
    </main>
  );
}
INNER_EOF
