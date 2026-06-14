/**
 * ED visit lifecycle vocabulary — client-safe so the tracking board and the
 * server share the status/disposition labels. The ESI acuity itself lives in
 * lib/esi.ts; this is the workflow state around it.
 */
export type EdStatus = "waiting" | "in_treatment" | "disposition";

export const ED_STATUS_LABEL: Record<EdStatus, string> = {
  waiting: "Menunggu dokter",
  in_treatment: "Dalam penanganan",
  disposition: "Selesai (disposisi)",
};

export type EdDisposition = "admit" | "discharge" | "refer" | "observe";

export const ED_DISPOSITIONS: EdDisposition[] = ["admit", "discharge", "refer", "observe"];

export const ED_DISPOSITION_LABEL: Record<EdDisposition, string> = {
  admit: "Rawat inap",
  discharge: "Pulang",
  refer: "Rujuk",
  observe: "Observasi",
};

export const isEdDisposition = (v: unknown): v is EdDisposition =>
  typeof v === "string" && (ED_DISPOSITIONS as string[]).includes(v);
