import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { AuthModule } from '../auth/auth.module';
import { UsersModule } from '../users/users.module';
import { RolesGuard } from '../common/guards/roles.guard';
import { User, UserSchema } from '../users/schemas/user.schema';
import {
  SellerVerificationEvent,
  SellerVerificationEventSchema,
} from './seller-verification-event.schema';
import { SellerVerificationService } from './seller-verification.service';
import { SellerVerificationController } from './seller-verification.controller';
import { MeVerificationController } from './me-verification.controller';

// Seller verification (KYC) gate. Imports AuthModule for SessionAuthGuard and
// UsersModule for UsersService.toPublic; registers its own audit collection plus
// the User model so the transactional status change can touch both. No import
// cycle: AuthModule imports UsersModule, and nothing imports this module except
// AppModule.
@Module({
  imports: [
    AuthModule,
    UsersModule,
    MongooseModule.forFeature([
      { name: User.name, schema: UserSchema },
      { name: SellerVerificationEvent.name, schema: SellerVerificationEventSchema },
    ]),
  ],
  controllers: [SellerVerificationController, MeVerificationController],
  providers: [SellerVerificationService, RolesGuard],
})
export class SellerVerificationModule {}
