// Generates a stable ID for a Maps business card.
// Key: lowercase(name + address) — consistent across sessions and searches.
// Uses SubtleCrypto SHA-1, returns first 12 hex chars (collision-safe for this scale).

export async function leadId(name: string, address: string): Promise<string> {
  const raw = `${name.toLowerCase().trim()}|${address.toLowerCase().trim()}`
  const buf = await crypto.subtle.digest('SHA-1', new TextEncoder().encode(raw))
  return Array.from(new Uint8Array(buf)).map(b => b.toString(16).padStart(2, '0')).join('').slice(0, 12)
}
