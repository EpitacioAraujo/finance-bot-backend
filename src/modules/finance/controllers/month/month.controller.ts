import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { IsDateString } from 'class-validator';
import { CurrentUser, CurrentUserGuard } from '@/shared/current-user';
import {
  MonthOutput,
  MonthUseCase,
} from '@/modules/finance/use-cases/month/month.use-case';

export class MonthQueryDto {
  @IsDateString() from!: string;
  @IsDateString() to!: string;
}

@Controller('month')
@UseGuards(CurrentUserGuard)
export class MonthController {
  constructor(private readonly useCase: MonthUseCase) {}

  @Get()
  async exec(
    @CurrentUser() userId: string,
    @Query() query: MonthQueryDto,
  ): Promise<MonthOutput> {
    return this.useCase.exec({ userId, ...query });
  }
}
