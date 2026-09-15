import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Between, Repository } from 'typeorm';
import {
  TransactionEntity,
  TransactionType,
} from '@/modules/finance/entities/transaction.entity';
import { TransactionSplitEntity } from '@/modules/finance/entities/transaction-split.entity';

export interface TransactionListInput {
  userId: string;
  from?: string;
  to?: string;
  type?: TransactionType;
  tagId?: string;
  paymentMethodId?: string;
  limit?: number;
  offset?: number;
}

export type TransactionView = TransactionEntity & {
  /** Sempre carregado, ordenado por `number`. */
  splits: TransactionSplitEntity[];
  paidInstallments: number;
};

/** Get e list entregam a mesma leitura: a contagem sai daqui, não da tela. */
export const toTransactionView = (t: TransactionEntity): TransactionView => ({
  ...t,
  splits: t.splits ?? [],
  paidInstallments: (t.splits ?? []).filter((s) => s.paidAt).length,
});

export interface TransactionListResult {
  items: TransactionView[];
  total: number;
}

@Injectable()
export class TransactionListService {
  constructor(
    @InjectRepository(TransactionEntity)
    private readonly repo: Repository<TransactionEntity>,
  ) {}

  async exec(input: TransactionListInput): Promise<TransactionListResult> {
    const [items, total] = await this.repo.findAndCount({
      where: {
        userId: input.userId,
        // ponytail: sentinela em vez de 3 operadores condicionais; a web lista
        // sem janela, o agente sempre manda as duas pontas.
        date: Between(input.from ?? '0001-01-01', input.to ?? '9999-12-31'),
        ...(input.type ? { type: input.type } : {}),
        ...(input.paymentMethodId
          ? { paymentMethodId: input.paymentMethodId }
          : {}),
        ...(input.tagId ? { tags: { id: input.tagId } } : {}),
      },
      relations: { paymentMethod: true, tags: true, splits: true },
      order: { date: 'DESC', createdAt: 'DESC', splits: { number: 'ASC' } },
      take: input.limit ?? 100,
      skip: input.offset ?? 0,
    });

    return { items: items.map(toTransactionView), total };
  }
}
