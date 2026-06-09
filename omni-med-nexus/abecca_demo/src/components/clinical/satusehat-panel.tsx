"use client";

import { useCallback, useEffect, useState } from "react";
import { Share2 } from "lucide-react";
import type { Submission } from "@/server/satusehat/submissions";
import { formatDate } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Can } from "@/components/auth/can";

export function SatusehatPanel({ encounterId }: { encounterId: string }) {
  const [subs, setSubs] = useState<Submission[]>([]);
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    const res = await fetch(`/api/encounters/${encounterId}/satusehat`);
    if (res.ok) setSubs(await res.json());
  }, [encounterId]);

  useEffect(() => {
    // Async load; state set after await (false positive for the rule).
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void load();
  }, [load]);

  const sync = async () => {
    setBusy(true);
    const res = await fetch(`/api/encounters/${encounterId}/satusehat`, { method: "POST" });
    if (res.ok) await load();
    setBusy(false);
  };

  return (
    <div className="space-y-2 border-t border-border pt-3">
      <div className="flex items-center justify-between gap-2">
        <span className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
          <Share2 className="size-3.5" /> SATUSEHAT (FHIR)
        </span>
        <Can permission="encounter:write">
          <Button size="sm" variant="outline" onClick={sync} disabled={busy}>
            Kirim ke SATUSEHAT
          </Button>
        </Can>
      </div>
      {subs.length === 0 ? (
        <p className="text-xs text-muted-foreground">Belum dikirim ke SATUSEHAT.</p>
      ) : (
        <ul className="flex flex-col gap-1">
          {subs.map((s) => (
            <li key={s.id} className="flex flex-wrap items-center gap-2 text-sm">
              <Badge variant="info">{s.resourceType}</Badge>
              {s.fhirId && <span className="font-mono text-xs text-muted-foreground">{s.fhirId}</span>}
              {s.isMock && <Badge variant="muted">mock</Badge>}
              <Badge variant={s.status === "sent" ? "success" : "danger"}>{s.status}</Badge>
              <span className="ml-auto text-[11px] text-muted-foreground">{formatDate(s.createdAt)}</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
