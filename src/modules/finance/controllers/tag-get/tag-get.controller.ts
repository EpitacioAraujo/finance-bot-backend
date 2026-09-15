import { Controller, Get, Param, UseGuards } from '@nestjs/common';
import { CurrentUser, CurrentUserGuard } from '@/shared/current-user';
import { TagGetService } from '@/modules/finance/services/tag-get/tag-get.service';
import { TagEntity } from '@/modules/finance/entities/tag.entity';

@Controller('tags')
@UseGuards(CurrentUserGuard)
export class TagGetController {
  constructor(private readonly service: TagGetService) {}

  @Get(':id')
  async exec(
    @CurrentUser() userId: string,
    @Param('id') id: string,
  ): Promise<TagEntity> {
    return this.service.exec({ userId, id });
  }
}
