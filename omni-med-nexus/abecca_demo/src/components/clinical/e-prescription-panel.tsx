"use client";

import { useCallback, useEffect, useState } from "react";
import { FileText, Send } from "lucide-react";
import type { EPrescription, EPrescriptionStatus } from "@/server/clinical/e-prescriptions";
import { formatDate } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Can } from "@/components/auth/can";

const inputCls =
  "h-9 w-full rounded-lg border border-border bg-background px-3 text-sm outline-none transition-colors focus:border-primary focus:ring-2 focus:ring-primary/30";

const STATUS_LABEL: Record<EPrescriptionStatus, string> = {
  issued: "Diterbitkan", dispensed: "Diserahkan", cancelled: "Batal",
};
const STATUS_VARIANT: Record<EPrescriptionStatus, "info" | "success" | "danger"> = {
  issued: "info", dispensed: "success", cancelled: "danger",
};

export function EPrescriptionPanel({ encounterId, active }: { encounterId: string; active: boolean }) {
  const [scripts, setScripts] = useState<EPrescription[]>([]);
  const [pharmacy, setPharmacy] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    const res = await fetch(`/api/encounters/${encounterId}/e-prescriptions`);
    if (res.ok) setScripts(await res.json());
  }, [encounterId]);
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void load();
  }, [load]);

  const issue = async () => {
    setSaving(true);
    setError(null);
    const res = await fetch(`/api/encounters/${encounterId}/e-prescriptions`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ pharmacy: pharmacy.trim() || null }),
    });
    setSaving(false);
    if (res.ok) {
      setPharmacy("");
      await load();
    } else {
      const data = await res.json().catch(() => ({}));
      setError(data?.error === "no active medication orders to prescribe"
        ? "Tidak ada order obat aktif untuk diresepkan."
        : "Gagal menerbitkan e-resep.");
    }
  };

  const advance = async (prescriptionId: string, status: EPrescriptionStatus) => {
    const res = await fetch(`/api/encounters/${encounterId}/e-prescriptions`, {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ prescriptionId, status }),
    });
    if (res.ok) await load();
  };

  return (
    <div className="space-y-2 border-t border-border pt-3">
      <span className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
        <FileText className="size-3.5" /> e-Resep (Apotek Luar)
      </span>
      {scripts.length === 0 ? (
        <p className="text-xs text-muted-foreground">Belum ada e-resep diterbitkan.</p>
      ) : (
        <ul className="flex flex-col gap-2">
          {scripts.map((p) => (
            <li key={p.id} className="rounded-lg border border-border bg-background px-3 py-2 text-sm">
              <div className="mb-1 flex flex-wrap items-center gap-2">
                <span className="font-mono text-xs font-semibold text-primary">{p.code}</span>
                <Badge variant={STATUS_VARIANT[p.status]}>{STATUS_LABEL[p.status]}</Badge>
                <span className="ml-auto text-xs text-muted-foreground">{formatDate(p.createdAt)}</span>
              </div>
              {p.pharmacy && (
                <p className="text-xs text-muted-foreground">Apotek: {p.pharmacy}</p>
              )}
              <ul className="mt-1 list-disc pl-4 text-xs">
                {p.items.map((it, i) => (
                  <li key={i}>
                    {it.drugName}
                    {it.dose ? ` · ${it.dose}` : ""}
                    {it.frequency ? ` · ${it.frequency}` : ""}
                    {it.route ? ` · ${it.route}` : ""}
                  </li>
                ))}
              </ul>
              {active && p.status === "issued" && (
                <Can permission="medication:order">
                  <span className="mt-1.5 flex gap-1.5">
                    <Button size="sm" variant="outline" onClick={() => advance(p.id, "dispensed")}>
                      Tandai diserahkan
                    </Button>
                    <Button size="sm" variant="ghost" onClick={() => advance(p.id, "cancelled")}>
                      Batalkan
                    </Button>
                  </span>
                </Can>
              )}
            </li>
          ))}
        </ul>
      )}

      {active && (
        <Can permission="medication:order">
          <div className="space-y-2">
            <input className={inputCls} value={pharmacy}
              onChange={(e) => setPharmacy(e.target.value)}
              placeholder="Apotek tujuan (opsional)" aria-label="Apotek tujuan" />
            {error && <p className="text-xs text-danger">{error}</p>}
            <Button size="sm" onClick={issue} disabled={saving}>
              <Send className="size-4" /> Terbitkan e-Resep (dari order aktif)
            </Button>
          </div>
        </Can>
      )}
    </div>
  );
}
