import { escapeRegExp } from './listing-search.util';

// Guards the catalog title search (DISC-8): user query text must become a literal
// pattern, never live regex. A regression here would reopen regex injection / ReDoS.
describe('escapeRegExp', () => {
  it('leaves plain alphanumeric text unchanged', () => {
    expect(escapeRegExp('Gulshan apartment 3')).toBe('Gulshan apartment 3');
  });

  it('escapes every regex metacharacter', () => {
    expect(escapeRegExp('.*+?^${}()|[]\\')).toBe('\\.\\*\\+\\?\\^\\$\\{\\}\\(\\)\\|\\[\\]\\\\');
  });

  it('escapes a value so it matches literally, not as a pattern', () => {
    const pattern = new RegExp(escapeRegExp('a.c'), 'i');
    expect(pattern.test('a.c')).toBe(true);
    // Without escaping, "a.c" would match "abc" because "." is any-char.
    expect(pattern.test('abc')).toBe(false);
  });

  it('keeps parentheses and hyphens in a realistic title literal', () => {
    const pattern = new RegExp(escapeRegExp('3-bed (Gulshan)'), 'i');
    expect(pattern.test('Lovely 3-BED (gulshan) flat')).toBe(true);
  });
});
