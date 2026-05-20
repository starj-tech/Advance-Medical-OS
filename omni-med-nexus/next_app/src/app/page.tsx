"use client";

import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { invoke } from "@tauri-apps/api/core";

export default function NexusOS() {
  const [role, setRole] = useState<"doctor" | "executive" | null>(null);
  const [onboardingStep, setOnboardingStep] = useState(0);
  const [hasCompletedOnboarding, setHasCompletedOnboarding] = useState(false);
  const [blockchainHash, setBlockchainHash] = useState<string>("No blocks generated");

  useEffect(() => {
    // Check if user already saw onboarding
    if (typeof window !== "undefined") {
      const stored = localStorage.getItem("nexus_onboarding_done");
      if (stored === "true") {
        setTimeout(() => setHasCompletedOnboarding(true), 0);
      }
    }
  }, []);

  const handleLogin = (selectedRole: "doctor" | "executive") => {
    setRole(selectedRole);
    if (!hasCompletedOnboarding) {
      setOnboardingStep(1);
    }
  };

  const skipOnboarding = () => {
    setOnboardingStep(0);
    setTimeout(() => setHasCompletedOnboarding(true), 0);
    localStorage.setItem("nexus_onboarding_done", "true");
  };

  const nextStep = () => {
    if (onboardingStep >= 3) {
      skipOnboarding();
    } else {
      setOnboardingStep(onboardingStep + 1);
    }
  };

  const triggerBlockchain = async () => {
    try {
      const hash = await invoke<string>("add_audit_record", {
        patientId: "PAT-00X",
        action: "TEST_INTERACTION",
        doctorId: role === "doctor" ? "DR-XYZ" : "EXEC-ABC"
      });
      setBlockchainHash(hash);
    } catch (e) {
      console.error(e);
    }
  };

  if (!role) {
    return (
      <div className="min-h-screen bg-[#2B2D42] flex items-center justify-center p-4 relative overflow-hidden">
        {/* Simple Butterfly organic accent background */}
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-[#2E8B57] rounded-full mix-blend-multiply filter blur-3xl opacity-20 animate-pulse"></div>
        <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-[#92DCE5] rounded-full mix-blend-multiply filter blur-3xl opacity-20 animate-pulse"></div>

        <div className="bg-white p-12 rounded-2xl shadow-2xl z-10 text-center max-w-md w-full">
          <div className="w-20 h-20 bg-[#0080C8] rounded-full mx-auto mb-6 flex items-center justify-center shadow-lg">
            <span className="text-white font-bold text-xl">NX</span>
          </div>
          <h1 className="text-2xl font-bold text-[#2B2D42] mb-2">Omni-Med Nexus OS</h1>
          <p className="text-gray-500 mb-8">Select simulation role</p>

          <button
            onClick={() => handleLogin("doctor")}
            className="w-full mb-4 py-3 bg-[#0080C8] text-white font-semibold rounded-xl hover:bg-blue-700 transition shadow-md"
          >
            Clinical Cockpit (Doctor)
          </button>
          <button
            onClick={() => handleLogin("executive")}
            className="w-full py-3 bg-white text-[#2B2D42] border-2 border-[#2B2D42] font-semibold rounded-xl hover:bg-gray-50 transition shadow-sm"
          >
            Executive Command (Director)
          </button>
        </div>
      </div>
    );
  }

  // Determine which steps apply
  const isDoctor = role === "doctor";

  return (
    <div className="min-h-screen bg-[#F8F7F9] flex flex-col relative text-[#2B2D42]">
      {/* App Bar */}
      <header className="bg-white px-8 py-4 flex justify-between items-center shadow-sm z-20 relative">
        <h1 className="text-xl font-bold text-[#0080C8]">Nexus OS : {isDoctor ? 'Clinical' : 'Executive'}</h1>
        <div className="flex gap-4">
          <span className="px-3 py-1 bg-green-100 text-green-700 rounded-full text-xs font-bold self-center">
            Secured: AES-256
          </span>
          <button onClick={() => setRole(null)} className="text-gray-500 hover:text-black">Logout</button>
        </div>
      </header>

      {/* Main Content Dashboard */}
      <main className="flex-1 p-8 grid grid-cols-3 gap-8 relative z-10">
        {/* Step 1 Element */}
        <div className={`col-span-1 rounded-xl p-6 bg-white shadow-sm border border-gray-100 transition-all ${onboardingStep === 1 ? 'z-50 relative ring-4 ring-[#92DCE5]' : ''}`}>
          <h2 className="font-bold text-lg mb-4">{isDoctor ? "Ghost Scribe AI" : "Revenue Guard"}</h2>
          <div className="h-40 bg-gray-50 rounded-lg flex items-center justify-center cursor-pointer hover:bg-gray-100 transition" onClick={onboardingStep === 1 ? nextStep : triggerBlockchain}>
            {isDoctor ? (
              <div className="text-center">
                <div className="w-16 h-16 bg-[#2E8B57] text-white rounded-full mx-auto flex items-center justify-center mb-2 shadow-lg hover:scale-105 transform transition">🎤</div>
                <p className="text-sm text-gray-500">Tap to dictate diagnosis</p>
              </div>
            ) : (
              <div className="text-center">
                <h3 className="text-3xl font-bold text-red-500">Rp 12.5M</h3>
                <p className="text-sm text-gray-500">Losses Prevented Today</p>
                <p className="text-xs text-blue-500 mt-2 font-bold cursor-pointer">View Audit ➔</p>
              </div>
            )}
          </div>
        </div>

        {/* Step 2 Element */}
        <div className={`col-span-1 rounded-xl p-6 bg-white shadow-sm border border-gray-100 transition-all ${onboardingStep === 2 ? 'z-50 relative ring-4 ring-[#92DCE5]' : ''}`}>
          <h2 className="font-bold text-lg mb-4">{isDoctor ? "Early Warning Bio-Timeline" : "Digital Twin Simulation"}</h2>
          <div className="h-40 bg-gray-50 rounded-lg flex items-end p-4 cursor-pointer hover:bg-gray-100 transition" onClick={onboardingStep === 2 ? nextStep : triggerBlockchain}>
            {/* Fake Chart bars */}
            <div className="w-full flex items-end justify-between gap-2 h-full opacity-60">
              <div className="w-full bg-[#92DCE5] h-1/4 rounded-t-md"></div>
              <div className="w-full bg-[#0080C8] h-2/4 rounded-t-md"></div>
              <div className="w-full bg-orange-400 h-3/4 rounded-t-md relative">
                 {onboardingStep === 2 && <span className="absolute -top-6 left-1/2 -translate-x-1/2 text-orange-500 font-bold text-xl animate-bounce">!</span>}
              </div>
              <div className="w-full bg-[#2E8B57] h-1/2 rounded-t-md"></div>
            </div>
          </div>
        </div>

        {/* Step 3 Element */}
        <div className={`col-span-1 rounded-xl p-6 bg-white shadow-sm border border-gray-100 transition-all ${onboardingStep === 3 ? 'z-50 relative ring-4 ring-[#92DCE5]' : ''}`}>
          <h2 className="font-bold text-lg mb-4">{isDoctor ? "Pharmacy Cross-Check" : "Resource Mesh"}</h2>
          <div className="h-40 bg-gray-50 rounded-lg flex items-center justify-center p-4 cursor-pointer hover:bg-gray-100 transition" onClick={onboardingStep === 3 ? nextStep : triggerBlockchain}>
            <div className="w-full space-y-3">
              <div className="h-8 bg-green-100 rounded border border-green-200 flex items-center px-3"><span className="text-xs font-bold text-green-700">✓ Approved: Paracetamol</span></div>
              <div className="h-8 bg-red-100 rounded border border-red-200 flex items-center px-3"><span className="text-xs font-bold text-red-700">✗ Blocked: Severe Interaction</span></div>
            </div>
          </div>
        </div>
      </main>

      {/* Footer / Blockchain Log (Technical Transparency) */}
      <footer className="bg-[#2B2D42] text-gray-400 text-xs p-2 text-center flex justify-between px-8 relative z-10">
        <span>Tauri Rust IPC Backend Link Active</span>
        <span className="font-mono text-cyan-400 max-w-lg truncate">Latest Hash: {blockchainHash}</span>
      </footer>

      {/* GUIDED IMMERSION OVERLAY */}
      <AnimatePresence>
        {onboardingStep > 0 && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-40 bg-black/40 backdrop-blur-md flex items-center justify-center pointer-events-none"
          >
            {/* Tooltip Card relative to screen center for simplicity, points to nothing specifically but hovers */}
            <motion.div
              key={onboardingStep}
              initial={{ y: 20, opacity: 0, scale: 0.95 }}
              animate={{ y: 0, opacity: 1, scale: 1 }}
              exit={{ y: -20, opacity: 0, scale: 0.95 }}
              className="bg-white/90 backdrop-blur-xl p-6 rounded-2xl shadow-2xl max-w-md border border-white/50 pointer-events-auto"
            >
              <p className="text-lg font-medium text-[#2B2D42] mb-6">
                {isDoctor && onboardingStep === 1 && "Berhenti mengetik. Tekan mikrofon, bicarakan keluhan pasien, dan biarkan NCE menyusun rekam medis internasional secara otomatis."}
                {isDoctor && onboardingStep === 2 && "Jangan cari data lama. AI menarik korelasi lab dari 5 tahun terakhir. Perhatikan indikator untuk risiko perburukan."}
                {isDoctor && onboardingStep === 3 && "Resep instan dengan perlindungan ganda. Sistem akan menolak resep otomatis jika ada interaksi obat berbahaya."}

                {!isDoctor && onboardingStep === 1 && "Uang Anda tidak akan bocor lagi. NCE real-time mencocokkan obat keluar dengan billing pasien. Klik untuk audit."}
                {!isDoctor && onboardingStep === 2 && "Jangan tebak anggaran. Gunakan Digital Twin untuk simulasi dampak penambahan 10 bed ICU terhadap arus kas bulan depan."}
                {!isDoctor && onboardingStep === 3 && "Anda memegang kendali. Pindahkan stok alkes antar cabang yang kelebihan muatan hanya dengan satu klik."}
              </p>

              <div className="flex justify-between items-center mt-4">
                <button onClick={skipOnboarding} className="text-sm font-semibold text-gray-400 hover:text-gray-700">Lewati Panduan</button>
                <button onClick={nextStep} className="px-6 py-2 bg-[#0080C8] text-white rounded-full font-bold shadow-md hover:bg-blue-700 transition">
                  {onboardingStep === 3 ? "Selesai" : "Saya Mengerti"}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
