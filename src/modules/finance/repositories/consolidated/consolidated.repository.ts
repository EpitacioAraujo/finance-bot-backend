import { Injectable } from '@nestjs/common';
import { InjectDataSource } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';

export interface ConsolidatedRow {
  cycle_id: string;
  reference_month: string;
  due_date: string;
  closed_at: Date | null;
  payment_method_id: string;
  payment_method_description: string;
  total: string;
  item_count: string;
}

/**
 * O outro repositório: cruza payment_method_cycles, transactions e
 * transaction_splits somando o que caiu em cada fatura.
 *
 * Compra à vista guarda o cycle_id na própria transaction; compra parcelada
 * deixa transaction.cycle_id nulo e cada parcela carrega o seu. O filtro
 * `installments = 1` é a segunda trava contra contar duas vezes.
 */
@Injectable()
export class ConsolidatedRepository {
  constructor(@InjectDataSource() private readonly dataSource: DataSource) {}

  async exec(input: {
    userId: string;
    from: string;
    to: string;
    cycleId?: string;
  }): Promise<ConsolidatedRow[]> {
    return this.dataSource.query<ConsolidatedRow[]>(
      `
      SELECT c.id                AS cycle_id,
             c.reference_month   AS reference_month,
             c.due_date          AS due_date,
             c.closed_at         AS closed_at,
             pm.id               AS payment_method_id,
             pm.description      AS payment_method_description,
             COALESCE(SUM(item.amount), 0) AS total,
             COUNT(item.id)      AS item_count
        FROM payment_method_cycles c
        JOIN payment_methods pm ON pm.id = c.payment_method_id
        LEFT JOIN (
              SELECT id, cycle_id, amount FROM transactions
               WHERE deleted_at IS NULL AND cycle_id IS NOT NULL AND installments = 1
               UNION ALL
              SELECT id, cycle_id, amount FROM transaction_splits
               WHERE deleted_at IS NULL AND cycle_id IS NOT NULL
             ) item ON item.cycle_id = c.id
       WHERE pm.user_id = $1
         AND c.deleted_at IS NULL
         AND ($4::varchar IS NULL OR c.id = $4)
         AND c.due_date BETWEEN $2 AND $3
       GROUP BY c.id, c.reference_month, c.due_date, c.closed_at, pm.id, pm.description
       ORDER BY c.due_date ASC
      `,
      [input.userId, input.from, input.to, input.cycleId ?? null],
    );
  }
}
