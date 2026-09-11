import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { IsDateString, IsIn, IsOptional } from 'class-validator';
import { CurrentUser, CurrentUserGuard } from '@/shared/current-user';
import {
  PayableListOutput,
  PayableListUseCase,
} from '@/modules/finance/use-cases/payable-list/payable-list.use-case';

export class PayableListQueryDto {
  @IsDateString() from!: string;
  @IsDateString() to!: string;
  @IsOptional() @IsIn(['paid', 'pending']) status?: 'paid' | 'pending';
}

@Controller('payables')
@UseGuards(CurrentUserGuard)
export class PayableListController {
  constructor(private readonly useCase: PayableListUseCase) {}

  @Get()
  async exec(
    @CurrentUser() userId: string,
    @Query() query: PayableListQueryDto,
  ): Promise<PayableListOutput> {
    return this.useCase.exec({ userId, ...query });
  }
}
