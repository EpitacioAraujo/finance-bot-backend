import { Injectable } from '@nestjs/common';
import { InjectDataSource } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';

export interface ConsolidatedRow {
  cycle_id: string;
  reference_month: string;
  start_date: string;
  end_date: string;
  due_date: string;
  closed_at: Date | null;
  payment_method_id: string;
  payment_method_description: string;
  total: string;
  item_count: string;
}

/**
 * Cruza payment_method_cycles com transaction_tranches somando o que caiu em
 * cada fatura. O join com `transactions` é o que tira da conta a compra
 * apagada: existe tranche viva de transação morta em dado antigo, e o
 * `deleted_at` da tranche sozinho não enxergava isso. Toda compra no cartão tem tranche, à vista inclusive, então o
 * `cycle_id` da tranche é a única fonte — sem UNION e sem trava contra somar
 * duas vezes.
 */
@Injectable()
export class ConsolidatedRepository {
  constructor(@InjectDataSource() private readonly dataSource: DataSource) {}

  async exec(input: {
    userId: string;
    from: string;
    to: string;
    /** `due`: fatura que vence no período. `cycle`: ciclo que abre nele. */
    basis: 'due' | 'cycle';
  }): Promise<ConsolidatedRow[]> {
    // Nome de coluna fixo, não vem de fora: interpolar não abre injeção.
    const column = input.basis === 'cycle' ? 'c.start_date' : 'c.due_date';

    return this.dataSource.query<ConsolidatedRow[]>(
      `
      SELECT c.id                AS cycle_id,
             c.reference_month   AS reference_month,
             c.start_date::text  AS start_date,
             c.end_date::text    AS end_date,
             c.due_date::text    AS due_date,
             c.closed_at         AS closed_at,
             pm.id               AS payment_method_id,
             pm.description      AS payment_method_description,
             COALESCE(SUM(tr.amount) FILTER (WHERE t.id IS NOT NULL), 0) AS total,
             COUNT(tr.id) FILTER (WHERE t.id IS NOT NULL) AS item_count
        FROM payment_method_cycles c
        JOIN payment_methods pm ON pm.id = c.payment_method_id
        LEFT JOIN transaction_tranches tr
               ON tr.cycle_id = c.id AND tr.deleted_at IS NULL
        LEFT JOIN transactions t
               ON t.id = tr.transaction_id AND t.deleted_at IS NULL
       WHERE pm.user_id = $1
         AND pm.deleted_at IS NULL
         AND c.deleted_at IS NULL
         AND ${column} BETWEEN $2 AND $3
       GROUP BY c.id, c.reference_month, c.start_date, c.end_date, c.due_date, c.closed_at, pm.id, pm.description
       ORDER BY c.due_date ASC
      `,
      [input.userId, input.from, input.to],
    );
  }
}
