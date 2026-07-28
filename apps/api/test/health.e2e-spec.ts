import request from 'supertest';
import { API, startTestApp, stopTestApp, type TestContext } from './utils/test-app';

// End-to-end coverage of the health contract that load balancers and uptime
// monitors depend on: 200 while the database answers, 503 once it stops, and a
// body that degrades rather than an endpoint that throws.
describe('Health (e2e)', () => {
  let ctx: TestContext;

  beforeAll(async () => {
    ctx = await startTestApp();
  });

  afterAll(async () => {
    await stopTestApp(ctx);
  });

  it('answers 200 with a connected database', async () => {
    const response = await request(ctx.server).get(`${API}/health`).expect(200);

    expect(response.body.data).toMatchObject({ status: 'ok', db: 'connected' });
    expect(response.body.data.uptime).toEqual(expect.any(Number));
  });

  // Must run last: it takes the database away for good.
  it('answers 503 with a degraded body once the database is gone', async () => {
    await ctx.connection.close();

    const response = await request(ctx.server).get(`${API}/health`).expect(503);

    expect(response.body.data).toMatchObject({ status: 'degraded', db: 'disconnected' });
  });
});
