import { Body, Controller, Param, Patch, UseGuards } from '@nestjs/common';
import {
  IsBoolean,
  IsDateString,
  IsIn,
  IsInt,
  IsNumber,
  IsOptional,
  IsString,
  Max,
  Min,
} from 'class-validator';
import { CurrentUser, CurrentUserGuard } from '@/shared/current-user';
import { BillUpdateService } from '@/modules/finance/services/bill-update/bill-update.service';
import {
  BILL_FREQUENCIES,
  BillEntity,
  BillFrequency,
} from '@/modules/finance/entities/bill.entity';

export class BillUpdateBodyDto {
  @IsOptional() @IsString() description?: string;
  @IsOptional() @IsNumber() @Min(0.01) predictedAmount?: number;
  @IsOptional() @IsIn(BILL_FREQUENCIES) frequency?: BillFrequency;
  @IsOptional() @IsDateString() dueDate?: string;
  @IsOptional() @IsInt() @Min(1) @Max(31) dueDay?: number;
  @IsOptional() @IsString() paymentMethodId?: string;
  @IsOptional() @IsString() tagId?: string;
  @IsOptional() @IsString() notes?: string;
  @IsOptional() @IsBoolean() active?: boolean;
}

@Controller('bills')
@UseGuards(CurrentUserGuard)
export class BillUpdateController {
  constructor(private readonly service: BillUpdateService) {}

  @Patch(':id')
  async exec(
    @CurrentUser() userId: string,
    @Param('id') id: string,
    @Body() body: BillUpdateBodyDto,
  ): Promise<BillEntity> {
    return this.service.exec({ userId, id, ...body });
  }
}
