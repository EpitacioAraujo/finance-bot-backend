import { Body, Controller, HttpCode, Post, UseGuards } from '@nestjs/common';
import {
  ArrayMaxSize,
  IsArray,
  IsDateString,
  IsEnum,
  IsInt,
  IsNumber,
  IsOptional,
  IsString,
  Max,
  Min,
  ValidateIf,
} from 'class-validator';
import { CurrentUser, CurrentUserGuard } from '@/shared/current-user';
import { TransactionType } from '@/modules/finance/entities/transaction.entity';
import {
  TransactionCreateUseCase,
  TransactionCreateUseCaseOutput,
} from '@/modules/finance/use-cases/transaction-create/transaction-create.use-case';

export class TransactionCreateBodyDto {
  @IsString() description!: string;
  @IsNumber() @Min(0.01) amount!: number;
  @IsEnum(TransactionType) type!: TransactionType;
  @ValidateIf((o: TransactionCreateBodyDto) => !o.paymentMethodId) @IsString() paymentMethod?: string;
  @IsOptional() @IsString() paymentMethodId?: string;
  @IsOptional() @IsDateString() date?: string;
  @IsOptional() @IsArray() @IsString({ each: true }) @ArrayMaxSize(10) tags?: string[];
  @IsOptional() @IsArray() @IsString({ each: true }) @ArrayMaxSize(10) tagIds?: string[];
  @IsOptional() @IsInt() @Min(1) @Max(99) installments?: number;
  @IsOptional() @IsString() notes?: string;
}

@Controller('transactions')
@UseGuards(CurrentUserGuard)
export class TransactionCreateController {
  constructor(private readonly useCase: TransactionCreateUseCase) {}

  @Post()
  @HttpCode(201)
  async exec(
    @CurrentUser() userId: string,
    @Body() body: TransactionCreateBodyDto,
  ): Promise<TransactionCreateUseCaseOutput> {
    return this.useCase.exec({ userId, ...body });
  }
}
