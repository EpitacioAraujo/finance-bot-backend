import { Body, Controller, HttpCode, Post, UseGuards } from '@nestjs/common';
import { ArrayMaxSize, ArrayMinSize, IsArray, IsString } from 'class-validator';
import { CurrentUser, CurrentUserGuard } from '@/shared/current-user';
import { TransactionDeleteService } from '@/modules/finance/services/transaction-delete/transaction-delete.service';

export class TransactionBulkDeleteBodyDto {
  @IsArray() @ArrayMinSize(1) @ArrayMaxSize(200) @IsString({ each: true }) ids!: string[];
}

@Controller('transactions')
@UseGuards(CurrentUserGuard)
export class TransactionBulkDeleteController {
  constructor(private readonly service: TransactionDeleteService) {}

  @Post('bulk-delete')
  @HttpCode(204)
  async exec(
    @CurrentUser() userId: string,
    @Body() body: TransactionBulkDeleteBodyDto,
  ): Promise<void> {
    await this.service.exec({ userId, ids: body.ids });
  }
}
