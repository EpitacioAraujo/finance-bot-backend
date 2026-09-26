import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { EntityManager, Repository } from 'typeorm';
import { ulid } from 'ulid';
import { TransactionTrancheEntity } from '@/modules/finance/entities/transaction-tranche.entity';
import {
  PaymentMethodEntity,
  PaymentMethodKind,
} from '@/modules/finance/entities/payment-method.entity';
import { CycleResolveService } from '../cycle-resolve/cycle-resolve.service';
import { NotFoundError, ValidationError } from '@/shared/errors';
import { addMonths, parseIso } from '@/shared/date';

/**
 * Divide em centavos e joga a sobra na primeira tranche: a soma bate exatamente
 * com o total. R$ 10 em 3x vira 3,34 / 3,33 / 3,33.
 */
export const trancheAmounts = (amount: number, total: number): number[] => {
  const cents = Math.round(amount * 100);
  const base = Math.floor(cents / total);
  const remainder = cents - base * total;
  return Array.from(
    { length: total },
    (_, index) => (base + (index === 0 ? remainder : 0)) / 100,
  );
};

/**
 * Fora do crédito, a tranche que vence no ato já nasce paga — o dinheiro saiu no
 * pix, no débito, na mão. No crédito nada nasce pago: quita quando a fatura
 * fecha. Boleto em 10x cai nos dois lados: a 1ª paga, as 9 em aberto.
 */
export const trancheSettledAt = (
  kind: PaymentMethodKind,
  dueDate: string,
  purchaseDate: string,
): Date | null =>
  kind !== 'credit' && dueDate <= purchaseDate ? parseIso(purchaseDate) : null;

export interface TrancheGenerateInput {
  transactionId: string;
  /** 1 = à vista, e mesmo assim gera uma linha. */
  total: number;
  amount: number;
  paymentMethodId: string;
  purchaseDate: string;
  /** Passado pelo use case para cair na mesma transação de banco. */
  manager?: EntityManager;
}

@Injectable()
export class TrancheGenerateService {
  constructor(
    @InjectRepository(TransactionTrancheEntity)
    private readonly tranches: Repository<TransactionTrancheEntity>,
    @InjectRepository(PaymentMethodEntity)
    private readonly methods: Repository<PaymentMethodEntity>,
    private readonly cycleResolve: CycleResolveService,
  ) {}

  async exec(
    input: TrancheGenerateInput,
  ): Promise<TransactionTrancheEntity[]> {
    const repo =
      input.manager?.getRepository(TransactionTrancheEntity) ?? this.tranches;

    if (input.total < 1) {
      throw new ValidationError('O número de parcelas precisa ser pelo menos 1');
    }
    const method = await this.methods.findOne({
      where: { id: input.paymentMethodId },
    });
    if (!method) throw new NotFoundError('Forma de pagamento não encontrada');

    const amounts = trancheAmounts(input.amount, input.total);

    const rows: TransactionTrancheEntity[] = [];
    for (let number = 1; number <= input.total; number++) {
      const date = addMonths(input.purchaseDate, number - 1);
      const cycle =
        method.kind === 'credit'
          ? await this.cycleResolve.exec({
              paymentMethodId: input.paymentMethodId,
              date,
            })
          : null;
      const dueDate = cycle ? cycle.dueDate : date;

      rows.push(
        repo.create({
          id: ulid(),
          transactionId: input.transactionId,
          number,
          amount: amounts[number - 1],
          dueDate,
          cycleId: cycle?.id ?? null,
          paidAt: trancheSettledAt(method.kind, dueDate, input.purchaseDate),
        }),
      );
    }

    return repo.save(rows);
  }
}
