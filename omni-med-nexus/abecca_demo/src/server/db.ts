/**
 * Server content source for the Abecca Demo BFF.
 *
 * The demo app is a guided tour of the platform; its "data" is the showcase
 * capabilities, training scenarios and sandbox metadata. These are served over
 * real HTTP endpoints (mirroring the other apps' BFF shape). Learner step
 * progress is intentionally NOT here — it is per-device and lives in the
 * browser's localStorage.
 */

import type { Capability, Scenario } from "@/lib/data";
import { capabilities, sandboxInfo, scenarios } from "@/lib/data";

export function getCapabilities(): Capability[] {
  return capabilities;
}
export function getScenarios(): Scenario[] {
  return scenarios;
}
export function getSandboxInfo(): typeof sandboxInfo {
  return sandboxInfo;
}
