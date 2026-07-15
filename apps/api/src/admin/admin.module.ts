import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { AuthModule } from '../auth/auth.module';
import { UsersModule } from '../users/users.module';
import { RolesGuard } from '../common/guards/roles.guard';
import { User, UserSchema } from '../users/schemas/user.schema';
import { Listing, ListingSchema } from '../listings/schemas/listing.schema';
import { AdminStatsService } from './admin-stats.service';
import { AdminStatsController } from './admin-stats.controller';
import { AdminUsersService } from './admin-users.service';
import { AdminUsersController } from './admin-users.controller';

// Admin dashboard surface (FR-A1/A2/A3): read-only analytics plus user
// management. Imports AuthModule for SessionAuthGuard + SessionService (session
// revoke on suspend) and UsersModule for UsersService.toPublic; registers the
// User and Listing models for the aggregate queries and direct user writes. No
// import cycle — nothing imports this module except AppModule.
@Module({
  imports: [
    AuthModule,
    UsersModule,
    MongooseModule.forFeature([
      { name: User.name, schema: UserSchema },
      { name: Listing.name, schema: ListingSchema },
    ]),
  ],
  controllers: [AdminStatsController, AdminUsersController],
  providers: [AdminStatsService, AdminUsersService, RolesGuard],
})
export class AdminModule {}
