import { Body, Controller, Param, Patch, UseGuards } from '@nestjs/common';
import { IsString } from 'class-validator';
import { CurrentUser, CurrentUserGuard } from '@/shared/current-user';
import { TagUpdateService } from '@/modules/finance/services/tag-update/tag-update.service';
import { TagEntity } from '@/modules/finance/entities/tag.entity';

export class TagUpdateBodyDto {
  @IsString() description!: string;
}

@Controller('tags')
@UseGuards(CurrentUserGuard)
export class TagUpdateController {
  constructor(private readonly service: TagUpdateService) {}

  @Patch(':id')
  async exec(
    @CurrentUser() userId: string,
    @Param('id') id: string,
    @Body() body: TagUpdateBodyDto,
  ): Promise<TagEntity> {
    return this.service.exec({ userId, id, ...body });
  }
}
