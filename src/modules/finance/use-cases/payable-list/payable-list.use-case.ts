import { Injectable } from '@nestjs/common';
import {
  BillListService,
  BillSummary,
} from '@/modules/finance/services/bill-list/bill-list.service';
import { ConsolidatedListService } from '@/modules/finance/services/consolidated-list/consolidated-list.service';
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
  /** bill.id ou cycle.id — é o que vai na URL de pay/edit/delete. */
  id: string;
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
 */
@Injectable()
export class PayableListUseCase {
  constructor(
    private readonly billList: BillListService,
    private readonly consolidatedList: ConsolidatedListService,
  ) {}

  async exec({
    userId,
    from,
    to,
    status,
    type,
  }: PayableListInput): Promise<PayableListOutput> {
    // Fatura de cartão é sempre despesa: só fica de fora quando se pede a receber.
    const [bills, cycles] = await Promise.all([
      this.billList.exec({ userId, from, to, status, type }),
      type === TransactionType.Income
        ? []
        : this.consolidatedList.exec({ userId, from, to }),
    ]);

    // A fatura fechada é o equivalente da conta paga.
    const cycleTotal = cycles.reduce((acc, cycle) => acc + cycle.total, 0);
    const cyclePaid = cycles.reduce(
      (acc, cycle) => acc + (cycle.closedAt ? cycle.total : 0),
      0,
    );

    const items: PayableItem[] = [
      ...bills.items.map((bill) => ({
        kind: 'bill' as const,
        type: bill.type,
        id: bill.id,
        key: `${bill.id}-${bill.occurrenceDate}`,
        description: bill.description,
        dueDate: bill.occurrenceDate,
        amount: bill.paidAmount ?? bill.predictedAmount,
        status: bill.paid ? ('paid' as const) : ('pending' as const),
        paymentMethod: bill.paymentMethod,
        itemCount: null,
      })),
      ...cycles.map((cycle) => ({
        kind: 'cycle' as const,
        type: TransactionType.Expense,
        id: cycle.cycleId,
        key: cycle.cycleId,
        description: `Fatura ${cycle.paymentMethod.description}`,
        dueDate: cycle.dueDate,
        amount: cycle.total,
        status: cycle.closedAt ? ('paid' as const) : ('pending' as const),
        paymentMethod: cycle.paymentMethod,
        itemCount: cycle.itemCount,
      })),
    ];

    return {
      items: items
        .filter((item) => !status || item.status === status)
        .sort((a, b) => a.dueDate.localeCompare(b.dueDate)),
      summary: {
        totalPredicted: bills.summary.totalPredicted + cycleTotal,
        totalPaid: bills.summary.totalPaid + cyclePaid,
        totalPending: bills.summary.totalPending + (cycleTotal - cyclePaid),
      },
    };
  }
}
