import { LISTING_PUBLICATION_STATUSES, type ListingPublicationStatus } from '@bdph/types';
import { canReinstateFrom, canTakeDownFrom, isStaffLocked } from './listing-moderation';

// Pure state-machine rules behind staff moderation (MOD-3). The controller and
// service both lean on these, so pin exactly which statuses each action applies
// to — and drive the cases off LISTING_PUBLICATION_STATUSES so a new status added
// later is forced through these expectations rather than silently slipping past.
describe('listing moderation transition rules', () => {
  const allStatuses = LISTING_PUBLICATION_STATUSES;

  it('covers every publication status (guards against an unhandled new state)', () => {
    expect(allStatuses).toEqual([
      'draft',
      'pending_review',
      'approved',
      'rejected',
      'archived',
      'removed',
    ]);
  });

  describe('canTakeDownFrom', () => {
    it('allows a takedown only from the live (approved) state', () => {
      expect(canTakeDownFrom('approved')).toBe(true);
    });

    it('rejects a takedown from any non-live state', () => {
      const others = allStatuses.filter((status) => status !== 'approved');
      for (const status of others) {
        expect(canTakeDownFrom(status)).toBe(false);
      }
    });
  });

  describe('canReinstateFrom', () => {
    it('allows a reinstate only from the removed state', () => {
      expect(canReinstateFrom('removed')).toBe(true);
    });

    it('rejects a reinstate from any other state', () => {
      const others = allStatuses.filter((status) => status !== 'removed');
      for (const status of others) {
        expect(canReinstateFrom(status)).toBe(false);
      }
    });
  });

  describe('isStaffLocked', () => {
    it('locks a removed listing against owner changes', () => {
      expect(isStaffLocked('removed')).toBe(true);
    });

    it('leaves every other state unlocked for the owner', () => {
      const others = allStatuses.filter((status) => status !== 'removed');
      for (const status of others) {
        expect(isStaffLocked(status)).toBe(false);
      }
    });
  });

  it('takedown and reinstate are inverses (approved ⇄ removed)', () => {
    // A takedown source can be reinstated back to, and vice versa: exactly the two
    // states in the enforcement loop, nothing else.
    const takedownSources = allStatuses.filter((s: ListingPublicationStatus) => canTakeDownFrom(s));
    const reinstateSources = allStatuses.filter((s: ListingPublicationStatus) => canReinstateFrom(s));
    expect(takedownSources).toEqual(['approved']);
    expect(reinstateSources).toEqual(['removed']);
  });
});
