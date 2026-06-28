import { Module } from '@nestjs/common';
import { CloudinaryService } from './cloudinary.service';

// ConfigModule is registered globally (app.module.ts), so ConfigService is
// injectable here without re-importing it.
@Module({
  providers: [CloudinaryService],
  exports: [CloudinaryService],
})
export class CloudinaryModule {}
