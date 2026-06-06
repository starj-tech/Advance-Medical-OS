"use client";

import { useState } from "react";
import { FileText, MessageSquare, Sparkles, Stethoscope, Tags } from "lucide-react";
import type { Soap } from "@/lib/ai/scribe";
import type { CodeSuggestion } from "@/lib/ai/coding";
import type { CbgGroup } from "@/lib/inacbg";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Can } from "@/components/auth/can";

const inputCls =
  "w-full rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none transition-colors focus:border-primary focus:ring-2 focus:ring-primary/30";

function SourceBadge({ source }: { source?: "ai" | "heuristic" }) {
  if (!source) return null;
  return (
    <Badge variant={source === "ai" ? "info" : "muted"}>
      {source === "ai" ? "Claude" : "heuristik"}
    </Badge>
  );
}

function ScribeCard() {
  const [transcript, setTranscript] = useState("");
  const [soap, setSoap] = useState<Soap | null>(null);
  const [source, setSource] = useState<"ai" | "heuristic">();
  const [busy, setBusy] = useState(false);

  const run = async () => {
    if (transcript.trim().length < 10) return;
    setBusy(true);
    const res = await fetch("/api/ai/scribe", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ transcript }),
    });
    setBusy(false);
    if (res.ok) {
      const data = await res.json();
      setSoap(data.soap);
      setSource(data.source);
    }
  };

  const rows: [string, keyof Soap][] = [
    ["S — Subjektif", "subjective"], ["O — Objektif", "objective"],
    ["A — Asesmen", "assessment"], ["P — Plan", "plan"],
  ];

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Stethoscope className="size-4 text-primary" /> AI Scribe — Draf CPPT/SOAP
        </CardTitle>
        <SourceBadge source={source} />
      </CardHeader>
      <CardContent className="space-y-3">
        <textarea className={`${inputCls} min-h-[120px]`} value={transcript}
          onChange={(e) => setTranscript(e.target.value)}
          placeholder="Tempel transkrip percakapan dokter–pasien…" aria-label="Transkrip konsultasi" />
        <Button size="sm" onClick={run} disabled={busy || transcript.trim().length < 10}>
          <Sparkles className="size-4" /> Susun Draf SOAP
        </Button>
        {soap && (
          <div className="space-y-2 rounded-lg border border-border bg-background p-3 text-sm">
            {rows.map(([label, key]) => (
              <p key={key}>
                <span className="font-semibold">{label}:</span> {soap[key] || <span className="text-muted-foreground">—</span>}
              </p>
            ))}
            <p className="pt-1 text-xs text-muted-foreground">Draf — wajib diverifikasi dokter sebelum disimpan ke CPPT.</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function AskCard() {
  const [question, setQuestion] = useState("");
  const [answer, setAnswer] = useState<string | null>(null);
  const [source, setSource] = useState<"ai" | "heuristic">();
  const [busy, setBusy] = useState(false);

  const run = async () => {
    if (question.trim().length < 3) return;
    setBusy(true);
    const res = await fetch("/api/ai/ask", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ question }),
    });
    setBusy(false);
    if (res.ok) {
      const data = await res.json();
      setAnswer(data.answer);
      setSource(data.source);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <MessageSquare className="size-4 text-primary" /> Tanya Data
        </CardTitle>
        <SourceBadge source={source} />
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="flex gap-2">
          <input className={inputCls} value={question}
            onChange={(e) => setQuestion(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && run()}
            placeholder="mis. Berapa BOR saat ini? Top diagnosis?" aria-label="Pertanyaan data" />
          <Button size="sm" onClick={run} disabled={busy || question.trim().length < 3}>Tanya</Button>
        </div>
        {answer && (
          <div className="rounded-lg border border-border bg-background p-3 text-sm">
            {answer}
            <p className="pt-1 text-xs text-muted-foreground">Dijawab dari data tenant Anda secara real-time.</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function CodingCard() {
  const [text, setText] = useState("");
  const [icd, setIcd] = useState<CodeSuggestion[] | null>(null);
  const [cbg, setCbg] = useState<CbgGroup | null>(null);
  const [source, setSource] = useState<"ai" | "heuristic">();
  const [busy, setBusy] = useState(false);

  const run = async () => {
    if (text.trim().length < 3) return;
    setBusy(true);
    const res = await fetch("/api/ai/coding", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ text }),
    });
    setBusy(false);
    if (res.ok) {
      const data = await res.json();
      setIcd(data.icd10);
      setCbg(data.inacbg);
      setSource(data.source);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Tags className="size-4 text-primary" /> Asisten Coding — ICD-10 / INA-CBG
        </CardTitle>
        <SourceBadge source={source} />
      </CardHeader>
      <CardContent className="space-y-3">
        <textarea className={`${inputCls} min-h-[80px]`} value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="Tempel kesan/diagnosis klinis…" aria-label="Teks klinis untuk coding" />
        <Button size="sm" onClick={run} disabled={busy || text.trim().length < 3}>
          <Sparkles className="size-4" /> Sarankan Kode
        </Button>
        {icd && (
          <div className="space-y-2">
            {icd.length === 0 ? (
              <p className="text-sm text-muted-foreground">Tidak ada kandidat kode yang cocok.</p>
            ) : (
              <ul className="flex flex-col gap-1.5">
                {icd.map((c) => (
                  <li key={c.code} className="flex items-center gap-3 text-sm">
                    <span className="rounded-md bg-primary/10 px-2 py-0.5 font-mono text-xs font-semibold text-primary">{c.code}</span>
                    <span className="min-w-0 flex-1">{c.description}</span>
                  </li>
                ))}
              </ul>
            )}
            {cbg && (
              <p className="flex items-center gap-2 rounded-lg bg-muted px-3 py-2 text-xs">
                <FileText className="size-3.5 text-primary" />
                INA-CBG (ilustratif): <span className="font-mono font-semibold">{cbg.code}</span> · {cbg.description}
              </p>
            )}
            <p className="text-xs text-muted-foreground">Saran — koder mengonfirmasi kode final.</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

export function CopilotView() {
  return (
    <div className="flex flex-col gap-6 animate-fade-in">
      <div>
        <h1 className="flex items-center gap-2 text-xl font-semibold tracking-tight">
          <Sparkles className="size-5 text-primary" /> Abecca Copilot
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Asisten AI berbasis Claude — draf CPPT, tanya-data, dan saran kode. Hasil bersifat draf/saran
          dan harus diverifikasi. Tanpa kunci API, Copilot memakai heuristik lokal yang deterministik.
        </p>
      </div>

      <Can permission="note:write">
        <ScribeCard />
      </Can>
      <Can permission="analytics:read">
        <AskCard />
      </Can>
      <Can permission="diagnosis:read">
        <CodingCard />
      </Can>
    </div>
  );
}
