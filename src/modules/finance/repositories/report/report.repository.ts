import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, SelectQueryBuilder } from 'typeorm';
import { TransactionType } from '@/modules/finance/entities/transaction.entity';
import { TransactionTrancheEntity } from '@/modules/finance/entities/transaction-tranche.entity';

export interface ReportRows {
  totals: { type: TransactionType; total: string; count: string }[];
  groups: { key: string | null; label: string | null; total: string; count: string }[];
}

/**
 * `accrual` é o mês da compra. `cycle` é o ciclo que abre no mês: com fechamento
 * no dia 7, setembro vai de 08/09 a 07/10, e cada cartão tem a sua janela — por
 * isso o filtro vai no `start_date` do ciclo, não numa data única. Forma de
 * pagamento sem ciclo cai no mês civil, pelo vencimento da tranche.
 *
 * A soma é sempre de tranche. Como a soma das tranches é o total da compra,
 * `accrual` dá exatamente o mesmo número que somar `transactions.amount`.
 */
export type ReportBasis = 'accrual' | 'cycle';

interface Input {
  userId: string;
  from: string;
  to: string;
  groupBy: 'tag' | 'payment_method' | 'none';
  type: TransactionType;
  basis: ReportBasis;
}

/**
 * Um dos dois repositórios do projeto: soma agregada cruzando
 * transaction_tranches, transactions, transaction_tag, tags e payment_methods.
 * Não sai de um find().
 */
@Injectable()
export class ReportRepository {
  constructor(
    @InjectRepository(TransactionTrancheEntity)
    private readonly repo: Repository<TransactionTrancheEntity>,
  ) {}

  async exec({ userId, from, to, groupBy, type, basis }: Input): Promise<ReportRows> {
    // Duas queries precisam da mesma base e da mesma janela, e no `cycle` a
    // janela traz um join junto. Vem depois do `where` de propósito: `where()`
    // substitui as condições já postas, `andWhere()` soma.
    const scoped = (): SelectQueryBuilder<TransactionTrancheEntity> => {
      const query = this.repo
        .createQueryBuilder('tr')
        .innerJoin('transactions', 't', 't.id = tr.transaction_id')
        .where('t.user_id = :userId', { userId })
        .andWhere('t.deleted_at IS NULL');

      return basis === 'accrual'
        ? query.andWhere('t.date BETWEEN :from AND :to', { from, to })
        : query
            .leftJoin('payment_method_cycles', 'c', 'c.id = tr.cycle_id')
            .andWhere(
              '(c.start_date BETWEEN :from AND :to OR (tr.cycle_id IS NULL AND tr.due_date BETWEEN :from AND :to))',
              { from, to },
            );
    };

    const totals = await scoped()
      .select('t.type', 'type')
      .addSelect('SUM(tr.amount)', 'total')
      // A compra parcelada tem N tranches: contar linha inflaria o número de
      // lançamentos do período.
      .addSelect('COUNT(DISTINCT t.id)', 'count')
      .groupBy('t.type')
      .getRawMany<{ type: TransactionType; total: string; count: string }>();

    if (groupBy === 'none') return { totals, groups: [] };

    const query = scoped().andWhere('t.type = :type', { type });

    if (groupBy === 'tag') {
      query
        .leftJoin('transaction_tag', 'tt', 'tt.transaction_id = t.id')
        .leftJoin('tags', 'g', 'g.id = tt.tag_id')
        .select('g.id', 'key')
        .addSelect('g.description', 'label')
        .groupBy('g.id')
        .addGroupBy('g.description');
    } else {
      query
        .innerJoin('payment_methods', 'g', 'g.id = t.payment_method_id')
        .select('g.id', 'key')
        .addSelect('g.description', 'label')
        .groupBy('g.id')
        .addGroupBy('g.description');
    }

    // Depois do `select` do agrupamento: `select` zera o que veio antes dele.
    query
      .addSelect('SUM(tr.amount)', 'total')
      .addSelect('COUNT(DISTINCT t.id)', 'count');

    const groups = await query.getRawMany<{
      key: string | null;
      label: string | null;
      total: string;
      count: string;
    }>();

    return { totals, groups };
  }
}
