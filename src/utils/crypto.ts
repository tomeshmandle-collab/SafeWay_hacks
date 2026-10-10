// Cryptographic hash utility for tamper-evident audit ledger

export async function sha256(message: string): Promise<string> {
  const msgUint8 = new TextEncoder().encode(message);
  const hashBuffer = await crypto.subtle.digest('SHA-256', msgUint8);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

export async function computeBlockHash(
  index: number,
  timestamp: string,
  action: string,
  actor: string,
  actor_role: string,
  payload_summary: string,
  prev_hash: string
): Promise<string> {
  const rawString = `${index}|${timestamp}|${action}|${actor}|${actor_role}|${payload_summary}|${prev_hash}`;
  return sha256(rawString);
}
