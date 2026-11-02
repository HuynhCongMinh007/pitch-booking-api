import { Module } from '@nestjs/common';

import { AuthModule } from './modules/auth/auth.module';
import { UserModule } from './modules/user/user.module';
import { DatabaseModule } from './shared/infrastructure/persistence';
import { HealthController } from './shared/presentation';

@Module({
  imports: [DatabaseModule, AuthModule, UserModule],
  controllers: [HealthController],
})
export class AppModule {}
