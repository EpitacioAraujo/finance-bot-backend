import { Injectable } from '@nestjs/common';
import { ReportRepository } from '@/modules/finance/repositories/report/report.repository';
import { TransactionType } from '@/modules/finance/entities/transaction.entity';

export interface ReportInput {
  userId: string;
  from: string;
  to: string;
  groupBy: 'tag' | 'payment_method' | 'none';
  /** Os grupos cobrem um tipo por vez; os totais cobrem os dois. */
  type?: TransactionType;
}

export interface ReportOutput {
  totalIncome: number;
  totalExpense: number;
  balance: number;
  count: number;
  groups: { key: string; label: string; total: number; count: number }[];
}

@Injectable()
export class ReportService {
  constructor(private readonly repository: ReportRepository) {}

  async exec(input: ReportInput): Promise<ReportOutput> {
    const rows = await this.repository.exec({
      ...input,
      type: input.type ?? TransactionType.Expense,
    });

    const sum = (type: TransactionType): number =>
      Number(rows.totals.find((row) => row.type === type)?.total ?? 0);

    return {
      totalIncome: sum(TransactionType.Income),
      totalExpense: sum(TransactionType.Expense),
      balance: sum(TransactionType.Income) - sum(TransactionType.Expense),
      count: rows.totals.reduce((acc, row) => acc + Number(row.count), 0),
      // Com tags n:n os grupos se sobrepõem: um lançamento com duas tags entra
      // nos dois. A soma dos grupos passa do total, e isso é esperado.
      groups: rows.groups.map((row) => ({
        key: row.key ?? 'none',
        label: row.label ?? 'Sem tag',
        total: Number(row.total),
        count: Number(row.count),
      })),
    };
  }
}
