/**
 * SATUSEHAT (Kemenkes) FHIR R4 client — OAuth2 client-credentials token + POST
 * of FHIR resources to the national platform. Env-gated: when SATUSEHAT_* creds
 * are unset it returns a deterministic MOCK (log-fallback) so the flow is
 * demonstrable; when set it authenticates and posts for real. No SDK (fetch).
 *
 * Env: SATUSEHAT_BASE_URL, SATUSEHAT_AUTH_URL, SATUSEHAT_CLIENT_ID,
 *      SATUSEHAT_CLIENT_SECRET.
 */
interface SatusehatEnv {
  baseUrl: string;
  authUrl: string;
  clientId: string;
  clientSecret: string;
}

function readEnv(): SatusehatEnv | null {
  const baseUrl = process.env.SATUSEHAT_BASE_URL;
  const authUrl = process.env.SATUSEHAT_AUTH_URL;
  const clientId = process.env.SATUSEHAT_CLIENT_ID;
  const clientSecret = process.env.SATUSEHAT_CLIENT_SECRET;
  if (!baseUrl || !authUrl || !clientId || !clientSecret) return null;
  return { baseUrl, authUrl, clientId, clientSecret };
}

async function token(env: SatusehatEnv): Promise<string> {
  const res = await fetch(`${env.authUrl}/oauth2/v1/accesstoken?grant_type=client_credentials`, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({ client_id: env.clientId, client_secret: env.clientSecret }),
  });
  const body = (await res.json()) as { access_token?: string };
  if (!body.access_token) throw new Error("SATUSEHAT auth failed");
  return body.access_token;
}

export interface SatusehatResult {
  resourceType: string;
  fhirId: string;
  status: "sent" | "failed";
  mock: boolean;
  error?: string;
}

/** POST one FHIR resource. Mock returns a deterministic id when env is unset. */
export async function postResource(resource: { resourceType: string } & Record<string, unknown>): Promise<SatusehatResult> {
  const env = readEnv();
  const rt = resource.resourceType;
  if (!env) {
    const fhirId = `mock-${rt.toLowerCase()}-${Math.floor(Date.now() / 1000).toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
    console.log(`[satusehat:mock] POST ${rt} -> ${fhirId} (SATUSEHAT_* unset)`);
    return { resourceType: rt, fhirId, status: "sent", mock: true };
  }
  try {
    const accessToken = await token(env);
    const res = await fetch(`${env.baseUrl}/${rt}`, {
      method: "POST",
      headers: { Authorization: `Bearer ${accessToken}`, "Content-Type": "application/json" },
      body: JSON.stringify(resource),
    });
    const data = (await res.json()) as { id?: string; issue?: unknown };
    if (!res.ok || !data?.id) {
      return { resourceType: rt, fhirId: "", status: "failed", mock: false, error: JSON.stringify(data?.issue ?? data) };
    }
    return { resourceType: rt, fhirId: data.id, status: "sent", mock: false };
  } catch (e) {
    return { resourceType: rt, fhirId: "", status: "failed", mock: false, error: String(e) };
  }
}
