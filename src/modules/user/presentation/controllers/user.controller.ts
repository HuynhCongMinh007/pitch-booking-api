import { Body, Controller, Patch, UseGuards } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';

import { AccessTokenGuard, CurrentUserId } from '../../../../shared/presentation/auth.guard';
import { ZodValidationPipe } from '../../../../shared/presentation/validation.pipe';
import { UpdateMeUseCase } from '../../application/use-cases/update-me.use-case';
import { type UpdateMeRequest, updateMeSchema } from '../dtos/update-me.request.dto';
import type { UserResponseDto } from '../dtos/user.response.dto';
import { toUpdateMeInput, toUserResponseDto } from '../mappers/user.mapper';

@ApiTags('users')
@Controller('api/v1/users')
@UseGuards(AccessTokenGuard)
export class UserController {
  constructor(private readonly updateMeUseCase: UpdateMeUseCase) { }

  @Patch('me')
  async updateMe(
    @CurrentUserId() userId: number,
    @Body(new ZodValidationPipe(updateMeSchema)) body: UpdateMeRequest,
  ): Promise<UserResponseDto> {

    const payload = toUpdateMeInput(userId, body)
    const user = await this.updateMeUseCase.execute(payload);
    
    return toUserResponseDto(user);
  }
}
