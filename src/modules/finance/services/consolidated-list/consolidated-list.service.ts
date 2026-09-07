import { Injectable } from '@nestjs/common';
import { ConsolidatedRepository } from '@/modules/finance/repositories/consolidated/consolidated.repository';

export interface ConsolidatedView {
  cycleId: string;
  paymentMethod: { id: string; description: string };
  referenceMonth: string;
  dueDate: string;
  total: number;
  itemCount: number;
  closedAt: Date | null;
}

@Injectable()
export class ConsolidatedListService {
  constructor(private readonly repository: ConsolidatedRepository) {}

  async exec(input: {
    userId: string;
    from: string;
    to: string;
    cycleId?: string;
  }): Promise<ConsolidatedView[]> {
    const rows = await this.repository.exec(input);

    return rows.map((row) => ({
      cycleId: row.cycle_id,
      paymentMethod: {
        id: row.payment_method_id,
        description: row.payment_method_description,
      },
      referenceMonth: row.reference_month,
      dueDate: row.due_date,
      total: Number(row.total),
      itemCount: Number(row.item_count),
      closedAt: row.closed_at,
    }));
  }
}
