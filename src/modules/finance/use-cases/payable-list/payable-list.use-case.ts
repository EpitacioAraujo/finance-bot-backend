import { Injectable } from '@nestjs/common';
import {
  BillListService,
  BillSummary,
} from '@/modules/finance/services/bill-list/bill-list.service';
import { ConsolidatedListUseCase } from '@/modules/finance/use-cases/consolidated-list/consolidated-list.use-case';
import { TransactionType } from '@/modules/finance/entities/transaction.entity';

export interface PayableListInput {
  userId: string;
  from: string;
  to: string;
  status?: 'paid' | 'pending';
  /** Omitido, lista a pagar e a receber juntas; o item diz qual é. */
  type?: TransactionType;
}

export interface PayableItem {
  kind: 'bill' | 'cycle';
  /** Fatura é sempre expense; conta carrega o dela. */
  type: TransactionType;
  /**
   * bill.id ou cycle.id — é o que vai na URL de pay/edit/delete. Nulo só na
   * fatura que ainda não existe no banco: não há o que pagar nem abrir.
   */
  id: string | null;
  /** Chave de linha: conta recorrente repete `id` por ocorrência. */
  key: string;
  /** bill: description · cycle: `Fatura ${paymentMethod.description}` */
  description: string;
  /** 'YYYY-MM-DD' nos dois casos. */
  dueDate: string;
  /** bill: paidAmount ?? predictedAmount · cycle: total */
  amount: number;
  /** bill: paid · cycle: closedAt !== null */
  status: 'paid' | 'pending';
  paymentMethod: { id: string; description: string };
  /** Só cycle: compras na fatura. */
  itemCount: number | null;
  /** Só cycle: a janela que a fatura cobra — o vencimento sozinho não diz. */
  period: { startDate: string; endDate: string } | null;
}

export interface PayableListOutput {
  /** Conta + fatura numa lista só, ordenada por dueDate. */
  items: PayableItem[];
  /** Cobre conta e fatura juntas; o filtro de status só corta `items`. */
  summary: BillSummary;
}

/**
 * "Contas a pagar" na tela é conta + fatura de cartão, que vivem em serviços
 * diferentes. Juntar, nivelar o status e somar tem que sair daqui: fazer isso
 * no cliente espalharia regra de negócio pelo front.
 *
 * Conta no cartão não aparece como linha própria — ela já está somada dentro da
 * fatura daquele cartão. Mostrar as duas contaria o mesmo dinheiro duas vezes.
 */
@Injectable()
export class PayableListUseCase {
  constructor(
    private readonly billList: BillListService,
    private readonly consolidatedList: ConsolidatedListUseCase,
  ) {}

  async exec({
    userId,
    from,
    to,
    status,
    type,
  }: PayableListInput): Promise<PayableListOutput> {
    // Sem `status` aqui de propósito: o filtro é aplicado no fim, sobre conta e
    // fatura juntas, e o resumo precisa enxergar a janela inteira.
    // Fatura de cartão é sempre despesa: só fica de fora quando se pede a receber.
    const [bills, cycles] = await Promise.all([
      this.billList.exec({ userId, from, to, type }),
      type === TransactionType.Income
        ? []
        : this.consolidatedList.exec({ userId, from, to }),
    ]);

    const own = bills.items.filter(
      (bill) => bill.paymentMethod.kind !== 'credit',
    );

    const cycleTotal = cycles.reduce((acc, cycle) => acc + cycle.total, 0);
    // A fatura fechada é o equivalente da conta paga.
    const cyclePaid = cycles.reduce(
      (acc, cycle) => acc + (cycle.closedAt ? cycle.total : 0),
      0,
    );

    const items: PayableItem[] = [
      ...own.map((bill) => ({
        kind: 'bill' as const,
        type: bill.type,
        id: bill.id,
        key: `${bill.id}-${bill.occurrenceDate}`,
        description: bill.description,
        dueDate: bill.occurrenceDate,
        amount: bill.paidAmount ?? bill.predictedAmount,
        status: bill.paid ? ('paid' as const) : ('pending' as const),
        paymentMethod: {
          id: bill.paymentMethod.id,
          description: bill.paymentMethod.description,
        },
        itemCount: null,
        period: null,
      })),
      ...cycles.map((cycle) => ({
        kind: 'cycle' as const,
        type: TransactionType.Expense,
        id: cycle.cycleId,
        key: cycle.cycleId ?? `${cycle.paymentMethod.id}-${cycle.referenceMonth}`,
        description: `Fatura ${cycle.paymentMethod.description}`,
        dueDate: cycle.dueDate,
        amount: cycle.total,
        status: cycle.closedAt ? ('paid' as const) : ('pending' as const),
        paymentMethod: cycle.paymentMethod,
        itemCount: cycle.itemCount,
        period: { startDate: cycle.startDate, endDate: cycle.endDate },
      })),
    ];

    return {
      items: items
        .filter((item) => !status || item.status === status)
        .sort((a, b) => a.dueDate.localeCompare(b.dueDate)),
      summary: own.reduce(
        (acc, bill) => ({
          totalPredicted: acc.totalPredicted + bill.predictedAmount,
          totalPaid: acc.totalPaid + (bill.paidAmount ?? 0),
          totalPending:
            acc.totalPending + (bill.paid ? 0 : bill.predictedAmount),
        }),
        {
          totalPredicted: cycleTotal,
          totalPaid: cyclePaid,
          totalPending: cycleTotal - cyclePaid,
        },
      ),
    };
  }
}
