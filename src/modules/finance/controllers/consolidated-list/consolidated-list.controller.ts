import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { IsDateString } from 'class-validator';
import { CurrentUser, CurrentUserGuard } from '@/shared/current-user';
import {
  ConsolidatedListUseCase,
  ConsolidatedView,
} from '@/modules/finance/use-cases/consolidated-list/consolidated-list.use-case';

export class ConsolidatedListQueryDto {
  @IsDateString() from!: string;
  @IsDateString() to!: string;
}

@Controller('consolidated')
@UseGuards(CurrentUserGuard)
export class ConsolidatedListController {
  constructor(private readonly useCase: ConsolidatedListUseCase) {}

  @Get()
  async exec(
    @CurrentUser() userId: string,
    @Query() query: ConsolidatedListQueryDto,
  ): Promise<ConsolidatedView[]> {
    return this.useCase.exec({ userId, ...query });
  }
}
