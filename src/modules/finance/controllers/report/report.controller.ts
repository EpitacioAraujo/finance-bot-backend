import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { IsDateString, IsEnum, IsIn, IsOptional } from 'class-validator';
import { CurrentUser, CurrentUserGuard } from '@/shared/current-user';
import { TransactionType } from '@/modules/finance/entities/transaction.entity';
import {
  ReportOutput,
  ReportService,
} from '@/modules/finance/services/report/report.service';

export class ReportQueryDto {
  @IsDateString() from!: string;
  @IsDateString() to!: string;
  @IsIn(['tag', 'payment_method', 'none'])
  groupBy!: 'tag' | 'payment_method' | 'none';
  @IsOptional() @IsEnum(TransactionType) type?: TransactionType;
}

@Controller('reports')
@UseGuards(CurrentUserGuard)
export class ReportController {
  constructor(private readonly service: ReportService) {}

  @Get()
  async exec(
    @CurrentUser() userId: string,
    @Query() query: ReportQueryDto,
  ): Promise<ReportOutput> {
    return this.service.exec({ userId, ...query });
  }
}
