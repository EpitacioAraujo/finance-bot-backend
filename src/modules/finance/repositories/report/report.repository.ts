import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { TransactionEntity } from '@/modules/finance/entities/transaction.entity';

export interface ReportRows {
  totals: { type: string; total: string; count: string }[];
  groups: { key: string | null; label: string | null; total: string; count: string }[];
}

interface Input {
  userId: string;
  from: string;
  to: string;
  groupBy: 'tag' | 'payment_method' | 'none';
  type: 'income' | 'expense';
}

/**
 * Um dos dois repositórios do projeto: soma agregada cruzando transactions,
 * transaction_tag, tags e payment_methods. Não sai de um find().
 */
@Injectable()
export class ReportRepository {
  constructor(
    @InjectRepository(TransactionEntity)
    private readonly repo: Repository<TransactionEntity>,
  ) {}

  async exec({ userId, from, to, groupBy, type }: Input): Promise<ReportRows> {
    const totals = await this.repo
      .createQueryBuilder('t')
      .select('t.type', 'type')
      .addSelect('SUM(t.amount)', 'total')
      .addSelect('COUNT(t.id)', 'count')
      .where('t.user_id = :userId', { userId })
      .andWhere('t.date BETWEEN :from AND :to', { from, to })
      .groupBy('t.type')
      .getRawMany<{ type: string; total: string; count: string }>();

    if (groupBy === 'none') return { totals, groups: [] };

    const query = this.repo
      .createQueryBuilder('t')
      .where('t.user_id = :userId', { userId })
      .andWhere('t.date BETWEEN :from AND :to', { from, to })
      .andWhere('t.type = :type', { type })
      .addSelect('SUM(t.amount)', 'total')
      .addSelect('COUNT(t.id)', 'count');

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

    const groups = await query.getRawMany<{
      key: string | null;
      label: string | null;
      total: string;
      count: string;
    }>();

    return { totals, groups };
  }
}
