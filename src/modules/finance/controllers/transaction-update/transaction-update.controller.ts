import { Body, Controller, Param, Patch, UseGuards } from '@nestjs/common';
import {
  ArrayMaxSize,
  IsArray,
  IsDateString,
  IsNumber,
  IsOptional,
  IsString,
  Min,
} from 'class-validator';
import { CurrentUser, CurrentUserGuard } from '@/shared/current-user';
import { TransactionUpdateService } from '@/modules/finance/services/transaction-update/transaction-update.service';
import { TransactionEntity } from '@/modules/finance/entities/transaction.entity';

export class TransactionUpdateBodyDto {
  @IsOptional() @IsString() description?: string;
  @IsOptional() @IsNumber() @Min(0.01) amount?: number;
  @IsOptional() @IsDateString() date?: string;
  @IsOptional() @IsString() paymentMethodId?: string;
  @IsOptional() @IsArray() @IsString({ each: true }) @ArrayMaxSize(10) tagIds?: string[];
  @IsOptional() @IsString() notes?: string;
}

@Controller('transactions')
@UseGuards(CurrentUserGuard)
export class TransactionUpdateController {
  constructor(private readonly service: TransactionUpdateService) {}

  @Patch(':id')
  async exec(
    @CurrentUser() userId: string,
    @Param('id') id: string,
    @Body() body: TransactionUpdateBodyDto,
  ): Promise<TransactionEntity> {
    return this.service.exec({ userId, id, ...body });
  }
}
