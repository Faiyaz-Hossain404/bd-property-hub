import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { UsersModule } from '../users/users.module';
import { EmailModule } from '../email/email.module';
import { AuthController } from './auth.controller';
import { MeController } from './me.controller';
import { LocalAuthProvider } from './local-auth.provider';
import { PasswordService } from './password.service';
import { SessionService } from './session.service';
import { SessionAuthGuard } from './session-auth.guard';
import { AuthTokenService } from './auth-token.service';
import { AccountFlowsService } from './account-flows.service';
import { Session, SessionSchema } from './schemas/session.schema';
import { AuthToken, AuthTokenSchema } from './schemas/auth-token.schema';

@Module({
  imports: [
    UsersModule,
    EmailModule,
    MongooseModule.forFeature([
      { name: Session.name, schema: SessionSchema },
      { name: AuthToken.name, schema: AuthTokenSchema },
    ]),
  ],
  controllers: [AuthController, MeController],
  providers: [
    PasswordService,
    LocalAuthProvider,
    SessionService,
    SessionAuthGuard,
    AuthTokenService,
    AccountFlowsService,
  ],
  // SessionAuthGuard is used via @UseGuards in other modules' controllers
  // (listings, seller-verification, saved). Those modules import AuthModule, so
  // both the guard AND its dependency (SessionService) must be exported for Nest
  // to construct the guard in the importing module's context.
  exports: [SessionAuthGuard, SessionService],
})
export class AuthModule {}
