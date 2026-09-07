import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { Type } from 'class-transformer';
import { IsDateString, IsIn, IsInt, IsOptional, IsString, Max, Min } from 'class-validator';
import { CurrentUser, CurrentUserGuard } from '@/shared/current-user';
import {
  TransactionListResult,
  TransactionListService,
} from '@/modules/finance/services/transaction-list/transaction-list.service';

export class TransactionListQueryDto {
  @IsDateString() from!: string;
  @IsDateString() to!: string;
  @IsOptional() @IsIn(['income', 'expense']) type?: 'income' | 'expense';
  @IsOptional() @IsString() tagId?: string;
  @IsOptional() @IsString() paymentMethodId?: string;
  @IsOptional() @Type(() => Number) @IsInt() @Min(1) @Max(200) limit?: number;
  @IsOptional() @Type(() => Number) @IsInt() @Min(0) offset?: number;
}

@Controller('transactions')
@UseGuards(CurrentUserGuard)
export class TransactionListController {
  constructor(private readonly service: TransactionListService) {}

  @Get()
  async exec(
    @CurrentUser() userId: string,
    @Query() query: TransactionListQueryDto,
  ): Promise<TransactionListResult> {
    return this.service.exec({ userId, ...query });
  }
}
