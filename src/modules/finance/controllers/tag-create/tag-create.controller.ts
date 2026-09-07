import { Body, Controller, HttpCode, Post, UseGuards } from '@nestjs/common';
import { IsString } from 'class-validator';
import { CurrentUser, CurrentUserGuard } from '@/shared/current-user';
import { TagCreateService } from '@/modules/finance/services/tag-create/tag-create.service';
import { TagEntity } from '@/modules/finance/entities/tag.entity';

export class TagCreateBodyDto {
  @IsString() description!: string;
}

@Controller('tags')
@UseGuards(CurrentUserGuard)
export class TagCreateController {
  constructor(private readonly service: TagCreateService) {}

  @Post()
  @HttpCode(201)
  async exec(
    @CurrentUser() userId: string,
    @Body() body: TagCreateBodyDto,
  ): Promise<TagEntity> {
    return this.service.exec({ userId, ...body });
  }
}
