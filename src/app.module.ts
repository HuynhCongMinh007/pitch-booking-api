import { Module } from '@nestjs/common';

import { HealthController } from './api/health.controller';
import { AuthController } from './api/v1/auth.controller';
import { TeamController } from './api/v1/team.controller';
import { UserController } from './api/v1/user.controller';
import { PrismaService } from './shared/infrastructure/prisma.service';
import { EmailOtpRepository } from './repositories/otp.repository';
import { PositionRepository } from './repositories/position.repository';
import { TeamMemberRepository } from './repositories/team-member.repository';
import { TeamRepository } from './repositories/team.repository';
import { RefreshTokenRepository } from './repositories/token.repository';
import { UserRepository } from './repositories/user.repository';
import { AuthService } from './services/auth.service';
import { EmailService } from './services/email.service';
import { TeamService } from './services/team.service';
import { UserService } from './services/user.service';

// Layers: controllers (api) -> services (business logic) -> repositories (database access)
@Module({
  controllers: [HealthController, AuthController, UserController, TeamController],
  providers: [
    PrismaService,

    // Repositories
    UserRepository,
    RefreshTokenRepository,
    EmailOtpRepository,
    PositionRepository,
    TeamRepository,
    TeamMemberRepository,

    // Services
    AuthService,
    EmailService,
    UserService,
    TeamService,
  ],
})
export class AppModule {}
