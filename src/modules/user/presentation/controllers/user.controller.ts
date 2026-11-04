import {
  Body,
  Controller,
  Get,
  HttpStatus,
  Param,
  ParseIntPipe,
  Patch,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiBody, ApiOperation, ApiTags } from '@nestjs/swagger';

import {
  type AuthenticatedUser,
  CurrentUser,
} from '../../../../shared/presentation/decorators/current-user.decorator';
import { JwtAuthGuard } from '../../../../shared/presentation/guards/jwt-auth.guard';
import { ZodValidationPipe } from '../../../../shared/presentation/pipes/zod-validation.pipe';
import { GetMeUseCase } from '../../application/use-cases/get-me.use-case';
import { GetUserByIdUseCase } from '../../application/use-cases/get-user-by-id.use-case';
import { UpdateMeUseCase } from '../../application/use-cases/update-me.use-case';
import { type UpdateMeChangesDto, updateMeRequestSchema } from '../dtos/update-me.dto';
import { UserResponseDto } from '../dtos/user-response.dto';

@ApiTags('users')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('users')
export class UserController {
  constructor(
    private readonly getMeUseCase: GetMeUseCase,
    private readonly updateMeUseCase: UpdateMeUseCase,
    private readonly getUserByIdUseCase: GetUserByIdUseCase,
  ) {}

  @Get('me')
  @ApiOperation({ summary: 'Get current authenticated user profile' })
  async getMe(@CurrentUser() currentUser: AuthenticatedUser) {
    const user = await this.getMeUseCase.execute({ userId: currentUser.userId });
    return UserResponseDto.toMe(user);
  }

  @Patch('me')
  @ApiOperation({ summary: 'Update current authenticated user profile' })
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        username: { type: 'string' },
        full_name: { type: 'string' },
        phone_number: { type: 'string' },
        address: { type: 'string' },
        avatar_url: { type: 'string' },
        date_of_birth: { type: 'string' },
        gender: { type: 'string' },
        bio: { type: 'string' },
      },
    },
  })
  async updateMe(
    @CurrentUser() currentUser: AuthenticatedUser,
    @Body(new ZodValidationPipe(updateMeRequestSchema)) changes: UpdateMeChangesDto,
  ) {
    const user = await this.updateMeUseCase.execute({
      userId: currentUser.userId,
      changes,
    });
    return UserResponseDto.toMe(user);
  }

  @Get(':userId')
  @ApiOperation({ summary: 'Get public user profile by ID' })
  async getUserById(
    @Param(
      'userId',
      new ParseIntPipe({ errorHttpStatusCode: HttpStatus.UNPROCESSABLE_ENTITY }),
    )
    userId: number,
  ) {
    const user = await this.getUserByIdUseCase.execute({ userId });
    return UserResponseDto.toPublic(user);
  }
}
