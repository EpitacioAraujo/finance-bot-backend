import { Controller, Delete, HttpCode, Param, UseGuards } from '@nestjs/common';
import { CurrentUser, CurrentUserGuard } from '@/shared/current-user';
import { BillDeleteService } from '@/modules/finance/services/bill-delete/bill-delete.service';

@Controller('bills')
@UseGuards(CurrentUserGuard)
export class BillDeleteController {
  constructor(private readonly service: BillDeleteService) {}

  @Delete(':id')
  @HttpCode(204)
  async exec(@CurrentUser() userId: string, @Param('id') id: string): Promise<void> {
    await this.service.exec({ userId, id });
  }
}
