/**
 * Subscription plan catalogue (single source of truth for pricing UI + checkout).
 *
 * Pure data, client-safe. Stripe Price IDs are referenced by env-var *name*
 * (`priceEnv`) and resolved server-side in billing/stripe.ts, so this module
 * never touches process.env and can be imported by client components.
 *
 * Prices are placeholders (IDR/month) — adjust freely; they only drive display.
 * Actual billing amounts come from the Stripe Price the env points to.
 */
export type PlanId = "starter" | "professional" | "enterprise";

export interface Plan {
  id: PlanId;
  name: string;
  tagline: string;
  /** Display price in IDR/month; null = custom (contact sales). */
  monthlyIdr: number | null;
  /** Included seats; null = negotiated / unlimited. */
  seats: number | null;
  features: string[];
  /** Name of the env var holding this plan's Stripe Price ID (empty = not self-serve). */
  priceEnv: string;
}

export const PLANS: Plan[] = [
  {
    id: "starter",
    name: "Starter",
    tagline: "Klinik & rumah sakit kecil yang baru memulai digitalisasi.",
    monthlyIdr: 2_500_000,
    seats: 25,
    features: [
      "Hingga 25 pengguna",
      "Modul inti: pasien, rawat inap, audit",
      "1 aplikasi (Main)",
      "Dukungan email",
    ],
    priceEnv: "STRIPE_PRICE_STARTER",
  },
  {
    id: "professional",
    name: "Professional",
    tagline: "Rumah sakit menengah dengan operasional multi-departemen.",
    monthlyIdr: 7_500_000,
    seats: 100,
    features: [
      "Hingga 100 pengguna",
      "Seluruh modul Starter + formularium, perangkat, tarif",
      "Akses aplikasi Main + IT",
      "Dukungan prioritas",
    ],
    priceEnv: "STRIPE_PRICE_PROFESSIONAL",
  },
  {
    id: "enterprise",
    name: "Enterprise",
    tagline: "Jaringan & RS besar dengan kebutuhan kustom dan SLA.",
    monthlyIdr: null,
    seats: null,
    features: [
      "Pengguna tak terbatas",
      "Seluruh modul + integrasi khusus",
      "Onboarding & SLA khusus",
      "Account manager khusus",
    ],
    priceEnv: "", // not self-serve — contact sales
  },
];

const BY_ID = new Map<string, Plan>(PLANS.map((p) => [p.id, p]));

export function planById(id: string): Plan | undefined {
  return BY_ID.get(id);
}
