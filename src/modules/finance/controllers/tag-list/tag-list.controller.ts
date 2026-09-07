import { Controller, Get, UseGuards } from '@nestjs/common';
import { CurrentUser, CurrentUserGuard } from '@/shared/current-user';
import { TagListService } from '@/modules/finance/services/tag-list/tag-list.service';
import { TagEntity } from '@/modules/finance/entities/tag.entity';

@Controller('tags')
@UseGuards(CurrentUserGuard)
export class TagListController {
  constructor(private readonly service: TagListService) {}

  @Get()
  async exec(@CurrentUser() userId: string): Promise<TagEntity[]> {
    return this.service.exec({ userId });
  }
}
