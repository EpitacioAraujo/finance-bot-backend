import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { UserEntity } from './entities/user.entity';
import { PaymentMethodEntity } from './entities/payment-method.entity';
import { PaymentMethodCycleEntity } from './entities/payment-method-cycle.entity';
import { TagEntity } from './entities/tag.entity';
import { TransactionEntity } from './entities/transaction.entity';
import { TransactionTrancheEntity } from './entities/transaction-tranche.entity';
import { BillEntity } from './entities/bill.entity';

import { UserResolveService } from './services/user-resolve/user-resolve.service';
import { PaymentMethodResolveService } from './services/payment-method-resolve/payment-method-resolve.service';
import { TagResolveService } from './services/tag-resolve/tag-resolve.service';
import { CycleResolveService } from './services/cycle-resolve/cycle-resolve.service';
import { TransactionCreateService } from './services/transaction-create/transaction-create.service';
import { TransactionListService } from './services/transaction-list/transaction-list.service';
import { TransactionGetService } from './services/transaction-get/transaction-get.service';
import { TransactionUpdateService } from './services/transaction-update/transaction-update.service';
import { TransactionDeleteService } from './services/transaction-delete/transaction-delete.service';
import { TrancheGenerateService } from './services/tranche-generate/tranche-generate.service';
import { TrancheListService } from './services/tranche-list/tranche-list.service';
import { TrancheDueListService } from './services/tranche-due-list/tranche-due-list.service';
import { TranchePayService } from './services/tranche-pay/tranche-pay.service';
import { PaymentMethodCreateService } from './services/payment-method-create/payment-method-create.service';
import { PaymentMethodListService } from './services/payment-method-list/payment-method-list.service';
import { PaymentMethodUpdateService } from './services/payment-method-update/payment-method-update.service';
import { TagCreateService } from './services/tag-create/tag-create.service';
import { TagListService } from './services/tag-list/tag-list.service';
import { BillCreateService } from './services/bill-create/bill-create.service';
import { BillListService } from './services/bill-list/bill-list.service';
import { MonthUseCase } from './use-cases/month/month.use-case';
import { BillUpdateService } from './services/bill-update/bill-update.service';
import { BillDeleteService } from './services/bill-delete/bill-delete.service';
import { ReportService } from './services/report/report.service';
import { ConsolidatedListUseCase } from './use-cases/consolidated-list/consolidated-list.use-case';
import { ConsolidatedPayService } from './services/consolidated-pay/consolidated-pay.service';
import { CycleGetService } from './services/cycle-get/cycle-get.service';
import { ConsolidatedPayUseCase } from './use-cases/consolidated-pay/consolidated-pay.use-case';

import { ReportRepository } from './repositories/report/report.repository';
import { ConsolidatedRepository } from './repositories/consolidated/consolidated.repository';

import { TransactionCreateController } from './controllers/transaction-create/transaction-create.controller';
import { TransactionUpdateController } from './controllers/transaction-update/transaction-update.controller';
import { TransactionDeleteController } from './controllers/transaction-delete/transaction-delete.controller';
import { PaymentMethodCreateController } from './controllers/payment-method-create/payment-method-create.controller';
import { PaymentMethodUpdateController } from './controllers/payment-method-update/payment-method-update.controller';
import { MonthController } from './controllers/month/month.controller';
import { BillCreateController } from './controllers/bill-create/bill-create.controller';
import { BillUpdateController } from './controllers/bill-update/bill-update.controller';
import { BillDeleteController } from './controllers/bill-delete/bill-delete.controller';
import { BillPayController } from './controllers/bill-pay/bill-pay.controller';
import { ConsolidatedPayController } from './controllers/consolidated-pay/consolidated-pay.controller';

import { TransactionCreateUseCase } from './use-cases/transaction-create/transaction-create.use-case';
import { TransactionUpdateUseCase } from './use-cases/transaction-update/transaction-update.use-case';
import { BillPayUseCase } from './use-cases/bill-pay/bill-pay.use-case';

const providers = [
  UserResolveService,
  PaymentMethodResolveService,
  TagResolveService,
  CycleResolveService,
  TransactionCreateService,
  TransactionListService,
  TransactionGetService,
  TransactionUpdateService,
  TransactionDeleteService,
  TrancheGenerateService,
  TrancheListService,
  TrancheDueListService,
  TranchePayService,
  PaymentMethodCreateService,
  PaymentMethodListService,
  PaymentMethodUpdateService,
  TagCreateService,
  TagListService,
  BillCreateService,
  BillListService,
  MonthUseCase,
  BillUpdateService,
  BillDeleteService,
  ReportService,
  ConsolidatedListUseCase,
  ConsolidatedPayService,
  ConsolidatedPayUseCase,
  CycleGetService,
  ReportRepository,
  ConsolidatedRepository,
  TransactionCreateUseCase,
  TransactionUpdateUseCase,
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
      TransactionTrancheEntity,
      BillEntity,
    ]),
  ],
  controllers: [
    TransactionCreateController,
    TransactionUpdateController,
    TransactionDeleteController,
    PaymentMethodCreateController,
    PaymentMethodUpdateController,
    MonthController,
    BillCreateController,
    BillUpdateController,
    BillDeleteController,
    BillPayController,
    ConsolidatedPayController,
  ],
  providers,
  exports: providers,
})
export class FinanceModule {}
