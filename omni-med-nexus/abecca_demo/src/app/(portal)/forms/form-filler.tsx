"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { ClipboardCheck } from "lucide-react";
import {
  validateSubmission,
  type FormAnswers,
  type FormField,
} from "@/lib/form-builder";
import type { FormSubmission, FormTemplate } from "@/server/clinical/forms";
import { formatDateTime } from "@/lib/utils";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Can } from "@/components/auth/can";

const inputCls =
  "h-9 w-full rounded-lg border border-border bg-background px-2.5 text-sm outline-none transition-colors focus:border-primary focus:ring-2 focus:ring-primary/30";

export function FormFiller() {
  const [templates, setTemplates] = useState<FormTemplate[]>([]);
  const [templateId, setTemplateId] = useState("");
  const [patientId, setPatientId] = useState("");
  const [answers, setAnswers] = useState<FormAnswers>({});
  const [submissions, setSubmissions] = useState<FormSubmission[]>([]);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [banner, setBanner] = useState<string | null>(null);

  const loadTemplates = useCallback(async () => {
    const res = await fetch("/api/forms/templates");
    const list: FormTemplate[] = res.ok ? await res.json() : [];
    setTemplates(list);
    setTemplateId((cur) => cur || list[0]?.id || "");
  }, []);
  const loadSubmissions = useCallback(async () => {
    const res = await fetch("/api/forms/submissions");
    setSubmissions(res.ok ? await res.json() : []);
  }, []);
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void loadTemplates();
    void loadSubmissions();
  }, [loadTemplates, loadSubmissions]);

  const template = useMemo(
    () => templates.find((t) => t.id === templateId),
    [templates, templateId],
  );

  const onSelectTemplate = (id: string) => {
    setTemplateId(id);
    setAnswers({});
    setErrors({});
    setBanner(null);
  };

  const setAnswer = (key: string, value: unknown) =>
    setAnswers((cur) => ({ ...cur, [key]: value }));

  const submit = async () => {
    if (!template) return;
    setBanner(null);
    const v = validateSubmission(template.fields, answers);
    if (!v.ok || !patientId.trim()) {
      setErrors({ ...v.errors, ...(patientId.trim() ? {} : { __patient: "ID pasien wajib" }) });
      return;
    }
    setErrors({});
    const res = await fetch("/api/forms/submissions", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ templateId: template.id, patientId: patientId.trim(), answers }),
    });
    if (res.ok) {
      setAnswers({});
      setBanner("Form berhasil disimpan.");
      await loadSubmissions();
    } else {
      const j = await res.json().catch(() => ({}));
      setBanner(j.error ?? "Gagal menyimpan.");
    }
  };

  const renderField = (f: FormField) => {
    const val = answers[f.key];
    const common = { "aria-label": f.label, className: inputCls };
    switch (f.type) {
      case "textarea":
        return (
          <textarea
            {...common}
            className={`${inputCls} min-h-20`}
            value={typeof val === "string" ? val : ""}
            onChange={(e) => setAnswer(f.key, e.target.value)}
          />
        );
      case "number":
        return (
          <input
            {...common}
            type="number"
            value={val === undefined ? "" : String(val)}
            onChange={(e) => setAnswer(f.key, e.target.value)}
          />
        );
      case "date":
        return (
          <input
            {...common}
            type="date"
            value={typeof val === "string" ? val : ""}
            onChange={(e) => setAnswer(f.key, e.target.value)}
          />
        );
      case "select":
        return (
          <select
            {...common}
            value={typeof val === "string" ? val : ""}
            onChange={(e) => setAnswer(f.key, e.target.value)}
          >
            <option value="">— pilih —</option>
            {(f.options ?? []).map((o) => (
              <option key={o} value={o}>{o}</option>
            ))}
          </select>
        );
      case "checkbox":
        return (
          <label className="flex items-center gap-2 text-sm text-muted-foreground">
            <input
              type="checkbox"
              checked={val === true}
              onChange={(e) => setAnswer(f.key, e.target.checked)}
              className="size-4 accent-[var(--primary)]"
            />
            Ya
          </label>
        );
      default:
        return (
          <input
            {...common}
            value={typeof val === "string" ? val : ""}
            onChange={(e) => setAnswer(f.key, e.target.value)}
          />
        );
    }
  };

  return (
    <div className="flex flex-col gap-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <ClipboardCheck className="size-4 text-primary" /> Isi Form
          </CardTitle>
          {templates.length > 0 && (
            <select
              value={templateId}
              onChange={(e) => onSelectTemplate(e.target.value)}
              className="h-8 rounded-lg border border-border bg-surface px-2 text-sm outline-none"
              aria-label="Pilih form"
            >
              {templates.map((t) => (
                <option key={t.id} value={t.id}>{t.name}</option>
              ))}
            </select>
          )}
        </CardHeader>
        <CardContent>
          {!template ? (
            <p className="text-sm text-muted-foreground">
              Belum ada form aktif. Minta admin merancangnya di tab Desain.
            </p>
          ) : (
            <Can
              permission="form:submit"
              fallback={<p className="text-sm text-muted-foreground">Anda tidak memiliki akses mengisi form.</p>}
            >
              <div className="flex flex-col gap-3">
                <label className="flex flex-col gap-1">
                  <span className="text-xs font-medium text-muted-foreground">ID Pasien</span>
                  <input
                    value={patientId}
                    onChange={(e) => setPatientId(e.target.value)}
                    placeholder="PAT-123"
                    className={inputCls}
                  />
                  {errors.__patient && <span className="text-xs text-danger">{errors.__patient}</span>}
                </label>
                {template.fields.map((f) => (
                  <label key={f.key} className="flex flex-col gap-1">
                    <span className="text-xs font-medium text-muted-foreground">
                      {f.label}
                      {f.required && <span className="text-danger"> *</span>}
                      {f.unit && <span className="text-muted-foreground"> ({f.unit})</span>}
                    </span>
                    {renderField(f)}
                    {errors[f.key] && <span className="text-xs text-danger">{errors[f.key]}</span>}
                  </label>
                ))}
                <div className="flex items-center justify-between gap-2">
                  {banner && <p className="text-sm font-medium text-primary">{banner}</p>}
                  <Button className="ml-auto" onClick={submit}>
                    Simpan
                  </Button>
                </div>
              </div>
            </Can>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Riwayat Pengisian</CardTitle>
          <Badge variant="muted">{submissions.length}</Badge>
        </CardHeader>
        <CardContent className="p-0">
          {submissions.length === 0 ? (
            <p className="px-5 py-6 text-center text-sm text-muted-foreground">Belum ada pengisian.</p>
          ) : (
            <ul className="divide-y divide-border">
              {submissions.map((s) => (
                <li key={s.id} className="px-5 py-3">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="text-sm font-medium">{s.templateName}</span>
                    <Badge variant="info">Pasien {s.patientId}</Badge>
                    <span className="ml-auto text-[11px] text-muted-foreground">
                      {formatDateTime(s.createdAt)}
                    </span>
                  </div>
                  <p className="mt-0.5 line-clamp-1 text-xs text-muted-foreground">
                    {Object.entries(s.answers)
                      .map(([k, v]) => `${k}: ${String(v)}`)
                      .join(" · ")}
                  </p>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
