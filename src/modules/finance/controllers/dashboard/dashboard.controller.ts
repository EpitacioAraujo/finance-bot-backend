import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { IsDateString } from 'class-validator';
import { CurrentUser, CurrentUserGuard } from '@/shared/current-user';
import {
  DashboardOutput,
  DashboardUseCase,
} from '@/modules/finance/use-cases/dashboard/dashboard.use-case';

export class DashboardQueryDto {
  @IsDateString() from!: string;
  @IsDateString() to!: string;
}

@Controller('dashboard')
@UseGuards(CurrentUserGuard)
export class DashboardController {
  constructor(private readonly useCase: DashboardUseCase) {}

  @Get()
  async exec(
    @CurrentUser() userId: string,
    @Query() query: DashboardQueryDto,
  ): Promise<DashboardOutput> {
    return this.useCase.exec({ userId, ...query });
  }
}
