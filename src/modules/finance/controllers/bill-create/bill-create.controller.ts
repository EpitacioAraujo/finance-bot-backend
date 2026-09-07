import { Body, Controller, HttpCode, Post, UseGuards } from '@nestjs/common';
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
import { BillCreateService } from '@/modules/finance/services/bill-create/bill-create.service';
import {
  BILL_FREQUENCIES,
  BillEntity,
  BillFrequency,
} from '@/modules/finance/entities/bill.entity';

export class BillCreateBodyDto {
  @IsString() description!: string;
  @IsNumber() @Min(0.01) predictedAmount!: number;
  @IsIn(BILL_FREQUENCIES) frequency!: BillFrequency;
  @IsString() paymentMethodId!: string;
  @IsOptional() @IsDateString() dueDate?: string;
  @IsOptional() @IsInt() @Min(1) @Max(31) dueDay?: number;
  @IsOptional() @IsString() tagId?: string;
  @IsOptional() @IsString() notes?: string;
  @IsOptional() @IsBoolean() active?: boolean;
}

@Controller('bills')
@UseGuards(CurrentUserGuard)
export class BillCreateController {
  constructor(private readonly service: BillCreateService) {}

  @Post()
  @HttpCode(201)
  async exec(
    @CurrentUser() userId: string,
    @Body() body: BillCreateBodyDto,
  ): Promise<BillEntity> {
    return this.service.exec({ userId, ...body });
  }
}
