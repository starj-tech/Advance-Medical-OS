'use client';
import { useEffect } from 'react';
import { useHospitalStore } from '@/store';
import { nexusBridge } from '@/lib/nexusBridge';
import { GlassCard } from '@/components/GlassCard';
import { ClinicalButton } from '@/components/ClinicalButton';

export default function Home() {
  const { userRole, login, hardwareData, ewsAlerts } = useHospitalStore();

  useEffect(() => {
    // Connect to hardware bridge when the app loads
    nexusBridge.connect();
    return () => nexusBridge.disconnect();
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
          <div className="mt-12 p-4 border border-pulse-purpleEnd rounded-xl bg-black/20">
            <h3 className="text-lg font-semibold text-pulse-alertYellow">Hardware Integration Required?</h3>
            <p className="text-sm text-gray-400 mb-4">Download the local daemon to enable EKG, Thermal Printing, and Native Hardware support.</p>
            <ClinicalButton label="Download Tauri Daemon (Windows/Mac/Linux)" onClick={() => alert('Downloading Omni-Med Daemon...')} variant="alert" />
          </div>
        </GlassCard>
      </main>
    );
  }

  // Dashboard Router
  return (
    <main className="min-h-screen p-8 bg-desktop-gradient flex">
      {/* Side Navigation Rail */}
      <div className="w-20 flex flex-col items-center bg-black/30 rounded-full py-8 space-y-8 mr-8">
        <div className="w-12 h-12 bg-pulse-mintStart rounded-full"></div>
        <div className="w-12 h-12 bg-white/10 rounded-full"></div>
        <div className="w-12 h-12 bg-white/10 rounded-full"></div>
        <div className="flex-1"></div>
        <button onClick={() => useHospitalStore.getState().logout()} className="w-12 h-12 bg-pulse-alertRed rounded-full text-white text-xs">Exit</button>
      </div>

      {/* Main Content Area */}
      <div className="flex-1">
        {userRole === 'ER' && (
          <div className="space-y-6">
            <h2 className="text-3xl font-bold text-pulse-mintEnd">ER Triage Workspace (Sp.EM)</h2>
            <div className="flex gap-6">
              <GlassCard className="flex-1">
                <h3 className="text-xl font-semibold mb-4 text-pulse-alertYellow">Hardware Telemetry Stream</h3>
                {hardwareData ? (
                  <div className="text-3xl font-mono text-pulse-alertGreen">
                    HR: {hardwareData.heart_rate} | SpO2: {hardwareData.spo2}%
                  </div>
                ) : (
                  <p className="text-gray-400 animate-pulse">Waiting for Nexus Bridge connection...</p>
                )}
              </GlassCard>
              <GlassCard className="flex-1 border-pulse-alertRed bg-pulse-alertRed/10">
                <h3 className="text-xl font-semibold mb-4 text-white">EWS Alerts (NCE)</h3>
                {ewsAlerts.length > 0 ? ewsAlerts.map((alert, i) => (
                  <p key={i} className="text-red-300 font-bold">• {alert}</p>
                )) : <p className="text-green-400">All stable.</p>}
              </GlassCard>
            </div>
          </div>
        )}

        {userRole === 'EXEC' && (
          <div className="space-y-6">
            <h2 className="text-3xl font-bold text-pulse-mintEnd">Command Center</h2>
            <GlassCard className="w-full">
              <h3 className="text-xl font-semibold mb-4">Revenue Guard AI</h3>
              <p className="text-4xl text-pulse-alertGreen font-bold">$45,200 <span className="text-lg text-gray-400 font-normal">YTD Leakage Prevented</span></p>
            </GlassCard>
          </div>
        )}
      </div>
    </main>
  );
}
