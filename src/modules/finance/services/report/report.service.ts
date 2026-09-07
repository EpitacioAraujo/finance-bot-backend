import { Injectable } from '@nestjs/common';
import { ReportRepository } from '@/modules/finance/repositories/report/report.repository';

export interface ReportInput {
  userId: string;
  from: string;
  to: string;
  groupBy: 'tag' | 'payment_method' | 'none';
  /** Os grupos cobrem um tipo por vez; os totais cobrem os dois. */
  type?: 'income' | 'expense';
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
      type: input.type ?? 'expense',
    });

    const sum = (type: string): number =>
      Number(rows.totals.find((row) => row.type === type)?.total ?? 0);

    return {
      totalIncome: sum('income'),
      totalExpense: sum('expense'),
      balance: sum('income') - sum('expense'),
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
