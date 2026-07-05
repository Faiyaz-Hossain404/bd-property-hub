import { Module } from '@nestjs/common';
import { EmailService } from './email.service';

// ConfigModule is global, so EmailService reads its keys without importing it here.
@Module({
  providers: [EmailService],
  exports: [EmailService],
})
export class EmailModule {}
