import { Controller, Delete, HttpCode, Param, UseGuards } from '@nestjs/common';
import { CurrentUser, CurrentUserGuard } from '@/shared/current-user';
import { PaymentMethodDeleteService } from '@/modules/finance/services/payment-method-delete/payment-method-delete.service';

@Controller('payment-methods')
@UseGuards(CurrentUserGuard)
export class PaymentMethodDeleteController {
  constructor(private readonly service: PaymentMethodDeleteService) {}

  @Delete(':id')
  @HttpCode(204)
  async exec(@CurrentUser() userId: string, @Param('id') id: string): Promise<void> {
    await this.service.exec({ userId, id });
  }
}
