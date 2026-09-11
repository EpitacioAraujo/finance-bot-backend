import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { PaymentMethodCycleEntity } from '@/modules/finance/entities/payment-method-cycle.entity';
import { PaymentMethodEntity } from '@/modules/finance/entities/payment-method.entity';
import { TransactionEntity } from '@/modules/finance/entities/transaction.entity';
import { TransactionSplitEntity } from '@/modules/finance/entities/transaction-split.entity';
import { NotFoundError } from '@/shared/errors';

export interface ConsolidatedItemView {
  id: string;
  transactionId: string;
  description: string;
  amount: number;
  /** Data da compra, não do vencimento. */
  date: string;
  /** '3/10' quando é parcela; nulo quando a compra foi à vista. */
  installment: string | null;
  paidAt: Date | null;
}

@Injectable()
export class ConsolidatedItemsService {
  constructor(
    @InjectRepository(PaymentMethodCycleEntity)
    private readonly cycles: Repository<PaymentMethodCycleEntity>,
    @InjectRepository(PaymentMethodEntity)
    private readonly methods: Repository<PaymentMethodEntity>,
    @InjectRepository(TransactionEntity)
    private readonly transactions: Repository<TransactionEntity>,
    @InjectRepository(TransactionSplitEntity)
    private readonly splits: Repository<TransactionSplitEntity>,
  ) {}

  async exec({
    userId,
    cycleId,
  }: {
    userId: string;
    cycleId: string;
  }): Promise<ConsolidatedItemView[]> {
    const cycle = await this.cycles.findOne({ where: { id: cycleId } });
    if (!cycle) throw new NotFoundError('Fatura não encontrada');

    const owned = await this.methods.findOne({
      where: { id: cycle.paymentMethodId, userId },
    });
    if (!owned) throw new NotFoundError('Fatura não encontrada');

    // Mesma trava do total: à vista guarda o ciclo na transação, parcelado
    // guarda em cada parcela. Sem `installments = 1` a compra parcelada entraria
    // duas vezes.
    const [transactions, splits] = await Promise.all([
      this.transactions.find({
        where: { userId, cycleId, installments: 1 },
      }),
      this.splits.find({
        where: { cycleId, transaction: { userId } },
        relations: { transaction: true },
      }),
    ]);

    const items: ConsolidatedItemView[] = [
      ...transactions.map((transaction) => ({
        id: transaction.id,
        transactionId: transaction.id,
        description: transaction.description,
        amount: transaction.amount,
        date: transaction.date,
        installment: null,
        paidAt: null,
      })),
      ...splits.map((split) => ({
        id: split.id,
        transactionId: split.transactionId,
        description: split.transaction?.description ?? '',
        amount: split.amount,
        date: split.transaction?.date ?? split.dueDate,
        installment: `${split.number}/${split.transaction?.installments ?? '?'}`,
        paidAt: split.paidAt,
      })),
    ];

    return items.sort((a, b) => a.date.localeCompare(b.date));
  }
}
