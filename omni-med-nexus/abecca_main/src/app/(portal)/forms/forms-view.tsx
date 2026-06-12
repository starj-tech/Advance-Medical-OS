"use client";

import { useState } from "react";
import { FilePlus2, ListChecks } from "lucide-react";
import { cn } from "@/lib/utils";
import { Can } from "@/components/auth/can";
import { FormDesigner } from "./form-designer";
import { FormFiller } from "./form-filler";

type Tab = "fill" | "design";

export function FormsView() {
  const [tab, setTab] = useState<Tab>("fill");

  return (
    <div className="flex flex-col gap-6 animate-fade-in">
      <div>
        <h1 className="text-xl font-semibold tracking-tight">Form Dinamis (Form Builder)</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Rancang sendiri form pengkajian, skrining, atau checklist khas rumah sakit Anda tanpa
          koding — lalu isi untuk pasien. Validasi sisi-server mengikuti definisi form.
        </p>
      </div>

      <div className="flex w-fit items-center gap-1 rounded-xl border border-border bg-surface p-1">
        <button
          type="button"
          onClick={() => setTab("fill")}
          aria-pressed={tab === "fill"}
          className={cn(
            "flex items-center gap-2 rounded-lg px-3 py-1.5 text-sm font-medium transition-colors",
            tab === "fill"
              ? "bg-primary/10 text-primary"
              : "text-muted-foreground hover:bg-foreground/5 hover:text-foreground",
          )}
        >
          <ListChecks className="size-4" /> Isi &amp; Riwayat
        </button>
        <Can permission="form:manage">
          <button
            type="button"
            onClick={() => setTab("design")}
            aria-pressed={tab === "design"}
            className={cn(
              "flex items-center gap-2 rounded-lg px-3 py-1.5 text-sm font-medium transition-colors",
              tab === "design"
                ? "bg-primary/10 text-primary"
                : "text-muted-foreground hover:bg-foreground/5 hover:text-foreground",
            )}
          >
            <FilePlus2 className="size-4" /> Desain
          </button>
        </Can>
      </div>

      {tab === "fill" ? <FormFiller /> : <FormDesigner />}
    </div>
  );
}
