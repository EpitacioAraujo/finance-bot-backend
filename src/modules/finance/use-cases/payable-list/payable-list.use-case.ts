import { Injectable } from '@nestjs/common';
import {
  BillListService,
  BillSummary,
  BillView,
} from '@/modules/finance/services/bill-list/bill-list.service';
import {
  ConsolidatedListService,
  ConsolidatedView,
} from '@/modules/finance/services/consolidated-list/consolidated-list.service';

export interface PayableListInput {
  userId: string;
  from: string;
  to: string;
  status?: 'paid' | 'pending';
}

export interface PayableListOutput {
  bills: BillView[];
  cycles: ConsolidatedView[];
  /** Cobre conta e fatura juntas; o filtro de status só corta as listas. */
  summary: BillSummary;
}

/**
 * "Contas a pagar" na tela é conta + fatura de cartão, que vivem em serviços
 * diferentes. O total tem que sair daqui: somar os dois no cliente espalharia
 * regra de negócio pelo front.
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
  }: PayableListInput): Promise<PayableListOutput> {
    const [bills, cycles] = await Promise.all([
      this.billList.exec({ userId, from, to, status }),
      this.consolidatedList.exec({ userId, from, to }),
    ]);

    // A fatura fechada é o equivalente da conta paga.
    const cycleTotal = cycles.reduce((acc, cycle) => acc + cycle.total, 0);
    const cyclePaid = cycles.reduce(
      (acc, cycle) => acc + (cycle.closedAt ? cycle.total : 0),
      0,
    );

    return {
      bills: bills.items,
      cycles: status
        ? cycles.filter(
            (cycle) => Boolean(cycle.closedAt) === (status === 'paid'),
          )
        : cycles,
      summary: {
        totalPredicted: bills.summary.totalPredicted + cycleTotal,
        totalPaid: bills.summary.totalPaid + cyclePaid,
        totalPending: bills.summary.totalPending + (cycleTotal - cyclePaid),
      },
    };
  }
}
