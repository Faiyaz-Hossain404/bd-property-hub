import { Controller, Get, UseGuards } from '@nestjs/common';
import type { AdminStats } from '@bdph/types';
import { SessionAuthGuard } from '../auth/session-auth.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { RolesGuard } from '../common/guards/roles.guard';
import { AdminStatsService } from './admin-stats.service';

// Analytics dashboard data (FR-A3, dashboard.view_analytics). Read-only aggregate
// counts; both staff roles that hold the permission (admin, super_admin) may read
// it. Class-level @Roles is enforced by RolesGuard (reads class metadata too).
@Controller('admin/stats')
@UseGuards(SessionAuthGuard, RolesGuard)
@Roles('admin', 'super_admin')
export class AdminStatsController {
  constructor(private readonly stats: AdminStatsService) {}

  @Get()
  getStats(): Promise<AdminStats> {
    return this.stats.getStats();
  }
}
