/**
 * Per-tenant API keys for the public API. A key is shown once at creation; only
 * its sha256 hash and a display prefix are stored, so a DB leak can't recover it.
 * Verification resolves the key to its tenant (company_id) for Bearer-authenticated
 * public requests. Tenant-scoped; env-gated (Supabase or in-memory).
 */
import { createHash, randomBytes, timingSafeEqual } from "node:crypto";
import { getSupabase } from "../supabase";

function hash(value: string): string {
  return createHash("sha256").update(value).digest("hex");
}
function hashesEqual(a: string, b: string): boolean {
  const ab = Buffer.from(a);
  const bb = Buffer.from(b);
  return ab.length === bb.length && timingSafeEqual(ab, bb);
}

/** A key is `abk_<random>`; the prefix shown in the UI never reveals the secret. */
function generateApiKey(): { key: string; prefix: string } {
  const key = `abk_${randomBytes(24).toString("base64url")}`;
  return { key, prefix: `${key.slice(0, 11)}…` };
}

/** What the management UI sees — never the hash. */
export interface ApiKeyView {
  id: string;
  companyId: string;
  label: string;
  keyPrefix: string;
  createdBy: string | null;
  createdAt: string;
  lastUsedAt: string | null;
  revokedAt: string | null;
}

interface ApiKeyRow {
  id: string;
  company_id: string;
  label: string;
  key_prefix: string;
  key_hash: string;
  created_by: string | null;
  created_at: string;
  last_used_at: string | null;
  revoked_at: string | null;
}
const toView = (r: ApiKeyRow): ApiKeyView => ({
  id: r.id, companyId: r.company_id, label: r.label, keyPrefix: r.key_prefix,
  createdBy: r.created_by, createdAt: r.created_at, lastUsedAt: r.last_used_at, revokedAt: r.revoked_at,
});

const g = globalThis as unknown as { __abeccaApiKeys?: ApiKeyRow[] };
const mem = g.__abeccaApiKeys ?? (g.__abeccaApiKeys = []);

/** Issue a key for a tenant. Returns the plaintext ONCE plus the stored view. */
export async function issueApiKey(
  companyId: string,
  label: string,
  createdBy: string | null,
): Promise<{ key: string; view: ApiKeyView }> {
  const { key, prefix } = generateApiKey();
  const keyHash = hash(key);
  const sb = getSupabase();
  if (sb) {
    const { data, error } = await sb
      .from("api_keys")
      .insert({ company_id: companyId, label, key_prefix: prefix, key_hash: keyHash, created_by: createdBy })
      .select("*")
      .single();
    if (error || !data) throw new Error(error?.message ?? "issue api key failed");
    return { key, view: toView(data as ApiKeyRow) };
  }
  const row: ApiKeyRow = {
    id: crypto.randomUUID(), company_id: companyId, label, key_prefix: prefix, key_hash: keyHash,
    created_by: createdBy, created_at: new Date().toISOString(), last_used_at: null, revoked_at: null,
  };
  mem.push(row);
  return { key, view: toView(row) };
}

export async function listApiKeys(companyId: string): Promise<ApiKeyView[]> {
  const sb = getSupabase();
  if (sb) {
    const { data } = await sb
      .from("api_keys").select("*").eq("company_id", companyId).order("created_at", { ascending: false });
    return (data ?? []).map((r) => toView(r as ApiKeyRow));
  }
  return mem
    .filter((r) => r.company_id === companyId)
    .sort((a, b) => b.created_at.localeCompare(a.created_at))
    .map(toView);
}

export async function revokeApiKey(companyId: string, id: string): Promise<boolean> {
  const now = new Date().toISOString();
  const sb = getSupabase();
  if (sb) {
    const { data } = await sb
      .from("api_keys").update({ revoked_at: now }).eq("company_id", companyId).eq("id", id).is("revoked_at", null)
      .select("id").maybeSingle();
    return !!data;
  }
  const row = mem.find((r) => r.company_id === companyId && r.id === id && !r.revoked_at);
  if (!row) return false;
  row.revoked_at = now;
  return true;
}

/** Resolve a raw Bearer key to its tenant. Only active (non-revoked) keys pass. */
export async function verifyApiKey(rawKey: string): Promise<{ companyId: string; keyId: string } | undefined> {
  if (!rawKey.startsWith("abk_")) return undefined;
  const keyHash = hash(rawKey);
  const now = new Date().toISOString();
  const sb = getSupabase();
  if (sb) {
    const { data } = await sb
      .from("api_keys").select("*").eq("key_hash", keyHash).is("revoked_at", null).maybeSingle();
    if (!data) return undefined;
    await sb.from("api_keys").update({ last_used_at: now }).eq("id", (data as ApiKeyRow).id);
    return { companyId: (data as ApiKeyRow).company_id, keyId: (data as ApiKeyRow).id };
  }
  const row = mem.find((r) => !r.revoked_at && hashesEqual(keyHash, r.key_hash));
  if (!row) return undefined;
  row.last_used_at = now;
  return { companyId: row.company_id, keyId: row.id };
}
