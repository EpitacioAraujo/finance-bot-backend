import { Body, Controller, Param, Post, UseGuards } from '@nestjs/common';
import { IsDateString, IsNumber, IsOptional, IsString, Min } from 'class-validator';
import { CurrentUser, CurrentUserGuard } from '@/shared/current-user';
import {
  BillPayUseCase,
} from '@/modules/finance/use-cases/bill-pay/bill-pay.use-case';
import { TransactionCreateUseCaseOutput } from '@/modules/finance/use-cases/transaction-create/transaction-create.use-case';

export class BillPayBodyDto {
  @IsOptional() @IsNumber() @Min(0.01) amount?: number;
  @IsOptional() @IsDateString() date?: string;
  @IsOptional() @IsString() paymentMethod?: string;
}

@Controller('bills')
@UseGuards(CurrentUserGuard)
export class BillPayController {
  constructor(private readonly useCase: BillPayUseCase) {}

  @Post(':id/pay')
  async exec(
    @CurrentUser() userId: string,
    @Param('id') billId: string,
    @Body() body: BillPayBodyDto,
  ): Promise<TransactionCreateUseCaseOutput> {
    return this.useCase.exec({ userId, billId, ...body });
  }
}
