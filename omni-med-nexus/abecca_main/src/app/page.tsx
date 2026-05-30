"use client";

import { useState, useEffect } from "react";

export default function AbeccaMainHome() {
  const [bootSequence, setBootSequence] = useState(0);

  useEffect(() => {
    const timer = setInterval(() => {
      setBootSequence((prev) => (prev < 4 ? prev + 1 : prev));
    }, 1200);
    return () => clearInterval(timer);
  }, []);

  return (
    <main className="min-h-screen bg-black text-emerald-500 font-mono flex flex-col items-center justify-center overflow-hidden">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,_var(--tw-gradient-stops))] from-emerald-900/20 via-black to-black z-0"></div>

      <div className="z-10 w-full max-w-4xl p-8 flex flex-col items-center">
        <div className="mb-12 flex flex-col items-center">
          <div className="relative">
            <div className="w-24 h-24 text-emerald-400 opacity-80 border-4 border-emerald-400 rounded-full flex items-center justify-center text-3xl font-bold">A</div>
            <div className="absolute inset-0 border-2 border-emerald-500/30 rounded-full border-t-emerald-400 animate-spin" />
          </div>
          <h1 className="mt-8 text-5xl font-bold tracking-widest text-transparent bg-clip-text bg-gradient-to-r from-emerald-400 to-cyan-500">
            ABECCA
          </h1>
          <p className="mt-2 text-emerald-600/80 tracking-[0.3em] text-sm uppercase">
            The Intelligent Pulse of Healthcare
          </p>
        </div>

        <div className="w-full max-w-md space-y-4">
          {bootSequence >= 1 && (
            <div className="flex items-center space-x-4 bg-emerald-950/30 p-4 border border-emerald-900/50 rounded animate-fade-in-up">
              <span className="text-sm">Initializing Pure Web Architecture...</span>
              <span className="ml-auto text-xs text-emerald-600">OK</span>
            </div>
          )}

          {bootSequence >= 2 && (
            <div className="flex items-center space-x-4 bg-emerald-950/30 p-4 border border-emerald-900/50 rounded animate-fade-in-up">
              <span className="text-sm">Mounting Secure Cloud Persistence...</span>
              <span className="ml-auto text-xs text-emerald-600">OK</span>
            </div>
          )}

          {bootSequence >= 3 && (
            <div className="flex items-center space-x-4 bg-emerald-950/30 p-4 border border-emerald-900/50 rounded animate-fade-in-up">
              <span className="text-sm">Engaging Distributed AI Nodes...</span>
              <span className="ml-auto text-xs text-emerald-600">OK</span>
            </div>
          )}

          {bootSequence >= 4 && (
            <div className="mt-12 flex justify-center w-full animate-fade-in">
              <button className="group relative px-8 py-3 bg-transparent overflow-hidden rounded border border-emerald-500/50 hover:border-emerald-400 transition-colors">
                <div className="absolute inset-0 bg-emerald-500/10 group-hover:bg-emerald-500/20 transition-colors" />
                <span className="relative flex items-center space-x-2 text-emerald-400 tracking-wider text-sm font-semibold">
                  <span>ENTER CLOUD SYSTEM</span>
                </span>
              </button>
            </div>
          )}
        </div>
      </div>
    </main>
  );
}
