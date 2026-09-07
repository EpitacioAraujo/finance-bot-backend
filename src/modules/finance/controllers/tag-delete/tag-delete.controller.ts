import { Controller, Delete, HttpCode, Param, UseGuards } from '@nestjs/common';
import { CurrentUser, CurrentUserGuard } from '@/shared/current-user';
import { TagDeleteService } from '@/modules/finance/services/tag-delete/tag-delete.service';

@Controller('tags')
@UseGuards(CurrentUserGuard)
export class TagDeleteController {
  constructor(private readonly service: TagDeleteService) {}

  @Delete(':id')
  @HttpCode(204)
  async exec(@CurrentUser() userId: string, @Param('id') id: string): Promise<void> {
    await this.service.exec({ userId, id });
  }
}
