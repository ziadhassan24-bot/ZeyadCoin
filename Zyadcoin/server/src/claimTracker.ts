// ============================================================================
// In-memory tracker for addresses that have already claimed ZYD from the faucet.
//
// A Map<string, number> where the key is the lowercased wallet address and the
// value is the timestamp (Date.now()) when the claim was issued. This prevents
// one address from claiming multiple times.
//
// LIMITATION: This resets when the server restarts (a deployed server on Render
// will lose this data if it sleeps/redeploys). For a production system, persist
// claims in a database.
// ============================================================================

const claimedAddresses = new Map<string, number>();

/**
 * Records that the given address has successfully claimed. Normalizes the
 * address to lowercase before storing so case variations don't bypass the cap.
 */
export function markClaimed(address: string): void {
  const normalized = address.toLowerCase();
  claimedAddresses.set(normalized, Date.now());
}

/**
 * Returns true if the address has already claimed. Normalizes to lowercase.
 */
export function hasClaimed(address: string): boolean {
  const normalized = address.toLowerCase();
  return claimedAddresses.has(normalized);
}

/**
 * Returns the total number of addresses that have claimed (useful for debugging).
 */
export function getClaimCount(): number {
  return claimedAddresses.size;
}
