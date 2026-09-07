import { Controller, Get, UseGuards } from '@nestjs/common';
import { CurrentUser, CurrentUserGuard } from '@/shared/current-user';
import { PaymentMethodListService } from '@/modules/finance/services/payment-method-list/payment-method-list.service';
import { PaymentMethodEntity } from '@/modules/finance/entities/payment-method.entity';

@Controller('payment-methods')
@UseGuards(CurrentUserGuard)
export class PaymentMethodListController {
  constructor(private readonly service: PaymentMethodListService) {}

  @Get()
  async exec(@CurrentUser() userId: string): Promise<PaymentMethodEntity[]> {
    return this.service.exec({ userId });
  }
}
