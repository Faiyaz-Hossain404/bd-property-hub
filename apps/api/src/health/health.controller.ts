import { Controller, Get } from '@nestjs/common';
import { SkipThrottle } from '@nestjs/throttler';
import { HealthService, type HealthReport } from './health.service';

// Exempt from the global rate limit: uptime monitors and load-balancer probes
// hit this frequently and must never be throttled.
@SkipThrottle()
@Controller('health')
export class HealthController {
  constructor(private readonly health: HealthService) {}

  @Get()
  check(): HealthReport {
    return this.health.check();
  }
}
