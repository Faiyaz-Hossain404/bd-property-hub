import { Body, Controller, Get, Param, Patch, Query, UseGuards } from '@nestjs/common';
import {
  adminAssignRolesInputSchema,
  adminUpdateUserStatusInputSchema,
  adminUsersQuerySchema,
  type AdminAssignRolesInput,
  type AdminUpdateUserStatusInput,
  type AdminUsersQuery,
  type ApiPage,
  type PublicUser,
} from '@bdph/types';
import { ZodValidationPipe } from '../common/pipes/zod-validation.pipe';
import { CurrentUser } from '../auth/current-user.decorator';
import { SessionAuthGuard } from '../auth/session-auth.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { RolesGuard } from '../common/guards/roles.guard';
import { AdminUsersService } from './admin-users.service';

// Admin user management (FR-A1). Class-level @Roles gates the list + status
// routes to admin/super_admin; the role-assignment route TIGHTENS this to
// super_admin only via a method-level @Roles (RolesGuard reads the handler
// override). Per-target privilege rules (no self-action, admins can't touch
// staff) live in AdminUsersService.
@Controller('admin/users')
@UseGuards(SessionAuthGuard, RolesGuard)
@Roles('admin', 'super_admin')
export class AdminUsersController {
  constructor(private readonly adminUsers: AdminUsersService) {}

  @Get()
  list(
    @Query(new ZodValidationPipe(adminUsersQuerySchema)) query: AdminUsersQuery,
  ): Promise<ApiPage<PublicUser>> {
    return this.adminUsers.list(query);
  }

  @Patch(':userId/status')
  setStatus(
    @Param('userId') userId: string,
    @Body(new ZodValidationPipe(adminUpdateUserStatusInputSchema)) body: AdminUpdateUserStatusInput,
    @CurrentUser() actor: PublicUser,
  ): Promise<PublicUser> {
    return this.adminUsers.setStatus(actor, userId, body.status);
  }

  // Role assignment is a super-admin-only capability (staff.assign_role). This
  // method-level @Roles overrides the class-level one for this route.
  @Patch(':userId/roles')
  @Roles('super_admin')
  assignRoles(
    @Param('userId') userId: string,
    @Body(new ZodValidationPipe(adminAssignRolesInputSchema)) body: AdminAssignRolesInput,
    @CurrentUser() actor: PublicUser,
  ): Promise<PublicUser> {
    return this.adminUsers.assignRoles(actor, userId, body.roles);
  }
}
