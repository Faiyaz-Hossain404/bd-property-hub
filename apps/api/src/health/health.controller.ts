import { Controller, Get, HttpStatus, Res } from '@nestjs/common';
import { SkipThrottle } from '@nestjs/throttler';
import type { Response } from 'express';
import { HealthService, type HealthReport } from './health.service';

// Exempt from the global rate limit: uptime monitors and load-balancer probes
// hit this frequently and must never be throttled.
@SkipThrottle()
@Controller('health')
export class HealthController {
  constructor(private readonly health: HealthService) {}

  @Get()
  async check(@Res({ passthrough: true }) response: Response): Promise<HealthReport> {
    const report = await this.health.check();

    // 503 rather than 200 when the database is unreachable, so load balancers
    // and uptime monitors pull this instance out of rotation instead of reading
    // a degraded body behind a 200 as healthy. `passthrough` sets the status
    // while leaving Nest to serialise the body through the usual envelope.
    response.status(report.status === 'ok' ? HttpStatus.OK : HttpStatus.SERVICE_UNAVAILABLE);

    return report;
  }
}
