/**
 * Appointment flow orchestration — the cross-module wiring between scheduling,
 * the outpatient queue and telemedicine, kept out of the route handlers so it is
 * unit-testable in-memory. A telemedicine appointment is backed by a video
 * session created at booking (linked both ways); check-in routes the patient to
 * the virtual waiting room (session → waiting) rather than the physical antrian,
 * whereas an in-person appointment still spawns a queue ticket. Tenant-scoped.
 */
import {
  createAppointment,
  getAppointment,
  setAppointmentStatus,
  setAppointmentTeleSession,
  type Appointment,
  type CreateAppointmentInput,
} from "./appointments";
import { createTicket, type QueueTicket } from "../registration/queue";
import {
  createTeleSession,
  getTeleSession,
  setTeleStatus,
  type TeleSession,
} from "../clinical/telemedicine";
import type { TeleStatus } from "@/lib/telemedicine";

/** An appointment enriched with its telemedicine session's join URL + status. */
export type AppointmentWithTele = Appointment & {
  teleRoomUrl: string | null;
  teleStatus: TeleStatus | null;
};

/**
 * Book an appointment. For a telemedicine modality, also create the backing video
 * session up front (so the room/join link exists ahead of the visit) and link it
 * both ways. Returns the appointment carrying its teleSessionId when applicable.
 */
export async function bookAppointment(
  companyId: string,
  input: CreateAppointmentInput,
): Promise<Appointment> {
  const appt = await createAppointment(companyId, input);
  if (appt.modality !== "telemedicine") return appt;

  const session = await createTeleSession(companyId, {
    patientId: appt.patientId,
    appointmentId: appt.id,
    scheduledAt: appt.scheduledAt,
    clinicianId: input.createdBy ?? null,
    note: appt.notes,
  });
  return (await setAppointmentTeleSession(companyId, appt.id, session.id)) ?? {
    ...appt,
    teleSessionId: session.id,
  };
}

/** Appointments enriched with each telemedicine session's join URL + status. */
export async function listAppointmentsWithTele(
  companyId: string,
  appts: Appointment[],
): Promise<AppointmentWithTele[]> {
  return Promise.all(
    appts.map(async (a) => {
      if (a.modality !== "telemedicine" || !a.teleSessionId) {
        return { ...a, teleRoomUrl: null, teleStatus: null };
      }
      const s = await getTeleSession(companyId, a.teleSessionId);
      return { ...a, teleRoomUrl: s?.roomUrl ?? null, teleStatus: s?.status ?? null };
    }),
  );
}

export type CheckInResult =
  | { ok: true; appointment: Appointment; ticket?: QueueTicket; teleSession?: TeleSession }
  | { ok: false; status: number; error: string };

/**
 * Check a patient in. In-person → push into today's poliklinik antrian; telemedicine
 * → admit to the virtual waiting room (session → waiting). Only a scheduled
 * appointment can be checked in.
 */
export async function checkInAppointment(
  companyId: string,
  id: string,
): Promise<CheckInResult> {
  const appt = await getAppointment(companyId, id);
  if (!appt) return { ok: false, status: 404, error: "Appointment not found" };
  if (appt.status !== "scheduled") {
    return { ok: false, status: 409, error: "only a scheduled appointment can be checked in" };
  }

  if (appt.modality === "telemedicine") {
    let teleSession: TeleSession | undefined;
    if (appt.teleSessionId) {
      const moved = await setTeleStatus(companyId, appt.teleSessionId, "waiting");
      // A session past "scheduled" (already waiting/in progress) is fine; only a
      // genuinely illegal transition returns an error, which we surface.
      if (moved && "error" in moved) return { ok: false, status: 409, error: moved.error };
      teleSession = moved ?? (await getTeleSession(companyId, appt.teleSessionId));
    }
    const appointment = await setAppointmentStatus(companyId, id, "checked_in");
    return { ok: true, appointment: appointment ?? appt, teleSession };
  }

  const ticket = await createTicket(companyId, {
    patientId: appt.patientId,
    polyclinic: appt.polyclinic,
  });
  const appointment = await setAppointmentStatus(companyId, id, "checked_in", ticket.id);
  return { ok: true, appointment: appointment ?? appt, ticket };
}
