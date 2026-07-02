// Escapes a user-supplied string so it can be embedded in a RegExp as a literal —
// every regex metacharacter is backslash-escaped. The public catalog search
// (DISC-8) builds a case-insensitive title match from raw query text, so this is
// what keeps a value like "3-bed (Gulshan)" or ".*" from being interpreted as a
// pattern (no regex injection / ReDoS via attacker-controlled syntax).
export function escapeRegExp(input: string): string {
  return input.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}
