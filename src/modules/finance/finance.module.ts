import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { UserEntity } from './entities/user.entity';
import { PaymentMethodEntity } from './entities/payment-method.entity';
import { PaymentMethodCycleEntity } from './entities/payment-method-cycle.entity';
import { TagEntity } from './entities/tag.entity';
import { TransactionEntity } from './entities/transaction.entity';
import { TransactionSplitEntity } from './entities/transaction-split.entity';
import { BillEntity } from './entities/bill.entity';

import { UserResolveService } from './services/user-resolve/user-resolve.service';
import { PaymentMethodResolveService } from './services/payment-method-resolve/payment-method-resolve.service';
import { TagResolveService } from './services/tag-resolve/tag-resolve.service';
import { CycleResolveService } from './services/cycle-resolve/cycle-resolve.service';
import { TransactionCreateService } from './services/transaction-create/transaction-create.service';
import { TransactionListService } from './services/transaction-list/transaction-list.service';
import { TransactionUpdateService } from './services/transaction-update/transaction-update.service';
import { TransactionDeleteService } from './services/transaction-delete/transaction-delete.service';
import { SplitGenerateService } from './services/split-generate/split-generate.service';
import { SplitListService } from './services/split-list/split-list.service';
import { SplitPayService } from './services/split-pay/split-pay.service';
import { PaymentMethodCreateService } from './services/payment-method-create/payment-method-create.service';
import { PaymentMethodListService } from './services/payment-method-list/payment-method-list.service';
import { PaymentMethodUpdateService } from './services/payment-method-update/payment-method-update.service';
import { PaymentMethodDeleteService } from './services/payment-method-delete/payment-method-delete.service';
import { TagCreateService } from './services/tag-create/tag-create.service';
import { TagListService } from './services/tag-list/tag-list.service';
import { TagUpdateService } from './services/tag-update/tag-update.service';
import { TagDeleteService } from './services/tag-delete/tag-delete.service';
import { BillCreateService } from './services/bill-create/bill-create.service';
import { BillListService } from './services/bill-list/bill-list.service';
import { BillUpdateService } from './services/bill-update/bill-update.service';
import { BillDeleteService } from './services/bill-delete/bill-delete.service';
import { ReportService } from './services/report/report.service';
import { ConsolidatedListService } from './services/consolidated-list/consolidated-list.service';
import { ConsolidatedPayService } from './services/consolidated-pay/consolidated-pay.service';

import { ReportRepository } from './repositories/report/report.repository';
import { ConsolidatedRepository } from './repositories/consolidated/consolidated.repository';

import { TransactionListController } from './controllers/transaction-list/transaction-list.controller';
import { TransactionCreateController } from './controllers/transaction-create/transaction-create.controller';
import { TransactionUpdateController } from './controllers/transaction-update/transaction-update.controller';
import { TransactionDeleteController } from './controllers/transaction-delete/transaction-delete.controller';
import { SplitPayController } from './controllers/split-pay/split-pay.controller';
import { PaymentMethodListController } from './controllers/payment-method-list/payment-method-list.controller';
import { PaymentMethodCreateController } from './controllers/payment-method-create/payment-method-create.controller';
import { PaymentMethodUpdateController } from './controllers/payment-method-update/payment-method-update.controller';
import { PaymentMethodDeleteController } from './controllers/payment-method-delete/payment-method-delete.controller';
import { TagListController } from './controllers/tag-list/tag-list.controller';
import { TagCreateController } from './controllers/tag-create/tag-create.controller';
import { TagUpdateController } from './controllers/tag-update/tag-update.controller';
import { TagDeleteController } from './controllers/tag-delete/tag-delete.controller';
import { BillListController } from './controllers/bill-list/bill-list.controller';
import { BillCreateController } from './controllers/bill-create/bill-create.controller';
import { BillUpdateController } from './controllers/bill-update/bill-update.controller';
import { BillDeleteController } from './controllers/bill-delete/bill-delete.controller';
import { BillPayController } from './controllers/bill-pay/bill-pay.controller';
import { ConsolidatedListController } from './controllers/consolidated-list/consolidated-list.controller';
import { ConsolidatedPayController } from './controllers/consolidated-pay/consolidated-pay.controller';
import { ReportController } from './controllers/report/report.controller';

import { TransactionCreateUseCase } from './use-cases/transaction-create/transaction-create.use-case';
import { BillPayUseCase } from './use-cases/bill-pay/bill-pay.use-case';

const providers = [
  UserResolveService,
  PaymentMethodResolveService,
  TagResolveService,
  CycleResolveService,
  TransactionCreateService,
  TransactionListService,
  TransactionUpdateService,
  TransactionDeleteService,
  SplitGenerateService,
  SplitListService,
  SplitPayService,
  PaymentMethodCreateService,
  PaymentMethodListService,
  PaymentMethodUpdateService,
  PaymentMethodDeleteService,
  TagCreateService,
  TagListService,
  TagUpdateService,
  TagDeleteService,
  BillCreateService,
  BillListService,
  BillUpdateService,
  BillDeleteService,
  ReportService,
  ConsolidatedListService,
  ConsolidatedPayService,
  ReportRepository,
  ConsolidatedRepository,
  TransactionCreateUseCase,
  BillPayUseCase,
];

/** O núcleo. Não importa nenhum outro módulo. */
@Module({
  imports: [
    TypeOrmModule.forFeature([
      UserEntity,
      PaymentMethodEntity,
      PaymentMethodCycleEntity,
      TagEntity,
      TransactionEntity,
      TransactionSplitEntity,
      BillEntity,
    ]),
  ],
  controllers: [
    TransactionListController,
    TransactionCreateController,
    TransactionUpdateController,
    TransactionDeleteController,
    SplitPayController,
    PaymentMethodListController,
    PaymentMethodCreateController,
    PaymentMethodUpdateController,
    PaymentMethodDeleteController,
    TagListController,
    TagCreateController,
    TagUpdateController,
    TagDeleteController,
    BillListController,
    BillCreateController,
    BillUpdateController,
    BillDeleteController,
    BillPayController,
    ConsolidatedListController,
    ConsolidatedPayController,
    ReportController,
  ],
  providers,
  exports: providers,
})
export class FinanceModule {}
