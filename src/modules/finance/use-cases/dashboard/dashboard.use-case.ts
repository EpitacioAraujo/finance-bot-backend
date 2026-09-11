import { Injectable } from '@nestjs/common';
import { ReportService } from '@/modules/finance/services/report/report.service';
import { PayableListUseCase } from '@/modules/finance/use-cases/payable-list/payable-list.use-case';

export interface DashboardLine {
  key: string;
  label: string;
  total: number;
}

export interface DashboardOutput {
  totalIncome: number;
  /** Realizado + o que ainda vence no mês. */
  totalExpense: number;
  balance: number;
  /** Despesa por forma de pagamento: lançamento do mês + fatura em aberto. */
  byPaymentMethod: DashboardLine[];
  /** Conta a vencer não tem forma de pagamento útil aqui — cada uma na sua linha. */
  pendingBills: DashboardLine[];
}

/**
 * Despesa do mês aqui é caixa + compromisso: o que já saiu mais fatura em
 * aberto e conta a vencer. Como a compra parcelada já entrou como despesa
 * inteira na data da compra, a parcela dela reaparece nos meses seguintes por
 * esta via — é o preço da leitura escolhida, não um erro de soma.
 */
@Injectable()
export class DashboardUseCase {
  constructor(
    private readonly report: ReportService,
    private readonly payableList: PayableListUseCase,
  ) {}

  async exec({
    userId,
    from,
    to,
  }: {
    userId: string;
    from: string;
    to: string;
  }): Promise<DashboardOutput> {
    const [report, payables] = await Promise.all([
      this.report.exec({
        userId,
        from,
        to,
        groupBy: 'payment_method',
        type: 'expense',
      }),
      this.payableList.exec({ userId, from, to }),
    ]);

    const byPaymentMethod = new Map<string, DashboardLine>();
    for (const group of report.groups) {
      byPaymentMethod.set(group.key, {
        key: group.key,
        label: group.label,
        total: group.total,
      });
    }

    // Fatura fechada já não pesa: as compras dela entraram como despesa na data
    // em que aconteceram.
    for (const cycle of payables.cycles) {
      if (cycle.closedAt) continue;
      const current = byPaymentMethod.get(cycle.paymentMethod.id);
      byPaymentMethod.set(cycle.paymentMethod.id, {
        key: cycle.paymentMethod.id,
        label: cycle.paymentMethod.description,
        total: (current?.total ?? 0) + cycle.total,
      });
    }

    const totalExpense = report.totalExpense + payables.summary.totalPending;

    return {
      totalIncome: report.totalIncome,
      totalExpense,
      balance: report.totalIncome - totalExpense,
      byPaymentMethod: [...byPaymentMethod.values()].sort(
        (a, b) => b.total - a.total,
      ),
      pendingBills: payables.bills
        .filter((bill) => !bill.paid)
        .map((bill) => ({
          key: `${bill.id}-${bill.occurrenceDate}`,
          label: bill.description,
          total: bill.predictedAmount,
        }))
        .sort((a, b) => b.total - a.total),
    };
  }
}
