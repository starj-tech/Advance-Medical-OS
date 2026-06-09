/**
 * BPJS Kesehatan VClaim client (peserta eligibility + SEP issuance).
 *
 * Env-gated like the other integrations: when BPJS_* creds are unset it returns
 * a deterministic MOCK so the flow is demonstrable in dev/preview; when set it
 * calls the real VClaim API with the official signature scheme. Uses node:crypto
 * only (no SDK).
 *
 * Real VClaim signature: X-signature = base64(HMAC-SHA256(consId&timestamp, key));
 * responses are AES-256-CBC encrypted with key=sha256hex(consId+key+timestamp).
 */
import { createHmac, createHash, createDecipheriv } from "node:crypto";

interface BpjsEnv {
  baseUrl: string;
  consId: string;
  secretKey: string;
  userKey: string;
}

function readEnv(): BpjsEnv | null {
  const baseUrl = process.env.BPJS_VCLAIM_BASE_URL;
  const consId = process.env.BPJS_CONS_ID;
  const secretKey = process.env.BPJS_SECRET_KEY;
  const userKey = process.env.BPJS_USER_KEY;
  if (!baseUrl || !consId || !secretKey || !userKey) return null;
  return { baseUrl, consId, secretKey, userKey };
}

function signature(env: BpjsEnv): { timestamp: string; signature: string } {
  const timestamp = String(Math.floor(Date.now() / 1000));
  const sig = createHmac("sha256", env.secretKey)
    .update(`${env.consId}&${timestamp}`)
    .digest("base64");
  return { timestamp, signature: sig };
}

/** Decrypt a VClaim response body (AES-256-CBC, key derived per request). */
function decryptResponse(env: BpjsEnv, timestamp: string, encrypted: string): unknown {
  const keyHex = createHash("sha256")
    .update(env.consId + env.secretKey + timestamp)
    .digest("hex");
  const key = Buffer.from(keyHex.slice(0, 32));
  const iv = Buffer.from(keyHex.slice(0, 16));
  const decipher = createDecipheriv("aes-256-cbc", key, iv);
  let out = decipher.update(encrypted, "base64", "utf8");
  out += decipher.final("utf8");
  return JSON.parse(out);
}

async function vclaimGet(env: BpjsEnv, path: string): Promise<unknown> {
  const { timestamp, signature: sig } = signature(env);
  const res = await fetch(`${env.baseUrl}${path}`, {
    headers: {
      "X-cons-id": env.consId,
      "X-timestamp": timestamp,
      "X-signature": sig,
      user_key: env.userKey,
      "Content-Type": "application/json; charset=utf-8",
    },
  });
  const body = (await res.json()) as { response?: string };
  return typeof body?.response === "string" ? decryptResponse(env, timestamp, body.response) : body;
}

export interface PesertaInfo {
  noKartu: string;
  nama: string;
  kelas: string;
  status: string;
  mock: boolean;
}

export async function checkPeserta(noKartu: string, tglSep: string): Promise<PesertaInfo> {
  const env = readEnv();
  if (!env) {
    console.log(`[bpjs:mock] checkPeserta no=${noKartu} tgl=${tglSep} (BPJS_* unset)`);
    return { noKartu, nama: "PESERTA UJI (mock)", kelas: "Kelas 2", status: "AKTIF", mock: true };
  }
  const data = (await vclaimGet(env, `/Peserta/nokartu/${noKartu}/tglSEP/${tglSep}`)) as {
    peserta?: { nama?: string; hakKelas?: { keterangan?: string }; statusPeserta?: { keterangan?: string } };
  };
  const p = data?.peserta;
  return {
    noKartu,
    nama: p?.nama ?? "-",
    kelas: p?.hakKelas?.keterangan ?? "-",
    status: p?.statusPeserta?.keterangan ?? "-",
    mock: false,
  };
}

export interface SepResult {
  sepNumber: string;
  mock: boolean;
}

/** Issue a SEP. In mock mode returns a deterministic SEP number. */
export async function issueSep(input: {
  noKartu: string;
  tglSep: string;
  diagnosis: string;
  poli: string;
}): Promise<SepResult> {
  const env = readEnv();
  if (!env) {
    const seq = String(Math.floor(Date.now() / 1000)).slice(-7);
    const sepNumber = `MOCK${new Date().getFullYear()}${seq}`;
    console.log(`[bpjs:mock] issueSep no=${input.noKartu} dx=${input.diagnosis} -> ${sepNumber}`);
    return { sepNumber, mock: true };
  }
  const { timestamp, signature: sig } = signature(env);
  const res = await fetch(`${env.baseUrl}/SEP/2.0/insert`, {
    method: "POST",
    headers: {
      "X-cons-id": env.consId,
      "X-timestamp": timestamp,
      "X-signature": sig,
      user_key: env.userKey,
      "Content-Type": "application/json; charset=utf-8",
    },
    body: JSON.stringify({ request: { t_sep: input } }),
  });
  const body = (await res.json()) as { response?: string };
  const data = (typeof body?.response === "string"
    ? decryptResponse(env, timestamp, body.response)
    : body) as { sep?: { noSep?: string } };
  return { sepNumber: data?.sep?.noSep ?? "", mock: false };
}
