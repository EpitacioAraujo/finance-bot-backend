import { Injectable } from '@nestjs/common';
import { ConsolidatedRepository } from '@/modules/finance/repositories/consolidated/consolidated.repository';
import { BillListService } from '@/modules/finance/services/bill-list/bill-list.service';
import { PaymentMethodListService } from '@/modules/finance/services/payment-method-list/payment-method-list.service';
import { cycleOf } from '@/modules/finance/services/cycle-resolve/cycle-resolve.service';
import { TransactionType } from '@/modules/finance/entities/transaction.entity';
import { addMonths } from '@/shared/date';

/** Uma conta recorrente que cai nesta fatura. Quem paga é a fatura, não ela. */
export interface ConsolidatedLine {
  billId: string;
  key: string;
  description: string;
  /** Dia em que a cobrança cai no cartão. */
  date: string;
  amount: number;
  status: 'paid' | 'pending';
}

export interface ConsolidatedView {
  /** Null quando a fatura ainda não existe no banco: o cartão só tem previsão. */
  cycleId: string | null;
  paymentMethod: { id: string; description: string };
  referenceMonth: string;
  startDate: string;
  endDate: string;
  dueDate: string;
  /** Tranches cobradas + contas previstas ainda não cobradas. */
  total: number;
  itemCount: number;
  closedAt: Date | null;
  /** As contas que caem nesta fatura. Só as pendentes entram no `total`. */
  items: ConsolidatedLine[];
}

export interface ConsolidatedListInput {
  userId: string;
  from: string;
  to: string;
  cycleId?: string;
}

/**
 * A fatura é o que já foi cobrado **mais** o que ainda vai cair nela. Conta
 * recorrente no cartão compõe a fatura em vez de disputar a lista com ela: se a
 * academia é debitada no Nu, ela é parte do Nu, não uma dívida ao lado.
 *
 * A previsão vale enquanto não existe transação apontando para a ocorrência —
 * quando a compra real é registrada, a tranche assume e a previsão sai. É o
 * mesmo mecanismo que já marca uma conta como paga.
 *
 * Cartão sem nenhuma compra não tem ciclo no banco. Nesse caso a fatura sai
 * daqui **virtual**, com `cycleId` nulo: aparece, mas não há o que fechar.
 *
 * `items` lista as contas que caem na fatura, pagas e pendentes — mas só as
 * pendentes somam no total. Uma conta paga já virou compra, e a compra já está
 * lá dentro: contar de novo dobraria o valor.
 */
@Injectable()
export class ConsolidatedListUseCase {
  constructor(
    private readonly repository: ConsolidatedRepository,
    private readonly billList: BillListService,
    private readonly paymentMethodList: PaymentMethodListService,
  ) {}

  async exec(input: ConsolidatedListInput): Promise<ConsolidatedView[]> {
    const [rows, methods] = await Promise.all([
      this.repository.exec(input),
      this.paymentMethodList.exec({ userId: input.userId, activeOnly: false }),
    ]);

    const views: ConsolidatedView[] = rows.map((row) => ({
      cycleId: row.cycle_id,
      paymentMethod: {
        id: row.payment_method_id,
        description: row.payment_method_description,
      },
      referenceMonth: row.reference_month,
      startDate: row.start_date,
      endDate: row.end_date,
      dueDate: row.due_date,
      total: Number(row.total),
      itemCount: Number(row.item_count),
      closedAt: row.closed_at,
      items: [],
    }));

    const credit = new Map(
      methods
        .filter((method) => cycleOf(method, input.from) !== null)
        .map((method) => [method.id, method]),
    );

    // Uma cobrança de hoje pode cair numa fatura que só vence dois meses
    // depois, então a janela das contas é maior que a das faturas.
    const bills = credit.size
      ? (
          await this.billList.exec({
            userId: input.userId,
            from: addMonths(input.from, -2),
            to: input.to,
            type: TransactionType.Expense,
          })
        ).items
      : [];

    for (const bill of bills) {
      const method = credit.get(bill.paymentMethod.id);
      if (!method) continue;

      const window = cycleOf(method, bill.occurrenceDate);
      if (!window) continue;
      if (window.dueDate < input.from || window.dueDate > input.to) continue;

      const existing = views.find(
        (view) =>
          view.paymentMethod.id === method.id &&
          view.referenceMonth === window.referenceMonth,
      );

      // Fatura fechada não recebe previsão: o que foi cobrado é o que foi.
      if (existing?.closedAt) continue;

      const line: ConsolidatedLine = {
        billId: bill.id,
        key: `${bill.id}-${bill.occurrenceDate}`,
        description: bill.description,
        date: bill.occurrenceDate,
        amount: bill.predictedAmount,
        status: bill.paid ? 'paid' : 'pending',
      };

      if (existing) {
        if (!bill.paid) {
          existing.total += bill.predictedAmount;
          existing.itemCount += 1;
        }
        existing.items.push(line);
        continue;
      }

      // Conta já paga não abre fatura sozinha: a compra dela é que faz isso.
      if (bill.paid) continue;

      // Pedir uma fatura por id é pedir uma que existe; não se inventa virtual.
      if (input.cycleId) continue;

      views.push({
        cycleId: null,
        paymentMethod: { id: method.id, description: method.description },
        referenceMonth: window.referenceMonth,
        startDate: window.startDate,
        endDate: window.endDate,
        dueDate: window.dueDate,
        total: bill.predictedAmount,
        itemCount: 1,
        closedAt: null,
        items: [line],
      });
    }

    // Fatura sem nada dentro não é fatura. Ciclo nasce na primeira compra e
    // sobrevive a ela ser apagada, então sobra vazio pelo caminho. O filtro vem
    // depois das previsões: fatura que só tem conta prevista continua de pé.
    for (const view of views) {
      view.items.sort((a, b) => a.date.localeCompare(b.date));
    }

    return views
      .filter((view) => view.itemCount > 0)
      .sort((a, b) => a.dueDate.localeCompare(b.dueDate));
  }
}
