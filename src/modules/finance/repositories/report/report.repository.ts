import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, SelectQueryBuilder } from 'typeorm';
import { TransactionType } from '@/modules/finance/entities/transaction.entity';
import { TransactionTrancheEntity } from '@/modules/finance/entities/transaction-tranche.entity';

export interface ReportRows {
  totals: { type: TransactionType; total: string; count: string }[];
  groups: { key: string | null; label: string | null; total: string; count: string }[];
}

interface Input {
  userId: string;
  from: string;
  to: string;
  groupBy: 'tag' | 'payment_method' | 'none';
  type: TransactionType;
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

  async exec({ userId, from, to, groupBy, type }: Input): Promise<ReportRows> {
    // Duas queries precisam da mesma base e da mesma janela, pelo mês da compra.
    // A soma das tranches é o total da compra, então dá o mesmo que
    // `transactions.amount`.
    const scoped = (): SelectQueryBuilder<TransactionTrancheEntity> =>
      this.repo
        .createQueryBuilder('tr')
        .innerJoin('transactions', 't', 't.id = tr.transaction_id')
        .where('t.user_id = :userId', { userId })
        .andWhere('t.deleted_at IS NULL')
        .andWhere('t.date BETWEEN :from AND :to', { from, to });

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
