"use client";

import { useState } from "react";
import { Activity, Droplets, Syringe } from "lucide-react";
import { cn } from "@/lib/utils";
import { IcuTab } from "./icu-tab";
import { HdTab } from "./hd-tab";
import { ChemoTab } from "./chemo-tab";

type Tab = "icu" | "hd" | "chemo";

const TABS: { key: Tab; label: string; icon: typeof Activity }[] = [
  { key: "icu", label: "ICU / HCU", icon: Activity },
  { key: "hd", label: "Hemodialisa", icon: Droplets },
  { key: "chemo", label: "Onkologi", icon: Syringe },
];

export function SpecialCareView() {
  const [tab, setTab] = useState<Tab>("icu");

  return (
    <div className="flex flex-col gap-6 animate-fade-in">
      <div>
        <h1 className="text-xl font-semibold tracking-tight">Unit Khusus</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          ICU/HCU dengan skor keparahan APACHE II, jadwal mesin hemodialisa per shift,
          dan kursus kemoterapi onkologi dengan pelacakan siklus.
        </p>
      </div>

      <div className="flex w-fit items-center gap-1 rounded-xl border border-border bg-surface p-1">
        {TABS.map(({ key, label, icon: Icon }) => (
          <button
            key={key}
            type="button"
            onClick={() => setTab(key)}
            aria-pressed={tab === key}
            className={cn(
              "flex items-center gap-2 rounded-lg px-3 py-1.5 text-sm font-medium transition-colors",
              tab === key
                ? "bg-primary/10 text-primary"
                : "text-muted-foreground hover:bg-foreground/5 hover:text-foreground",
            )}
          >
            <Icon className="size-4" /> {label}
          </button>
        ))}
      </div>

      {tab === "icu" && <IcuTab />}
      {tab === "hd" && <HdTab />}
      {tab === "chemo" && <ChemoTab />}
    </div>
  );
}
