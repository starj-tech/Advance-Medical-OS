"use client";

import { Hash, Link2, ShieldCheck, TriangleAlert } from "lucide-react";
import type { AuditAction } from "@/lib/types";
import { useAuditChain, useChainValid } from "@/lib/store";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { StatCard } from "@/components/ui/stat-card";
import { cn, formatDateTime, shortHash } from "@/lib/utils";

const actionVariant: Record<
  AuditAction,
  "default" | "info" | "success" | "warning" | "danger"
> = {
  SYSTEM_INIT: "default",
  VIEW_RECORD: "info",
  UPDATE_DIAGNOSIS: "warning",
  UPDATE_EWS: "warning",
  ADMIT_PATIENT: "success",
  DISCHARGE_PATIENT: "info",
  DISPENSE_MEDICATION: "success",
};

export function AuditView() {
  const chain = useAuditChain();
  const valid = useChainValid();
  const ordered = [...chain].reverse(); // newest first

  return (
    <div className="flex flex-col gap-6 animate-fade-in">
      <p className="text-sm text-muted-foreground">
        Tamper-evident ledger. Each block is hashed with SHA-256 over its
        contents and the previous block&apos;s hash, exactly as the Rust core
        engine builds it. New clinical actions append here live.
      </p>

      {/* Integrity banner */}
      <div
        className={cn(
          "flex items-center gap-3 rounded-xl border px-5 py-4",
          valid
            ? "border-emerald-500/20 bg-emerald-50 dark:bg-emerald-950/30"
            : "border-rose-500/20 bg-rose-50 dark:bg-rose-950/30",
        )}
      >
        <span
          className={cn(
            "grid size-10 shrink-0 place-items-center rounded-lg",
            valid
              ? "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400"
              : "bg-rose-500/15 text-rose-600 dark:text-rose-400",
          )}
        >
          {valid ? (
            <ShieldCheck className="size-5" />
          ) : (
            <TriangleAlert className="size-5" />
          )}
        </span>
        <div>
          <p className="text-sm font-semibold">
            {valid ? "Chain integrity verified" : "Chain integrity broken"}
          </p>
          <p className="text-xs text-muted-foreground">
            {valid
              ? `All ${chain.length} blocks link correctly back to genesis.`
              : "A block hash does not match its successor's previous-hash."}
          </p>
        </div>
        <Badge variant={valid ? "success" : "danger"} className="ml-auto">
          is_chain_valid() → {String(valid)}
        </Badge>
      </div>

      <section className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <StatCard label="Total Blocks" value={chain.length} icon={Hash} />
        <StatCard label="Genesis" value="SYSTEM_INIT" icon={Link2} hint="Block #0" />
        <StatCard
          label="Status"
          value={valid ? "Valid" : "Invalid"}
          icon={ShieldCheck}
          tone={valid ? "success" : "danger"}
        />
      </section>

      {/* Ledger */}
      <Card>
        <CardContent className="p-0">
          <ol className="relative">
            {ordered.map((b, i) => {
              const isGenesis = b.index === 0;
              return (
                <li
                  key={b.hash}
                  className="relative flex gap-4 px-5 py-4 [&:not(:last-child)]:border-b [&:not(:last-child)]:border-border"
                >
                  <div className="flex flex-col items-center">
                    <span
                      className={cn(
                        "grid size-9 shrink-0 place-items-center rounded-lg",
                        isGenesis
                          ? "bg-foreground/10 text-foreground"
                          : "bg-primary/10 text-primary",
                      )}
                    >
                      {isGenesis ? (
                        <Hash className="size-4" />
                      ) : (
                        <Link2 className="size-4" />
                      )}
                    </span>
                    {i < ordered.length - 1 && (
                      <span className="mt-1 w-px flex-1 bg-border" />
                    )}
                  </div>

                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-mono text-xs font-semibold text-muted-foreground">
                        #{b.index}
                      </span>
                      <Badge variant={actionVariant[b.action]}>
                        {b.action.replaceAll("_", " ")}
                      </Badge>
                      {!isGenesis && (
                        <span className="text-xs text-muted-foreground">
                          {b.patientId} · {b.doctorId}
                        </span>
                      )}
                      <span className="ml-auto text-xs text-muted-foreground">
                        {formatDateTime(new Date(b.timestamp * 1000).toISOString())}
                      </span>
                    </div>

                    <dl className="mt-2 grid grid-cols-1 gap-1 sm:grid-cols-2">
                      <div className="flex items-center gap-2 overflow-hidden">
                        <dt className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
                          Hash
                        </dt>
                        <dd className="truncate font-mono text-xs">
                          {shortHash(b.hash)}
                        </dd>
                      </div>
                      <div className="flex items-center gap-2 overflow-hidden">
                        <dt className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
                          Prev
                        </dt>
                        <dd className="truncate font-mono text-xs text-muted-foreground">
                          {b.previousHash === "0" ? "—" : shortHash(b.previousHash)}
                        </dd>
                      </div>
                    </dl>
                  </div>
                </li>
              );
            })}
          </ol>
        </CardContent>
      </Card>
    </div>
  );
}
