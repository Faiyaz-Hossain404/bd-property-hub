import { createListingInputSchema, MAX_LISTING_VIDEO_LINKS } from '@bdph/types';
import { normalizeVideoLink } from './video-link';

// Pure tests for the video-link validator and the createListing `videoLinks` shape.
// These links are stored and later embedded for the public, so the security rules
// (https-only, host allowlist, no embedded credentials) are the highest-value
// behavior to lock down — a regression here is a stored-XSS / open-embed risk.
describe('normalizeVideoLink', () => {
  it('accepts a standard YouTube watch URL', () => {
    expect(normalizeVideoLink('https://www.youtube.com/watch?v=dQw4w9WgXcQ')).toEqual({
      url: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
      provider: 'youtube',
    });
  });

  it('accepts a youtu.be short link', () => {
    expect(normalizeVideoLink('https://youtu.be/dQw4w9WgXcQ')?.provider).toBe('youtube');
  });

  it('accepts a Vimeo URL', () => {
    expect(normalizeVideoLink('https://vimeo.com/123456789')?.provider).toBe('vimeo');
  });

  it('trims surrounding whitespace', () => {
    expect(normalizeVideoLink('  https://vimeo.com/1  ')?.url).toBe('https://vimeo.com/1');
  });

  it('rejects a javascript: URL', () => {
    expect(normalizeVideoLink('javascript:alert(1)')).toBeNull();
  });

  it('rejects a data: URL', () => {
    expect(normalizeVideoLink('data:text/html,<script>alert(1)</script>')).toBeNull();
  });

  it('rejects plain http (mixed-content)', () => {
    expect(normalizeVideoLink('http://www.youtube.com/watch?v=x')).toBeNull();
  });

  it('rejects an unknown host', () => {
    expect(normalizeVideoLink('https://evil.example.com/video')).toBeNull();
  });

  it('rejects a look-alike host that merely contains an allowed domain', () => {
    expect(normalizeVideoLink('https://youtube.com.evil.example.com/x')).toBeNull();
  });

  it('rejects credentials embedded in the URL', () => {
    expect(normalizeVideoLink('https://user:pass@youtube.com/watch?v=x')).toBeNull();
    // Classic "@" host-confusion spoof: real host is evil.example.com.
    expect(normalizeVideoLink('https://youtube.com@evil.example.com/x')).toBeNull();
  });

  it('rejects empty and non-URL input', () => {
    expect(normalizeVideoLink('')).toBeNull();
    expect(normalizeVideoLink('   ')).toBeNull();
    expect(normalizeVideoLink('not a url')).toBeNull();
  });

  it('rejects an over-long URL', () => {
    expect(normalizeVideoLink(`https://youtu.be/${'a'.repeat(3000)}`)).toBeNull();
  });
});

describe('createListingInputSchema videoLinks', () => {
  const base = { titleEn: 'Flat', assetType: 'apartment', transactionType: 'sale' } as const;

  it('accepts a listing with no videoLinks', () => {
    expect(createListingInputSchema.parse({ ...base }).videoLinks).toBeUndefined();
  });

  it('accepts an array of link strings (deep validation happens server-side)', () => {
    const parsed = createListingInputSchema.parse({
      ...base,
      videoLinks: ['https://youtu.be/a', 'https://vimeo.com/1'],
    });
    expect(parsed.videoLinks).toHaveLength(2);
  });

  it('rejects more than the per-listing cap', () => {
    const tooMany = Array.from(
      { length: MAX_LISTING_VIDEO_LINKS + 1 },
      () => 'https://youtu.be/a',
    );
    expect(() => createListingInputSchema.parse({ ...base, videoLinks: tooMany })).toThrow();
  });

  it('rejects an empty string entry on shape alone', () => {
    expect(() => createListingInputSchema.parse({ ...base, videoLinks: [''] })).toThrow();
  });
});
