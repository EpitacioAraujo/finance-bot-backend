import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { IsDateString } from 'class-validator';
import { CurrentUser, CurrentUserGuard } from '@/shared/current-user';
import {
  ConsolidatedListService,
  ConsolidatedView,
} from '@/modules/finance/services/consolidated-list/consolidated-list.service';

export class ConsolidatedListQueryDto {
  @IsDateString() from!: string;
  @IsDateString() to!: string;
}

@Controller('consolidated')
@UseGuards(CurrentUserGuard)
export class ConsolidatedListController {
  constructor(private readonly service: ConsolidatedListService) {}

  @Get()
  async exec(
    @CurrentUser() userId: string,
    @Query() query: ConsolidatedListQueryDto,
  ): Promise<ConsolidatedView[]> {
    return this.service.exec({ userId, ...query });
  }
}
