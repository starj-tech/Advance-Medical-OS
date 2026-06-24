/**
 * EWS — Early Warning Score (skor peringatan dini) based on the Royal College of
 * Physicians' NEWS2 aggregate. From a single set of bedside observations it
 * produces a 0–20 score, a per-parameter breakdown and a low/medium/high
 * escalation band — the trigger for the deteriorating-patient response that
 * KARS/SNARS accreditation requires.
 *
 * Standard NEWS2 weighting; SpO₂ uses Scale 1 (the default — Scale 2 target
 * ranges for chronic hypercapnic respiratory failure are out of scope). Pure,
 * deterministic and client-safe (no imports), so the bedside form and the server
 * share one engine.
 */

export type EwsBand = "low" | "medium" | "high";

/** ACVPU level of consciousness — anything other than Alert scores 3. */
export type Consciousness = "alert" | "confusion" | "voice" | "pain" | "unresponsive";

export interface EwsObservation {
  /** Respiration rate, breaths per minute. */
  respiratoryRate: number;
  /** Oxygen saturation, %. */
  spo2: number;
  /** On supplemental oxygen (vs. room air). */
  onOxygen: boolean;
  /** Temperature, °C. */
  temperature: number;
  /** Systolic blood pressure, mmHg. */
  systolicBp: number;
  /** Pulse, beats per minute. */
  pulse: number;
  consciousness: Consciousness;
}

export interface EwsParam {
  key: string;
  label: string;
  value: string;
  points: number;
}

export interface EwsResult {
  score: number;
  band: EwsBand;
  /** A single parameter scoring 3 mandates urgent review even at a low total. */
  singleParamThree: boolean;
  params: EwsParam[];
}

const CONSCIOUSNESS_LABEL: Record<Consciousness, string> = {
  alert: "Sadar (A)",
  confusion: "Bingung baru (C)",
  voice: "Respons suara (V)",
  pain: "Respons nyeri (P)",
  unresponsive: "Tidak respons (U)",
};

function scoreRespiratory(rr: number): number {
  if (rr <= 8) return 3;
  if (rr <= 11) return 1;
  if (rr <= 20) return 0;
  if (rr <= 24) return 2;
  return 3;
}

function scoreSpo2(spo2: number): number {
  if (spo2 <= 91) return 3;
  if (spo2 <= 93) return 2;
  if (spo2 <= 95) return 1;
  return 0;
}

function scoreTemperature(t: number): number {
  if (t <= 35.0) return 3;
  if (t <= 36.0) return 1;
  if (t <= 38.0) return 0;
  if (t <= 39.0) return 1;
  return 2;
}

function scoreSystolic(sys: number): number {
  if (sys <= 90) return 3;
  if (sys <= 100) return 2;
  if (sys <= 110) return 1;
  if (sys <= 219) return 0;
  return 3;
}

function scorePulse(p: number): number {
  if (p <= 40) return 3;
  if (p <= 50) return 1;
  if (p <= 90) return 0;
  if (p <= 110) return 1;
  if (p <= 130) return 2;
  return 3;
}

export function scoreNews2(obs: EwsObservation): EwsResult {
  const params: EwsParam[] = [
    { key: "rr", label: "Frekuensi napas", value: `${obs.respiratoryRate}/mnt`, points: scoreRespiratory(obs.respiratoryRate) },
    { key: "spo2", label: "SpO₂", value: `${obs.spo2}%`, points: scoreSpo2(obs.spo2) },
    { key: "o2", label: "Suplementasi O₂", value: obs.onOxygen ? "Ya" : "Udara ruangan", points: obs.onOxygen ? 2 : 0 },
    { key: "temp", label: "Suhu", value: `${obs.temperature}°C`, points: scoreTemperature(obs.temperature) },
    { key: "sbp", label: "Tekanan sistolik", value: `${obs.systolicBp} mmHg`, points: scoreSystolic(obs.systolicBp) },
    { key: "pulse", label: "Nadi", value: `${obs.pulse}/mnt`, points: scorePulse(obs.pulse) },
    { key: "acvpu", label: "Kesadaran", value: CONSCIOUSNESS_LABEL[obs.consciousness], points: obs.consciousness === "alert" ? 0 : 3 },
  ];

  const score = params.reduce((s, p) => s + p.points, 0);
  const singleParamThree = params.some((p) => p.points === 3);
  // NEWS2 escalation: ≥7 emergency; 5–6 urgent; a single red (3) parameter also
  // escalates to urgent review even when the aggregate is low.
  const band: EwsBand = score >= 7 ? "high" : score >= 5 || singleParamThree ? "medium" : "low";

  return { score, band, singleParamThree, params };
}
