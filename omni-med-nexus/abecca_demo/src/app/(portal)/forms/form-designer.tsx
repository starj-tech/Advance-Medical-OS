"use client";

import { useCallback, useEffect, useState } from "react";
import { Archive, Plus, Trash2 } from "lucide-react";
import {
  FORM_FIELD_TYPES,
  slugifyKey,
  type FormField,
  type FormFieldType,
} from "@/lib/form-builder";
import type { FormTemplate } from "@/server/clinical/forms";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

const inputCls =
  "h-9 rounded-lg border border-border bg-background px-2.5 text-sm outline-none transition-colors focus:border-primary focus:ring-2 focus:ring-primary/30";

type Draft = FormField & { optionsText?: string };

export function FormDesigner() {
  const [templates, setTemplates] = useState<FormTemplate[]>([]);
  const [name, setName] = useState("");
  const [category, setCategory] = useState("");
  const [fields, setFields] = useState<Draft[]>([]);
  // New-field inputs
  const [fLabel, setFLabel] = useState("");
  const [fType, setFType] = useState<FormFieldType>("text");
  const [fRequired, setFRequired] = useState(false);
  const [fOptions, setFOptions] = useState("");
  const [fUnit, setFUnit] = useState("");
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    const res = await fetch("/api/forms/templates?all=1");
    setTemplates(res.ok ? await res.json() : []);
  }, []);
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void load();
  }, [load]);

  const addField = () => {
    const label = fLabel.trim();
    if (!label) return;
    const field: Draft = { key: slugifyKey(label), label, type: fType };
    if (fRequired) field.required = true;
    if (fType === "select") {
      field.options = fOptions.split(",").map((s) => s.trim()).filter(Boolean);
    }
    if (fType === "number" && fUnit.trim()) field.unit = fUnit.trim();
    setFields((cur) => [...cur, field]);
    setFLabel("");
    setFOptions("");
    setFUnit("");
    setFRequired(false);
    setFType("text");
  };

  const removeField = (i: number) => setFields((cur) => cur.filter((_, idx) => idx !== i));

  const save = async () => {
    setError(null);
    const res = await fetch("/api/forms/templates", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ name: name.trim(), category: category.trim(), fields }),
    });
    const j = await res.json().catch(() => ({}));
    if (res.ok) {
      setName("");
      setCategory("");
      setFields([]);
      await load();
    } else {
      setError(j.error ?? "Gagal menyimpan form.");
    }
  };

  const archive = async (t: FormTemplate) => {
    await fetch("/api/forms/templates", {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        templateId: t.id,
        status: t.status === "active" ? "archived" : "active",
      }),
    });
    await load();
  };

  const canSave = name.trim().length > 0 && fields.length > 0;

  return (
    <div className="flex flex-col gap-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Plus className="size-4 text-primary" /> Rancang Form Baru
          </CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          <div className="flex flex-wrap gap-2">
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Nama form (mis. Pengkajian Awal Rawat Inap)"
              className={`${inputCls} min-w-72 flex-1`}
              aria-label="Nama form"
            />
            <input
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              placeholder="Kategori (mis. Keperawatan)"
              className={`${inputCls} w-56`}
              aria-label="Kategori"
            />
          </div>

          {/* Current fields */}
          {fields.length > 0 && (
            <ul className="flex flex-col gap-1.5">
              {fields.map((f, i) => (
                <li
                  key={f.key}
                  className="flex flex-wrap items-center gap-2 rounded-lg border border-border bg-background px-3 py-2 text-sm"
                >
                  <span className="font-medium">{f.label}</span>
                  <Badge variant="muted">{f.type}</Badge>
                  {f.required && <Badge variant="warning">wajib</Badge>}
                  {f.type === "select" && (
                    <span className="text-xs text-muted-foreground">[{(f.options ?? []).join(", ")}]</span>
                  )}
                  {f.unit && <span className="text-xs text-muted-foreground">{f.unit}</span>}
                  <button
                    type="button"
                    onClick={() => removeField(i)}
                    className="ml-auto text-muted-foreground transition-colors hover:text-danger"
                    aria-label={`Hapus ${f.label}`}
                  >
                    <Trash2 className="size-4" />
                  </button>
                </li>
              ))}
            </ul>
          )}

          {/* Add a field */}
          <div className="rounded-lg border border-dashed border-border p-3">
            <div className="flex flex-wrap items-end gap-2">
              <input
                value={fLabel}
                onChange={(e) => setFLabel(e.target.value)}
                placeholder="Label field"
                className={`${inputCls} min-w-48 flex-1`}
                aria-label="Label field"
              />
              <select
                value={fType}
                onChange={(e) => setFType(e.target.value as FormFieldType)}
                className={inputCls}
                aria-label="Tipe field"
              >
                {FORM_FIELD_TYPES.map((t) => (
                  <option key={t.type} value={t.type}>{t.label}</option>
                ))}
              </select>
              {fType === "select" && (
                <input
                  value={fOptions}
                  onChange={(e) => setFOptions(e.target.value)}
                  placeholder="Pilihan, pisahkan koma"
                  className={`${inputCls} min-w-48`}
                  aria-label="Pilihan"
                />
              )}
              {fType === "number" && (
                <input
                  value={fUnit}
                  onChange={(e) => setFUnit(e.target.value)}
                  placeholder="Satuan"
                  className={`${inputCls} w-24`}
                  aria-label="Satuan"
                />
              )}
              <label className="flex items-center gap-1.5 pb-2 text-xs text-muted-foreground">
                <input
                  type="checkbox"
                  checked={fRequired}
                  onChange={(e) => setFRequired(e.target.checked)}
                  className="size-4 accent-[var(--primary)]"
                />
                wajib
              </label>
              <Button size="sm" variant="outline" onClick={addField} disabled={!fLabel.trim()}>
                <Plus className="size-4" /> Tambah field
              </Button>
            </div>
          </div>

          <div className="flex items-center justify-between gap-2">
            {error ? (
              <p className="text-sm font-medium text-danger">{error}</p>
            ) : (
              <p className="text-xs text-muted-foreground">{fields.length} field</p>
            )}
            <Button onClick={save} disabled={!canSave}>
              Simpan form
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Form Tersimpan</CardTitle>
          <Badge variant="muted">{templates.length}</Badge>
        </CardHeader>
        <CardContent className="p-0">
          {templates.length === 0 ? (
            <p className="px-5 py-6 text-center text-sm text-muted-foreground">Belum ada form.</p>
          ) : (
            <ul className="divide-y divide-border">
              {templates.map((t) => (
                <li key={t.id} className="flex flex-wrap items-center gap-3 px-5 py-3.5">
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="text-sm font-medium">{t.name}</span>
                      <Badge variant="info">{t.category}</Badge>
                      <Badge variant={t.status === "active" ? "success" : "muted"}>
                        {t.status === "active" ? "Aktif" : "Diarsip"}
                      </Badge>
                    </div>
                    <p className="mt-0.5 text-xs text-muted-foreground">
                      {t.fields.length} field · {t.fields.map((f) => f.label).join(", ")}
                    </p>
                  </div>
                  <Button size="sm" variant="ghost" onClick={() => archive(t)}>
                    <Archive className="size-4" /> {t.status === "active" ? "Arsipkan" : "Aktifkan"}
                  </Button>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
