/**
 * Server-side audit chain — a faithful TypeScript port of the Rust core engine
 * (core_engine/src/blockchain/{block,audit_trail}.rs).
 *
 * The hash is SHA-256 over exactly the same fields, in the same order, as
 * `Block::calculate_hash`:  index | timestamp | patient_id | action |
 * doctor_id | previous_hash. Because the encoding matches, blocks produced here
 * are verifiable against — and interchangeable with — blocks the Rust engine
 * produces. Genesis mirrors `create_genesis_block` (SYSTEM / SYSTEM_INIT /
 * SYSTEM_ADMIN / "0").
 */

import { createHash } from "node:crypto";
import type { AuditAction, AuditBlock } from "@/lib/types";

export function sha256Hex(input: string): string {
  return createHash("sha256").update(input).digest("hex");
}

type BlockSeed = Omit<AuditBlock, "hash">;

function hashOf(b: BlockSeed): string {
  return sha256Hex(
    `${b.index}${b.timestamp}${b.patientId}${b.action}${b.doctorId}${b.previousHash}`,
  );
}

// Fixed genesis timestamp so the chain is deterministic across restarts.
const GENESIS_TS = Math.floor(Date.UTC(2026, 4, 25, 0, 0, 0) / 1000);

export function genesisBlock(): AuditBlock {
  const seed: BlockSeed = {
    index: 0,
    timestamp: GENESIS_TS,
    patientId: "SYSTEM",
    action: "SYSTEM_INIT",
    doctorId: "SYSTEM_ADMIN",
    previousHash: "0",
  };
  return { ...seed, hash: hashOf(seed) };
}

/** Append-shape: mirrors `Blockchain::add_audit_record`. */
export function makeBlock(
  previous: AuditBlock,
  patientId: string,
  action: AuditAction,
  doctorId: string,
  timestamp = Math.floor(Date.now() / 1000),
): AuditBlock {
  const seed: BlockSeed = {
    index: previous.index + 1,
    timestamp,
    patientId,
    action,
    doctorId,
    previousHash: previous.hash,
  };
  return { ...seed, hash: hashOf(seed) };
}

/** Re-implements `Blockchain::is_chain_valid`. */
export function isChainValid(chain: AuditBlock[]): boolean {
  for (let i = 1; i < chain.length; i++) {
    const current = chain[i];
    const previous = chain[i - 1];
    if (current.hash !== hashOf(current)) return false;
    if (current.previousHash !== previous.hash) return false;
  }
  return true;
}
