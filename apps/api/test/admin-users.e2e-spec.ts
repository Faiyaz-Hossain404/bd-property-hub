import request from 'supertest';
import type { ApiPage, PublicUser } from '@bdph/types';
import {
  API,
  registerUser,
  resetData,
  startTestApp,
  stopTestApp,
  type TestContext,
} from './utils/test-app';

// Admin user management (FR-A1 / user.suspend / staff.assign_role). Covers the
// role gate, the per-target privilege rules, and — critically — that a suspend
// actually revokes access (session + login), not just flips a flag.
describe('Admin user management (e2e)', () => {
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

  describe('list', () => {
    it('lists users for an admin and forbids non-staff', async () => {
      const admin = await registerUser(ctx, ['admin']);
      const buyer = await registerUser(ctx);

      const res = await admin.agent.get(`${API}/admin/users`).expect(200);
      const page = res.body as ApiPage<PublicUser>;
      const ids = page.data.map((u) => u.id);
      expect(ids).toContain(admin.user.id);
      expect(ids).toContain(buyer.user.id);

      await buyer.agent.get(`${API}/admin/users`).expect(403);
    });

    it('filters by role and searches by email', async () => {
      const admin = await registerUser(ctx, ['admin']);
      const seller = await registerUser(ctx, ['seller']);

      const byRole = await admin.agent.get(`${API}/admin/users?role=seller`).expect(200);
      const roleIds = (byRole.body as ApiPage<PublicUser>).data.map((u) => u.id);
      expect(roleIds).toContain(seller.user.id);
      expect(roleIds).not.toContain(admin.user.id);

      const byEmail = await admin.agent
        .get(`${API}/admin/users?q=${encodeURIComponent(seller.user.email)}`)
        .expect(200);
      const emailIds = (byEmail.body as ApiPage<PublicUser>).data.map((u) => u.id);
      expect(emailIds).toEqual([seller.user.id]);
    });
  });

  describe('suspend / reactivate', () => {
    it('suspends an account and revokes its access immediately', async () => {
      const admin = await registerUser(ctx, ['admin']);
      const buyer = await registerUser(ctx);

      // Before: the buyer's session works.
      await buyer.agent.get(`${API}/auth/me`).expect(200);

      const suspended = await admin.agent
        .patch(`${API}/admin/users/${buyer.user.id}/status`)
        .send({ status: 'suspended' })
        .expect(200);
      expect((suspended.body.data as PublicUser).status).toBe('suspended');

      // After: the existing session is dead, and a fresh login is refused.
      await buyer.agent.get(`${API}/auth/me`).expect(401);
      await request(ctx.server)
        .post(`${API}/auth/login`)
        .send({ email: buyer.user.email, password: 'password123' })
        .expect(401);
    });

    it('reactivates a suspended account so it can sign in again', async () => {
      const admin = await registerUser(ctx, ['admin']);
      const buyer = await registerUser(ctx);
      await admin.agent
        .patch(`${API}/admin/users/${buyer.user.id}/status`)
        .send({ status: 'suspended' })
        .expect(200);

      await admin.agent
        .patch(`${API}/admin/users/${buyer.user.id}/status`)
        .send({ status: 'active' })
        .expect(200);

      await request(ctx.server)
        .post(`${API}/auth/login`)
        .send({ email: buyer.user.email, password: 'password123' })
        .expect(200);
    });

    it('refuses to let an admin suspend themselves', async () => {
      const admin = await registerUser(ctx, ['admin']);
      await admin.agent
        .patch(`${API}/admin/users/${admin.user.id}/status`)
        .send({ status: 'suspended' })
        .expect(403);
    });

    it('stops an admin from suspending a staff account, but lets a super admin', async () => {
      const admin = await registerUser(ctx, ['admin']);
      const otherAdmin = await registerUser(ctx, ['admin']);
      const superAdmin = await registerUser(ctx, ['super_admin']);

      await admin.agent
        .patch(`${API}/admin/users/${otherAdmin.user.id}/status`)
        .send({ status: 'suspended' })
        .expect(403);

      await superAdmin.agent
        .patch(`${API}/admin/users/${otherAdmin.user.id}/status`)
        .send({ status: 'suspended' })
        .expect(200);
    });

    it('rejects an unknown status', async () => {
      const admin = await registerUser(ctx, ['admin']);
      const buyer = await registerUser(ctx);
      await admin.agent
        .patch(`${API}/admin/users/${buyer.user.id}/status`)
        .send({ status: 'deleted' })
        .expect(400);
    });
  });

  describe('role assignment', () => {
    it('is super-admin only', async () => {
      const admin = await registerUser(ctx, ['admin']);
      const buyer = await registerUser(ctx);
      await admin.agent
        .patch(`${API}/admin/users/${buyer.user.id}/roles`)
        .send({ roles: ['seller'] })
        .expect(403);
    });

    it('lets a super admin replace an account’s roles', async () => {
      const superAdmin = await registerUser(ctx, ['super_admin']);
      const buyer = await registerUser(ctx);

      const res = await superAdmin.agent
        .patch(`${API}/admin/users/${buyer.user.id}/roles`)
        .send({ roles: ['buyer', 'seller'] })
        .expect(200);
      const roles = (res.body.data as PublicUser).roles;
      expect(roles).toEqual(expect.arrayContaining(['buyer', 'seller']));
      expect(roles).toHaveLength(2);
    });

    it('blocks a super admin from changing their own roles', async () => {
      const superAdmin = await registerUser(ctx, ['super_admin']);
      await superAdmin.agent
        .patch(`${API}/admin/users/${superAdmin.user.id}/roles`)
        .send({ roles: ['admin'] })
        .expect(403);
    });

    it('rejects an empty roles list', async () => {
      const superAdmin = await registerUser(ctx, ['super_admin']);
      const buyer = await registerUser(ctx);
      await superAdmin.agent
        .patch(`${API}/admin/users/${buyer.user.id}/roles`)
        .send({ roles: [] })
        .expect(400);
    });
  });
});
