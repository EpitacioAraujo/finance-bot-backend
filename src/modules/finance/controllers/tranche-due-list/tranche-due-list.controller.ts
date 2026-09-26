import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { Type } from 'class-transformer';
import {
  IsDateString,
  IsEnum,
  IsInt,
  IsOptional,
  IsString,
  Max,
  Min,
} from 'class-validator';
import { CurrentUser, CurrentUserGuard } from '@/shared/current-user';
import { TransactionType } from '@/modules/finance/entities/transaction.entity';
import {
  TrancheDueListResult,
  TrancheDueListService,
} from '@/modules/finance/services/tranche-due-list/tranche-due-list.service';

/** Mesmos nomes de parâmetro do `GET /transactions`: a tela reusa o filtro. */
export class TrancheDueListQueryDto {
  @IsDateString() from!: string;
  @IsDateString() to!: string;
  @IsOptional() @IsEnum(TransactionType) type?: TransactionType;
  @IsOptional() @IsString() tagId?: string;
  @IsOptional() @IsString() paymentMethodId?: string;
  @IsOptional() @Type(() => Number) @IsInt() @Min(1) @Max(200) limit?: number;
  @IsOptional() @Type(() => Number) @IsInt() @Min(0) offset?: number;
}

@Controller('tranches')
@UseGuards(CurrentUserGuard)
export class TrancheDueListController {
  constructor(private readonly service: TrancheDueListService) {}

  @Get()
  async exec(
    @CurrentUser() userId: string,
    @Query() query: TrancheDueListQueryDto,
  ): Promise<TrancheDueListResult> {
    return this.service.exec({ userId, ...query });
  }
}
