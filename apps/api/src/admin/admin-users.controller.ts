import { Body, Controller, Get, Param, Patch, Query, UseGuards } from '@nestjs/common';
import {
  adminAssignRoleInputSchema,
  adminUpdateUserStatusInputSchema,
  adminUsersQuerySchema,
  type AdminAssignRoleInput,
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
// routes to admin/admin_prime; the role-assignment route TIGHTENS this to
// admin_prime only via a method-level @Roles (RolesGuard reads the handler
// override), so a standard admin can view users and suspend end-users but cannot
// change anyone's role. Per-target privilege rules (no self-action, admins can't
// touch staff) live in AdminUsersService.
@Controller('admin/users')
@UseGuards(SessionAuthGuard, RolesGuard)
@Roles('admin', 'admin_prime')
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

  // Role assignment is an admin_prime-only capability (staff.assign_role). This
  // method-level @Roles overrides the class-level one, so a standard admin is
  // blocked here even though they reach the rest of the controller.
  @Patch(':userId/role')
  @Roles('admin_prime')
  assignRole(
    @Param('userId') userId: string,
    @Body(new ZodValidationPipe(adminAssignRoleInputSchema)) body: AdminAssignRoleInput,
    @CurrentUser() actor: PublicUser,
  ): Promise<PublicUser> {
    return this.adminUsers.assignRole(actor, userId, body.role);
  }
}
