import { Body, Controller, Get, HttpStatus, Param, ParseIntPipe, Patch, UseGuards, } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';

import { type AuthenticatedUser, CurrentUser, } from '../../../../shared/presentation/decorators/current-user.decorator';
import { JwtAuthGuard } from '../../../../shared/presentation/guards/jwt-auth.guard';
import { ZodValidationPipe } from '../../../../shared/presentation/pipes/zod-validation.pipe';
import { GetMeUseCase } from '../../application/use-cases/get-me.use-case';
import { GetUserByIdUseCase } from '../../application/use-cases/get-user-by-id.use-case';
import { UpdateMeUseCase } from '../../application/use-cases/update-me.use-case';
import { type UpdateMeChangesDto, updateMeRequestSchema } from '../requests/update-me.request';

@ApiTags('users')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('users')
export class UserController {
  constructor(
    private readonly getMeUseCase: GetMeUseCase,
    private readonly updateMeUseCase: UpdateMeUseCase,
    private readonly getUserByIdUseCase: GetUserByIdUseCase,
  ) { }

  @Get('me')
  @ApiOperation({ summary: 'Get current authenticated user profile' })
  getMe(@CurrentUser() currentUser: AuthenticatedUser) {
    return this.getMeUseCase.execute({ userId: currentUser.userId });
  }

  @Patch('me')
  @ApiOperation({ summary: 'Update current authenticated user profile' })
  updateMe(
    @CurrentUser() currentUser: AuthenticatedUser,
    @Body(new ZodValidationPipe(updateMeRequestSchema)) changes: UpdateMeChangesDto,
  ) {
    return this.updateMeUseCase.execute({
      userId: currentUser.userId,
      changes,
    });
  }

  @Get(':userId')
  @ApiOperation({ summary: 'Get public user profile by ID' })
  getUserById(
    @Param(
      'userId',
      new ParseIntPipe({ errorHttpStatusCode: HttpStatus.UNPROCESSABLE_ENTITY }),
    )
    userId: number,
  ) {
    return this.getUserByIdUseCase.execute({ userId });
  }
}

