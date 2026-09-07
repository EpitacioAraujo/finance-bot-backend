import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { EntityManager, Repository } from 'typeorm';
import { ulid } from 'ulid';
import { TransactionSplitEntity } from '@/modules/finance/entities/transaction-split.entity';
import { PaymentMethodEntity } from '@/modules/finance/entities/payment-method.entity';
import { CycleResolveService } from '../cycle-resolve/cycle-resolve.service';
import { NotFoundError, ValidationError } from '@/shared/errors';
import { addMonths } from '@/shared/date';

/**
 * Divide em centavos e joga a sobra na primeira parcela: a soma bate exatamente
 * com o total. R$ 10 em 3x vira 3,34 / 3,33 / 3,33.
 */
export const splitAmounts = (amount: number, total: number): number[] => {
  const cents = Math.round(amount * 100);
  const base = Math.floor(cents / total);
  const remainder = cents - base * total;
  return Array.from(
    { length: total },
    (_, index) => (base + (index === 0 ? remainder : 0)) / 100,
  );
};

export interface SplitGenerateInput {
  transactionId: string;
  total: number;
  amount: number;
  paymentMethodId: string;
  purchaseDate: string;
  /** Passado pelo use case para cair na mesma transação de banco. */
  manager?: EntityManager;
}

@Injectable()
export class SplitGenerateService {
  constructor(
    @InjectRepository(TransactionSplitEntity)
    private readonly splits: Repository<TransactionSplitEntity>,
    @InjectRepository(PaymentMethodEntity)
    private readonly methods: Repository<PaymentMethodEntity>,
    private readonly cycleResolve: CycleResolveService,
  ) {}

  async exec(input: SplitGenerateInput): Promise<TransactionSplitEntity[]> {
    const repo = input.manager?.getRepository(TransactionSplitEntity) ?? this.splits;

    if (input.total < 2) {
      throw new ValidationError('Parcelamento exige pelo menos 2 parcelas');
    }
    const method = await this.methods.findOne({
      where: { id: input.paymentMethodId },
    });
    if (!method) throw new NotFoundError('Forma de pagamento não encontrada');

    const amounts = splitAmounts(input.amount, input.total);

    const rows: TransactionSplitEntity[] = [];
    for (let number = 1; number <= input.total; number++) {
      const date = addMonths(input.purchaseDate, number - 1);
      const cycle =
        method.kind === 'credit'
          ? await this.cycleResolve.exec({
              paymentMethodId: input.paymentMethodId,
              date,
            })
          : null;

      rows.push(
        repo.create({
          id: ulid(),
          transactionId: input.transactionId,
          number,
          amount: amounts[number - 1],
          dueDate: cycle ? cycle.dueDate : date,
          cycleId: cycle?.id ?? null,
          paidAt: null,
        }),
      );
    }

    return repo.save(rows);
  }
}
