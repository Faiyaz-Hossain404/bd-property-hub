import { Connection } from 'mongoose';
import { HealthService } from './health.service';

describe('HealthService', () => {
  it('reports ok when mongo is connected', () => {
    const service = new HealthService({ readyState: 1 } as Connection);

    const report = service.check();

    expect(report.status).toBe('ok');
    expect(report.mongo).toBe('connected');
  });

  it('reports degraded when mongo is disconnected', () => {
    const service = new HealthService({ readyState: 0 } as Connection);

    const report = service.check();

    expect(report.status).toBe('degraded');
    expect(report.mongo).toBe('disconnected');
  });
});
