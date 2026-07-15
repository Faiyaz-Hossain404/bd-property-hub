import request from 'supertest';
import { ADMIN_TRENDS_WINDOW_DAYS, type AdminStats } from '@bdph/types';
import {
  API,
  createApprovedListing,
  createVerifiedSeller,
  registerUser,
  resetData,
  startTestApp,
  stopTestApp,
  type TestContext,
} from './utils/test-app';

// GET /admin/stats — the analytics dashboard feed (FR-A3). Two things matter:
// it is role-gated (admin/super_admin only), and the aggregate counts reflect
// real data.
describe('Admin stats (e2e)', () => {
  let ctx: TestContext;

  beforeAll(async () => {
    ctx = await startTestApp();
  });

  afterAll(async () => {
    await stopTestApp(ctx);
  });

  beforeEach(async () => {
    await resetData(ctx);
  });

  it('requires authentication', async () => {
    await request(ctx.server).get(`${API}/admin/stats`).expect(401);
  });

  it('forbids non-staff users', async () => {
    const buyer = await registerUser(ctx); // default role: buyer
    await buyer.agent.get(`${API}/admin/stats`).expect(403);
  });

  it('returns aggregate counts and a gapless 30-day trend to an admin', async () => {
    const admin = await registerUser(ctx, ['admin']);
    const seller = await createVerifiedSeller(ctx, admin);
    await createApprovedListing(ctx, seller, admin);

    const res = await admin.agent.get(`${API}/admin/stats`).expect(200);
    const stats = res.body.data as AdminStats;

    // At least the admin + seller exist; one approved listing exists.
    expect(stats.totals.users).toBeGreaterThanOrEqual(2);
    expect(stats.totals.listings).toBeGreaterThanOrEqual(1);
    expect(stats.totals.approvedListings).toBeGreaterThanOrEqual(1);

    // Breakdowns are zero-filled against the enums, so every known key appears.
    const approved = stats.listingsByStatus.find((b) => b.key === 'approved');
    expect(approved?.count).toBeGreaterThanOrEqual(1);
    const sellers = stats.usersByRole.find((b) => b.key === 'seller');
    expect(sellers?.count).toBeGreaterThanOrEqual(1);

    // Both trends span exactly the window, oldest → newest, and today has activity.
    expect(stats.signupsTrend).toHaveLength(ADMIN_TRENDS_WINDOW_DAYS);
    expect(stats.listingsTrend).toHaveLength(ADMIN_TRENDS_WINDOW_DAYS);
    const totalNewSignups = stats.signupsTrend.reduce((sum, p) => sum + p.count, 0);
    expect(totalNewSignups).toBeGreaterThanOrEqual(2);
  });
});
