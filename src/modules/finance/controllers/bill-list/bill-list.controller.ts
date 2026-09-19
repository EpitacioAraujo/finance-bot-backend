import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { IsDateString, IsEnum, IsIn, IsOptional } from 'class-validator';
import { CurrentUser, CurrentUserGuard } from '@/shared/current-user';
import { TransactionType } from '@/modules/finance/entities/transaction.entity';
import {
  BillListResult,
  BillListService,
} from '@/modules/finance/services/bill-list/bill-list.service';

export class BillListQueryDto {
  @IsDateString() from!: string;
  @IsDateString() to!: string;
  @IsOptional() @IsIn(['paid', 'pending']) status?: 'paid' | 'pending';
  @IsOptional() @IsEnum(TransactionType) type?: TransactionType;
}

@Controller('bills')
@UseGuards(CurrentUserGuard)
export class BillListController {
  constructor(private readonly service: BillListService) {}

  @Get()
  async exec(
    @CurrentUser() userId: string,
    @Query() query: BillListQueryDto,
  ): Promise<BillListResult> {
    return this.service.exec({ userId, ...query });
  }
}
