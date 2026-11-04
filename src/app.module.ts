import { Module } from '@nestjs/common';

import { AuthModule } from './modules/auth/auth.module';
import { UserModule } from './modules/user/user.module';
import { AppConfigModule } from './shared/infrastructure/modules/app-config.module';
import { DatabaseModule } from './shared/infrastructure/modules/database.module';
import { SecurityModule } from './shared/infrastructure/modules/security.module';
import { HealthController } from './shared/presentation/controllers/health.controller';

@Module({
  imports: [AppConfigModule, DatabaseModule, SecurityModule, UserModule, AuthModule],
  controllers: [HealthController],
})
export class AppModule { }
