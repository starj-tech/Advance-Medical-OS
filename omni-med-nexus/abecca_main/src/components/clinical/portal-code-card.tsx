"use client";

import { useCallback, useEffect, useState } from "react";
import { KeyRound } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Can } from "@/components/auth/can";

/**
 * Staff control to grant a patient access to the self-service portal: issues a
 * one-time-display access code the patient uses (with Company ID + No. RM) to
 * sign in at /portal. The code's hash is stored server-side; this is the only
 * moment the plaintext is shown, so it must be handed to the patient now.
 */
export function PortalCodeCard({ patientId }: { patientId: string }) {
  const [issued, setIssued] = useState<boolean | null>(null);
  const [code, setCode] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const loadStatus = useCallback(async () => {
    const res = await fetch(`/api/patients/${patientId}/portal-code`);
    if (res.ok) setIssued((await res.json()).issued);
  }, [patientId]);
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void loadStatus();
  }, [loadStatus]);

  const issue = async () => {
    setBusy(true);
    const res = await fetch(`/api/patients/${patientId}/portal-code`, { method: "POST" });
    setBusy(false);
    if (res.ok) {
      setCode((await res.json()).code);
      setIssued(true);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <KeyRound className="size-4 text-primary" /> Portal Pasien
        </CardTitle>
        {issued !== null && (
          <Badge variant={issued ? "success" : "muted"}>{issued ? "Aktif" : "Belum aktif"}</Badge>
        )}
      </CardHeader>
      <CardContent className="flex flex-col gap-3">
        <p className="text-xs text-muted-foreground">
          Beri pasien akses mandiri ke janji temu, hasil tervalidasi, dan tagihan di{" "}
          <span className="font-mono text-foreground">/portal</span>.
        </p>
        {code && (
          <div className="rounded-lg border border-primary/30 bg-primary/5 px-3 py-2.5">
            <p className="text-[11px] text-muted-foreground">Kode akses (tampil sekali)</p>
            <p className="mt-0.5 font-mono text-lg font-semibold tracking-widest text-primary">{code}</p>
            <p className="mt-1 text-[11px] text-muted-foreground">
              Serahkan kode ini ke pasien sekarang — tidak dapat ditampilkan ulang.
            </p>
          </div>
        )}
        <Can permission="registration:write">
          <Button size="sm" variant={issued ? "outline" : "primary"} onClick={issue} disabled={busy}>
            <KeyRound className="size-4" />
            {issued ? "Terbitkan ulang kode" : "Terbitkan kode akses"}
          </Button>
        </Can>
      </CardContent>
    </Card>
  );
}
