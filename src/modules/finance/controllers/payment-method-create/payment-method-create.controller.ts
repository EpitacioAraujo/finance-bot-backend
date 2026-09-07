import { Body, Controller, HttpCode, Post, UseGuards } from '@nestjs/common';
import { IsBoolean, IsIn, IsInt, IsOptional, IsString, Max, Min } from 'class-validator';
import { CurrentUser, CurrentUserGuard } from '@/shared/current-user';
import { PaymentMethodCreateService } from '@/modules/finance/services/payment-method-create/payment-method-create.service';
import {
  PAYMENT_METHOD_KINDS,
  PaymentMethodEntity,
  PaymentMethodKind,
} from '@/modules/finance/entities/payment-method.entity';

export class PaymentMethodCreateBodyDto {
  @IsString() description!: string;
  @IsIn(PAYMENT_METHOD_KINDS) kind!: PaymentMethodKind;
  @IsOptional() @IsInt() @Min(1) @Max(31) closingDay?: number;
  @IsOptional() @IsInt() @Min(1) @Max(31) dueDay?: number;
  @IsOptional() @IsBoolean() showInBills?: boolean;
}

@Controller('payment-methods')
@UseGuards(CurrentUserGuard)
export class PaymentMethodCreateController {
  constructor(private readonly service: PaymentMethodCreateService) {}

  @Post()
  @HttpCode(201)
  async exec(
    @CurrentUser() userId: string,
    @Body() body: PaymentMethodCreateBodyDto,
  ): Promise<PaymentMethodEntity> {
    return this.service.exec({ userId, ...body });
  }
}
