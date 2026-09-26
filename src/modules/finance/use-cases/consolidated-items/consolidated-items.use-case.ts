import { Injectable } from '@nestjs/common';
import {
  ConsolidatedItemsService,
  ConsolidatedItemView,
} from '@/modules/finance/services/consolidated-items/consolidated-items.service';
import { BillListService } from '@/modules/finance/services/bill-list/bill-list.service';
import { TransactionType } from '@/modules/finance/entities/transaction.entity';

/**
 * Duas formas de pedir a mesma coisa, porque a fatura tem duas formas de
 * existir. Com `cycleId` é a fatura do banco: tranches cobradas mais as contas
 * previstas da janela. Sem ele é a fatura virtual — cartão que ainda não teve
 * compra nenhuma, então só há previsão, e a janela vem de quem chamou porque a
 * lista já a calculou.
 *
 * Sem as previsões aqui o total da fatura não bateria com a soma das linhas.
 */
export interface ConsolidatedItemsInput {
  userId: string;
  cycleId?: string;
  /** Fatura virtual: o cartão e a janela que ela cobre. */
  paymentMethodId?: string;
  from?: string;
  to?: string;
}

@Injectable()
export class ConsolidatedItemsUseCase {
  constructor(
    private readonly items: ConsolidatedItemsService,
    private readonly billList: BillListService,
  ) {}

  async exec({
    userId,
    cycleId,
    paymentMethodId,
    from,
    to,
  }: ConsolidatedItemsInput): Promise<ConsolidatedItemView[]> {
    const cycle = cycleId
      ? await this.items.exec({ userId, cycleId })
      : {
          cycle: {
            paymentMethodId: paymentMethodId ?? '',
            startDate: from ?? '',
            endDate: to ?? '',
            closedAt: null,
          },
          items: [],
        };

    // Fatura fechada não recebe previsão: o que foi cobrado é o que foi.
    if (cycle.cycle.closedAt) return cycle.items;

    // `BillListService` já é escopado por usuário, então filtrar por cartão aqui
    // não abre porta para a fatura de outra pessoa.
    const bills = await this.billList.exec({
      userId,
      from: cycle.cycle.startDate,
      to: cycle.cycle.endDate,
      type: TransactionType.Expense,
      status: 'pending',
    });

    const predicted = bills.items
      .filter((bill) => bill.paymentMethod.id === cycle.cycle.paymentMethodId)
      .map((bill) => ({
        id: `${bill.id}-${bill.occurrenceDate}`,
        transactionId: null,
        billId: bill.id,
        description: bill.description,
        amount: bill.predictedAmount,
        date: bill.occurrenceDate,
        tranche: null,
        paidAt: null,
        predicted: true,
      }));

    return [...cycle.items, ...predicted].sort((a, b) =>
      a.date.localeCompare(b.date),
    );
  }
}
