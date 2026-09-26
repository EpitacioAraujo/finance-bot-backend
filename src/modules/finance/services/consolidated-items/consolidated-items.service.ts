import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { PaymentMethodCycleEntity } from '@/modules/finance/entities/payment-method-cycle.entity';
import { PaymentMethodEntity } from '@/modules/finance/entities/payment-method.entity';
import { TransactionTrancheEntity } from '@/modules/finance/entities/transaction-tranche.entity';
import { NotFoundError } from '@/shared/errors';

export interface ConsolidatedItemView {
  id: string;
  /** Nulo na previsão: conta recorrente ainda não virou compra. */
  transactionId: string | null;
  /** Preenchido só na previsão: é por ele que se edita ou apaga a conta. */
  billId: string | null;
  description: string;
  amount: number;
  /** Data da compra, não do vencimento. */
  date: string;
  /** '3/10'; nulo quando a compra tem uma tranche só — na tela, '1/1' é ruído. */
  tranche: string | null;
  paidAt: Date | null;
  /** True quando é conta recorrente prevista, ainda não cobrada. */
  predicted: boolean;
}

export interface ConsolidatedItemsResult {
  /** A janela da fatura — é o que diz quais previsões caem dentro dela. */
  cycle: {
    paymentMethodId: string;
    startDate: string;
    endDate: string;
    closedAt: Date | null;
  };
  items: ConsolidatedItemView[];
}

@Injectable()
export class ConsolidatedItemsService {
  constructor(
    @InjectRepository(PaymentMethodCycleEntity)
    private readonly cycles: Repository<PaymentMethodCycleEntity>,
    @InjectRepository(PaymentMethodEntity)
    private readonly methods: Repository<PaymentMethodEntity>,
    @InjectRepository(TransactionTrancheEntity)
    private readonly tranches: Repository<TransactionTrancheEntity>,
  ) {}

  async exec({
    userId,
    cycleId,
  }: {
    userId: string;
    cycleId: string;
  }): Promise<ConsolidatedItemsResult> {
    const cycle = await this.cycles.findOne({ where: { id: cycleId } });
    if (!cycle) throw new NotFoundError('Fatura não encontrada');

    const owned = await this.methods.findOne({
      where: { id: cycle.paymentMethodId, userId },
    });
    if (!owned) throw new NotFoundError('Fatura não encontrada');

    // As tranches irmãs vêm junto só para dizer o "de quantas" do 3/10 — é o
    // que substituiu a coluna `installments`.
    const items = await this.tranches.find({
      where: { cycleId, transaction: { userId } },
      relations: { transaction: { tranches: true } },
    });

    return {
      cycle: {
        paymentMethodId: cycle.paymentMethodId,
        startDate: cycle.startDate,
        endDate: cycle.endDate,
        closedAt: cycle.closedAt,
      },
      items: items
        .map((item) => {
          const total = item.transaction?.tranches?.length ?? 1;
          return {
            id: item.id,
            transactionId: item.transactionId,
            description: item.transaction?.description ?? '',
            amount: item.amount,
            date: item.transaction?.date ?? item.dueDate,
            billId: null,
            tranche: total > 1 ? `${item.number}/${total}` : null,
            paidAt: item.paidAt,
            predicted: false,
          };
        })
        .sort((a, b) => a.date.localeCompare(b.date)),
    };
  }
}
