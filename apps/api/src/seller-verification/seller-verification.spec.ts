import { SELLER_KYC_STATUSES, canSubmitListings, type SellerKycStatus } from '@bdph/types';
import { canRequestVerificationFrom, canReviewVerificationFrom } from './seller-verification';

// Pure state-machine rules behind the seller verification gate (FR-S8). The
// service, controllers, and the listing submit gate all lean on these, so pin
// exactly which statuses each action applies to — and drive the cases off
// SELLER_KYC_STATUSES so a new status added later is forced through here.
describe('seller verification transition rules', () => {
  const allStatuses = SELLER_KYC_STATUSES;

  it('covers every KYC status (guards against an unhandled new state)', () => {
    expect(allStatuses).toEqual(['unverified', 'pending', 'verified', 'rejected']);
  });

  describe('canRequestVerificationFrom (seller applies)', () => {
    it('allows a request from unverified or after a rejection', () => {
      expect(canRequestVerificationFrom('unverified')).toBe(true);
      expect(canRequestVerificationFrom('rejected')).toBe(true);
    });

    it('blocks a request while pending or already verified', () => {
      expect(canRequestVerificationFrom('pending')).toBe(false);
      expect(canRequestVerificationFrom('verified')).toBe(false);
    });
  });

  describe('canReviewVerificationFrom (admin decides)', () => {
    it('allows a decision only on a pending request', () => {
      expect(canReviewVerificationFrom('pending')).toBe(true);
    });

    it('rejects a decision on any non-pending status', () => {
      for (const status of allStatuses.filter((s) => s !== 'pending')) {
        expect(canReviewVerificationFrom(status)).toBe(false);
      }
    });
  });

  describe('canSubmitListings (the gate)', () => {
    it('permits submitting listings only once verified', () => {
      expect(canSubmitListings('verified')).toBe(true);
    });

    it('blocks submitting from every other status', () => {
      for (const status of allStatuses.filter((s) => s !== 'verified')) {
        expect(canSubmitListings(status)).toBe(false);
      }
    });
  });

  it('request and review sources are disjoint (no status is both)', () => {
    // A seller-driven request and an admin-driven decision never apply to the same
    // status, so the two actors can't act on the same record at the same time.
    const requestable = allStatuses.filter((s: SellerKycStatus) => canRequestVerificationFrom(s));
    const reviewable = allStatuses.filter((s: SellerKycStatus) => canReviewVerificationFrom(s));
    expect(requestable).toEqual(['unverified', 'rejected']);
    expect(reviewable).toEqual(['pending']);
    expect(requestable.some((s) => reviewable.includes(s))).toBe(false);
  });
});
