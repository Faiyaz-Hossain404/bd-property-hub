import { Connection } from 'mongoose';
import { HealthService } from './health.service';

// A connection stub whose ping resolves, rejects, or never settles.
function connectionWith(
  readyState: number,
  ping?: () => Promise<unknown>,
): Connection {
  return {
    readyState,
    db: ping ? { admin: () => ({ ping }) } : undefined,
  } as unknown as Connection;
}

describe('HealthService', () => {
  it('reports ok when the database answers a ping', async () => {
    const service = new HealthService(connectionWith(1, () => Promise.resolve({ ok: 1 })));

    const report = await service.check();

    expect(report.status).toBe('ok');
    expect(report.db).toBe('connected');
    expect(report.mongo).toBe('connected');
  });

  it('reports degraded when the connection is down', async () => {
    const service = new HealthService(connectionWith(0));

    const report = await service.check();

    expect(report.status).toBe('degraded');
    expect(report.db).toBe('disconnected');
    expect(report.mongo).toBe('disconnected');
  });

  it('reports degraded instead of throwing when the ping fails', async () => {
    const service = new HealthService(
      connectionWith(1, () => Promise.reject(new Error('connection timed out'))),
    );

    const report = await service.check();

    expect(report.status).toBe('degraded');
    expect(report.db).toBe('disconnected');
  });

  it('reports degraded when readyState claims connected but the ping never answers', async () => {
    // The dangerous case: the socket is open, so readyState says 'connected',
    // but the server has stopped responding. Without the timeout the health
    // check would hang and a monitor would keep the instance in rotation.
    jest.useFakeTimers();
    const service = new HealthService(connectionWith(1, () => new Promise(() => undefined)));

    const pending = service.check();
    await jest.advanceTimersByTimeAsync(2_000);
    const report = await pending;

    expect(report.status).toBe('degraded');
    expect(report.db).toBe('disconnected');
    expect(report.mongo).toBe('connected');
    jest.useRealTimers();
  });

  it('does not leak database error details into the report', async () => {
    const service = new HealthService(
      connectionWith(1, () =>
        Promise.reject(new Error('failed to connect to mongodb+srv://admin:hunter2@cluster0')),
      ),
    );

    const report = await service.check();

    expect(JSON.stringify(report)).not.toContain('hunter2');
  });
});
