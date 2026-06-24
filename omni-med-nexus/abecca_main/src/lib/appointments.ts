/**
 * Appointment modality — shared, client-safe so the booking form and the server
 * agree on whether a janji temu is an in-person poliklinik visit or a remote
 * telemedicine (video) consult. A telemedicine appointment is backed by a video
 * session (see server/clinical/telemedicine.ts); check-in routes the patient to
 * the virtual waiting room instead of the physical antrian. Pure constants only.
 */
export type AppointmentModality = "in_person" | "telemedicine";

export const APPOINTMENT_MODALITIES: AppointmentModality[] = ["in_person", "telemedicine"];

export const APPOINTMENT_MODALITY_LABEL: Record<AppointmentModality, string> = {
  in_person: "Tatap muka",
  telemedicine: "Telemedicine",
};

export const isAppointmentModality = (v: unknown): v is AppointmentModality =>
  typeof v === "string" && (APPOINTMENT_MODALITIES as string[]).includes(v);
