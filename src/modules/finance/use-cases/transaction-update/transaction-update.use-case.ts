import { Injectable } from '@nestjs/common';
import { InjectDataSource } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';
import { TransactionTrancheEntity } from '@/modules/finance/entities/transaction-tranche.entity';
import { TransactionUpdateService } from '@/modules/finance/services/transaction-update/transaction-update.service';
import { TrancheGenerateService } from '@/modules/finance/services/tranche-generate/tranche-generate.service';
import { TransactionGetService } from '@/modules/finance/services/transaction-get/transaction-get.service';
import {
  TransactionView,
  toTransactionView,
} from '@/modules/finance/services/transaction-list/transaction-list.service';
import { ConflictError } from '@/shared/errors';

export interface TransactionUpdateUseCaseInput {
  userId: string;
  id: string;
  description?: string;
  amount?: number;
  date?: string;
  paymentMethodId?: string;
  tagIds?: string[];
  notes?: string | null;
}

/**
 * Valor, data e forma de pagamento definem as tranches: mudar um deles sem
 * refazê-las deixaria a fatura cobrando o que a compra não é mais. Descrição,
 * tag e nota não tocam em nada disso e passam direto.
 */
@Injectable()
export class TransactionUpdateUseCase {
  constructor(
    @InjectDataSource() private readonly dataSource: DataSource,
    private readonly transactionGet: TransactionGetService,
    private readonly transactionUpdate: TransactionUpdateService,
    private readonly trancheGenerate: TrancheGenerateService,
  ) {}

  async exec(input: TransactionUpdateUseCaseInput): Promise<TransactionView> {
    const current = await this.transactionGet.exec({
      userId: input.userId,
      id: input.id,
    });

    const amount = input.amount ?? current.amount;
    const date = input.date ?? current.date;
    const paymentMethodId = input.paymentMethodId ?? current.paymentMethodId;
    const regenerate =
      amount !== current.amount ||
      date !== current.date ||
      paymentMethodId !== current.paymentMethodId;

    // Tranche de crédito já quitada é dinheiro que saiu na fatura: refazê-la
    // mudaria um total que o usuário pagou. Fora do crédito a tranche nasce
    // paga, então o teste é o `cycleId`, não o `paidAt` sozinho.
    const settled = current.tranches.find(
      (tranche) => tranche.cycleId && tranche.paidAt,
    );
    if (regenerate && settled) {
      throw new ConflictError(
        `A parcela ${settled.number} já foi quitada na fatura: apague o lançamento em vez de alterá-lo`,
      );
    }

    return this.dataSource.transaction(async (manager) => {
      const transaction = await this.transactionUpdate.exec({
        ...input,
        manager,
      });

      if (!regenerate) {
        return toTransactionView(
          Object.assign(transaction, { tranches: current.tranches }),
        );
      }

      // Apaga de verdade: o unique (transaction_id, number) não olha deleted_at,
      // então a tranche 1 nova bateria na antiga.
      await manager
        .getRepository(TransactionTrancheEntity)
        .delete({ transactionId: transaction.id });

      const tranches = await this.trancheGenerate.exec({
        transactionId: transaction.id,
        total: current.tranches.length,
        amount,
        paymentMethodId,
        purchaseDate: date,
        manager,
      });

      return toTransactionView(Object.assign(transaction, { tranches }));
    });
  }
}
