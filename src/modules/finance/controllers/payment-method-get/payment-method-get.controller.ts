import { Controller, Get, Param, UseGuards } from '@nestjs/common';
import { CurrentUser, CurrentUserGuard } from '@/shared/current-user';
import { PaymentMethodGetService } from '@/modules/finance/services/payment-method-get/payment-method-get.service';
import { PaymentMethodEntity } from '@/modules/finance/entities/payment-method.entity';

@Controller('payment-methods')
@UseGuards(CurrentUserGuard)
export class PaymentMethodGetController {
  constructor(private readonly service: PaymentMethodGetService) {}

  @Get(':id')
  async exec(
    @CurrentUser() userId: string,
    @Param('id') id: string,
  ): Promise<PaymentMethodEntity> {
    return this.service.exec({ userId, id });
  }
}
