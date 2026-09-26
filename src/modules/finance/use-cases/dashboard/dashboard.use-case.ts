import { Injectable } from '@nestjs/common';
import { TransactionType } from '@/modules/finance/entities/transaction.entity';
import { ReportService } from '@/modules/finance/services/report/report.service';
import { BillListService } from '@/modules/finance/services/bill-list/bill-list.service';

export interface DashboardLine {
  key: string;
  label: string;
  total: number;
}

export interface DashboardOutput {
  totalIncome: number;
  /** Tranche da janela do ciclo + conta prevista ainda sem pagamento. */
  totalExpense: number;
  balance: number;
  /** Despesa por forma de pagamento: no cartão, é a fatura que abriu no mês. */
  byPaymentMethod: DashboardLine[];
  /** Conta a vencer não tem forma de pagamento útil aqui — cada uma na sua linha. */
  pendingBills: DashboardLine[];
}

/**
 * O mês aqui é o ciclo que abre nele: com fechamento no dia 7, setembro vai de
 * 08/09 a 07/10. Com isso a compra parcelada pesa uma parcela por mês em vez de
 * inteira na compra, e a fatura do cartão não entra à parte — ela *é* a soma das
 * tranches de crédito da janela. Forma de pagamento sem ciclo cai no mês civil.
 *
 * O que sobra fora da conta é previsão: ocorrência de conta sem pagamento não
 * tem tranche, e é o único valor somado por cima.
 */
@Injectable()
export class DashboardUseCase {
  constructor(
    private readonly report: ReportService,
    private readonly billList: BillListService,
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
    const [report, bills] = await Promise.all([
      this.report.exec({
        userId,
        from,
        to,
        basis: 'cycle',
        groupBy: 'payment_method',
        type: TransactionType.Expense,
      }),
      this.billList.exec({
        userId,
        from,
        to,
        status: 'pending',
        type: TransactionType.Expense,
      }),
    ]);

    const totalExpense = report.totalExpense + bills.summary.totalPending;

    return {
      totalIncome: report.totalIncome,
      totalExpense,
      balance: report.totalIncome - totalExpense,
      byPaymentMethod: report.groups
        .map((group) => ({
          key: group.key,
          label: group.label,
          total: group.total,
        }))
        .sort((a, b) => b.total - a.total),
      pendingBills: bills.items
        .map((bill) => ({
          key: `${bill.id}-${bill.occurrenceDate}`,
          label: bill.description,
          total: bill.predictedAmount,
        }))
        .sort((a, b) => b.total - a.total),
    };
  }
}
