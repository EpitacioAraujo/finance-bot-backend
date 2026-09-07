import { Body, Controller, Param, Patch, UseGuards } from '@nestjs/common';
import { IsBoolean, IsIn, IsInt, IsOptional, IsString, Max, Min } from 'class-validator';
import { CurrentUser, CurrentUserGuard } from '@/shared/current-user';
import { PaymentMethodUpdateService } from '@/modules/finance/services/payment-method-update/payment-method-update.service';
import {
  PAYMENT_METHOD_KINDS,
  PaymentMethodEntity,
  PaymentMethodKind,
} from '@/modules/finance/entities/payment-method.entity';

export class PaymentMethodUpdateBodyDto {
  @IsOptional() @IsString() description?: string;
  @IsOptional() @IsIn(PAYMENT_METHOD_KINDS) kind?: PaymentMethodKind;
  @IsOptional() @IsInt() @Min(1) @Max(31) closingDay?: number;
  @IsOptional() @IsInt() @Min(1) @Max(31) dueDay?: number;
  @IsOptional() @IsBoolean() showInBills?: boolean;
  @IsOptional() @IsBoolean() active?: boolean;
}

@Controller('payment-methods')
@UseGuards(CurrentUserGuard)
export class PaymentMethodUpdateController {
  constructor(private readonly service: PaymentMethodUpdateService) {}

  @Patch(':id')
  async exec(
    @CurrentUser() userId: string,
    @Param('id') id: string,
    @Body() body: PaymentMethodUpdateBodyDto,
  ): Promise<PaymentMethodEntity> {
    return this.service.exec({ userId, id, ...body });
  }
}
