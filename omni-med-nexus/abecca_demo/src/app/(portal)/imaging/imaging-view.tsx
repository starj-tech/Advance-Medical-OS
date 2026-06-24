"use client";

/* eslint-disable @next/next/no-img-element */
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  ChevronLeft,
  ChevronRight,
  Contrast,
  Images,
  Plus,
  RotateCcw,
  Sun,
  ZoomIn,
} from "lucide-react";
import { MODALITIES } from "@/lib/diagnostic-catalog";
import type { ImagingStudy } from "@/server/clinical/imaging";
import { formatDateTime } from "@/lib/utils";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Can } from "@/components/auth/can";

const inputCls =
  "h-9 w-full rounded-lg border border-border bg-background px-2.5 text-sm outline-none transition-colors focus:border-primary focus:ring-2 focus:ring-primary/30";

type Win = { brightness: number; contrast: number; zoom: number; invert: boolean };
const DEFAULT_WIN: Win = { brightness: 1, contrast: 1, zoom: 1, invert: false };

export function ImagingView() {
  const [studies, setStudies] = useState<ImagingStudy[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [frame, setFrame] = useState(0);
  const [win, setWin] = useState<Win>(DEFAULT_WIN);

  // Register-study form
  const [patientId, setPatientId] = useState("");
  const [modality, setModality] = useState<string>(MODALITIES[0]);
  const [description, setDescription] = useState("");
  const [imagesText, setImagesText] = useState("");
  const [accession, setAccession] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);

  const load = useCallback(async () => {
    const res = await fetch("/api/imaging/studies");
    const list: ImagingStudy[] = res.ok ? await res.json() : [];
    setStudies(list);
    setSelectedId((cur) => cur ?? list[0]?.id ?? null);
    setLoading(false);
  }, []);
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void load();
  }, [load]);

  const study = useMemo(
    () => studies.find((s) => s.id === selectedId) ?? null,
    [studies, selectedId],
  );
  const image = study?.images[Math.min(frame, (study?.images.length ?? 1) - 1)];

  const selectStudy = (id: string) => {
    setSelectedId(id);
    setFrame(0);
    setWin(DEFAULT_WIN);
  };

  const register = async () => {
    setError(null);
    const images = imagesText
      .split("\n")
      .map((l) => l.trim())
      .filter(Boolean)
      .map((url) => ({ url }));
    const res = await fetch("/api/imaging/studies", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        patientId: patientId.trim(),
        modality,
        description: description.trim(),
        accession: accession.trim() || null,
        images,
      }),
    });
    const j = await res.json().catch(() => ({}));
    if (res.ok) {
      setPatientId("");
      setDescription("");
      setImagesText("");
      setAccession("");
      setShowForm(false);
      setSelectedId(j.id ?? null);
      setFrame(0);
      setWin(DEFAULT_WIN);
      await load();
    } else {
      setError(j.error ?? "Gagal mendaftarkan studi.");
    }
  };

  const filter = `brightness(${win.brightness}) contrast(${win.contrast})${win.invert ? " invert(1)" : ""}`;

  return (
    <div className="flex flex-col gap-6 animate-fade-in">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold tracking-tight">Imaging / PACS</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Registri studi citra radiologi + viewer web dengan windowing (kecerahan/kontras),
            zoom, dan inversi. Citra dirujuk via URL arsip (WADO/VNA) — bukan menyimpan berkas DICOM.
          </p>
        </div>
        <Can permission="diagnostic:result">
          <Button variant="outline" onClick={() => setShowForm((v) => !v)}>
            <Plus className="size-4" /> {showForm ? "Tutup" : "Daftarkan studi"}
          </Button>
        </Can>
      </div>

      {showForm && (
        <Can permission="diagnostic:result">
          <Card>
            <CardHeader>
              <CardTitle>Daftarkan Studi Citra</CardTitle>
            </CardHeader>
            <CardContent className="grid gap-3 sm:grid-cols-2">
              <label className="text-xs font-medium text-muted-foreground">
                ID Pasien
                <input value={patientId} onChange={(e) => setPatientId(e.target.value)} placeholder="PAT-123" className={`${inputCls} mt-1`} />
              </label>
              <label className="text-xs font-medium text-muted-foreground">
                Modality
                <select value={modality} onChange={(e) => setModality(e.target.value)} className={`${inputCls} mt-1`}>
                  {MODALITIES.map((m) => (
                    <option key={m} value={m}>{m}</option>
                  ))}
                </select>
              </label>
              <label className="text-xs font-medium text-muted-foreground sm:col-span-2">
                Deskripsi
                <input value={description} onChange={(e) => setDescription(e.target.value)} placeholder="mis. CT Scan Kepala non-kontras" className={`${inputCls} mt-1`} />
              </label>
              <label className="text-xs font-medium text-muted-foreground">
                Accession (opsional)
                <input value={accession} onChange={(e) => setAccession(e.target.value)} placeholder="RAD-…" className={`${inputCls} mt-1`} />
              </label>
              <label className="text-xs font-medium text-muted-foreground sm:col-span-2">
                URL citra (satu per baris — http(s) atau data:image)
                <textarea value={imagesText} onChange={(e) => setImagesText(e.target.value)} rows={3} placeholder={"https://vna.rs.example/wado/...\nhttps://..."} className={`${inputCls} mt-1 min-h-20`} />
              </label>
              <div className="flex items-center justify-between gap-2 sm:col-span-2">
                {error && <p className="text-sm font-medium text-danger">{error}</p>}
                <Button className="ml-auto" onClick={register} disabled={!patientId.trim() || !description.trim() || !imagesText.trim()}>
                  Simpan studi
                </Button>
              </div>
            </CardContent>
          </Card>
        </Can>
      )}

      <div className="grid gap-6 lg:grid-cols-[20rem_1fr]">
        {/* Study list */}
        <Card className="h-fit">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Images className="size-4 text-primary" /> Studi
            </CardTitle>
            <Badge variant="muted">{studies.length}</Badge>
          </CardHeader>
          <CardContent className="p-0">
            {loading ? (
              <p className="px-5 py-6 text-center text-sm text-muted-foreground">Memuat…</p>
            ) : studies.length === 0 ? (
              <p className="px-5 py-6 text-center text-sm text-muted-foreground">Belum ada studi citra.</p>
            ) : (
              <ul className="divide-y divide-border">
                {studies.map((s) => (
                  <li key={s.id}>
                    <button
                      type="button"
                      onClick={() => selectStudy(s.id)}
                      aria-pressed={s.id === selectedId}
                      className={`flex w-full flex-col items-start gap-0.5 px-5 py-3 text-left transition-colors ${
                        s.id === selectedId ? "bg-primary/10" : "hover:bg-foreground/5"
                      }`}
                    >
                      <span className="flex items-center gap-2 text-sm font-medium">
                        {s.description}
                        <Badge variant="info">{s.modality}</Badge>
                      </span>
                      <span className="text-xs text-muted-foreground">
                        Pasien {s.patientId} · {s.images.length} citra · {formatDateTime(s.createdAt)}
                      </span>
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>

        {/* Viewer */}
        <Card>
          <CardHeader>
            <CardTitle>{study ? study.description : "Viewer"}</CardTitle>
            {study && (
              <Badge variant="muted">
                {study.accession ? `${study.accession} · ` : ""}
                {Math.min(frame + 1, study.images.length)}/{study.images.length}
              </Badge>
            )}
          </CardHeader>
          <CardContent className="flex flex-col gap-4">
            {!study ? (
              <p className="py-10 text-center text-sm text-muted-foreground">
                Pilih studi untuk menampilkan citra.
              </p>
            ) : (
              <>
                <div className="relative grid min-h-[22rem] place-items-center overflow-hidden rounded-xl bg-black">
                  {image ? (
                    <img
                      src={image.url}
                      alt={image.label ?? study.description}
                      className="max-h-[60vh] select-none object-contain transition-[filter,transform] duration-100"
                      style={{ filter, transform: `scale(${win.zoom})` }}
                      draggable={false}
                    />
                  ) : (
                    <span className="text-sm text-white/60">Citra tidak tersedia</span>
                  )}
                  {study.images.length > 1 && (
                    <>
                      <button
                        type="button"
                        aria-label="Citra sebelumnya"
                        onClick={() => setFrame((f) => Math.max(0, f - 1))}
                        className="absolute left-2 top-1/2 grid size-9 -translate-y-1/2 place-items-center rounded-full bg-white/10 text-white hover:bg-white/20"
                      >
                        <ChevronLeft className="size-5" />
                      </button>
                      <button
                        type="button"
                        aria-label="Citra berikutnya"
                        onClick={() => setFrame((f) => Math.min(study.images.length - 1, f + 1))}
                        className="absolute right-2 top-1/2 grid size-9 -translate-y-1/2 place-items-center rounded-full bg-white/10 text-white hover:bg-white/20"
                      >
                        <ChevronRight className="size-5" />
                      </button>
                    </>
                  )}
                </div>

                {/* Windowing controls */}
                <div className="grid gap-4 sm:grid-cols-3">
                  <label className="flex flex-col gap-1 text-xs font-medium text-muted-foreground">
                    <span className="flex items-center gap-1.5"><Sun className="size-3.5" /> Kecerahan</span>
                    <input
                      type="range" min={0.3} max={2.5} step={0.05} value={win.brightness}
                      onChange={(e) => setWin((w) => ({ ...w, brightness: Number(e.target.value) }))}
                      className="accent-[var(--primary)]"
                    />
                  </label>
                  <label className="flex flex-col gap-1 text-xs font-medium text-muted-foreground">
                    <span className="flex items-center gap-1.5"><Contrast className="size-3.5" /> Kontras</span>
                    <input
                      type="range" min={0.3} max={3} step={0.05} value={win.contrast}
                      onChange={(e) => setWin((w) => ({ ...w, contrast: Number(e.target.value) }))}
                      className="accent-[var(--primary)]"
                    />
                  </label>
                  <label className="flex flex-col gap-1 text-xs font-medium text-muted-foreground">
                    <span className="flex items-center gap-1.5"><ZoomIn className="size-3.5" /> Zoom</span>
                    <input
                      type="range" min={1} max={4} step={0.1} value={win.zoom}
                      onChange={(e) => setWin((w) => ({ ...w, zoom: Number(e.target.value) }))}
                      className="accent-[var(--primary)]"
                    />
                  </label>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  <Button
                    size="sm"
                    variant={win.invert ? "primary" : "outline"}
                    onClick={() => setWin((w) => ({ ...w, invert: !w.invert }))}
                  >
                    <Contrast className="size-4" /> Inversi
                  </Button>
                  <Button size="sm" variant="ghost" onClick={() => setWin(DEFAULT_WIN)}>
                    <RotateCcw className="size-4" /> Reset
                  </Button>
                  {study.images.length > 1 && (
                    <div className="ml-auto flex gap-1.5">
                      {study.images.map((img, i) => (
                        <button
                          key={i}
                          type="button"
                          onClick={() => setFrame(i)}
                          aria-label={`Citra ${i + 1}`}
                          className={`size-12 overflow-hidden rounded border ${
                            i === frame ? "border-primary" : "border-border opacity-70 hover:opacity-100"
                          }`}
                        >
                          <img src={img.url} alt={img.label ?? `frame ${i + 1}`} className="size-full bg-black object-contain" />
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              </>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
