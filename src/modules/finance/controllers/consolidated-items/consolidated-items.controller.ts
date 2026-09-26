import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { IsDateString, IsOptional, IsString } from 'class-validator';
import { CurrentUser, CurrentUserGuard } from '@/shared/current-user';
import { ConsolidatedItemView } from '@/modules/finance/services/consolidated-items/consolidated-items.service';
import { ConsolidatedItemsUseCase } from '@/modules/finance/use-cases/consolidated-items/consolidated-items.use-case';

/**
 * `cycleId` para a fatura que existe no banco; cartão + janela para a virtual,
 * que não tem id porque ainda não teve compra nenhuma.
 */
export class ConsolidatedItemsQueryDto {
  @IsOptional() @IsString() cycleId?: string;
  @IsOptional() @IsString() paymentMethodId?: string;
  @IsOptional() @IsDateString() from?: string;
  @IsOptional() @IsDateString() to?: string;
}

@Controller('consolidated')
@UseGuards(CurrentUserGuard)
export class ConsolidatedItemsController {
  constructor(private readonly useCase: ConsolidatedItemsUseCase) {}

  @Get('items')
  async exec(
    @CurrentUser() userId: string,
    @Query() query: ConsolidatedItemsQueryDto,
  ): Promise<ConsolidatedItemView[]> {
    return this.useCase.exec({ userId, ...query });
  }
}
