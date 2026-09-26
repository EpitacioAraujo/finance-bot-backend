import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Between, Repository } from 'typeorm';
import {
  TransactionEntity,
  TransactionType,
} from '@/modules/finance/entities/transaction.entity';
import { TransactionTrancheEntity } from '@/modules/finance/entities/transaction-tranche.entity';

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
  /** Sempre carregado e nunca vazio, ordenado por `number`. */
  tranches: TransactionTrancheEntity[];
  /** Deixou de ser coluna: é quantas tranches a compra tem. */
  installments: number;
  paidTranches: number;
};

/** Get e list entregam a mesma leitura: a contagem sai daqui, não da tela. */
export const toTransactionView = (t: TransactionEntity): TransactionView => ({
  ...t,
  tranches: t.tranches ?? [],
  installments: (t.tranches ?? []).length,
  paidTranches: (t.tranches ?? []).filter((tranche) => tranche.paidAt).length,
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
      relations: { paymentMethod: true, tags: true, tranches: true },
      order: { date: 'DESC', createdAt: 'DESC', tranches: { number: 'ASC' } },
      take: input.limit ?? 100,
      skip: input.offset ?? 0,
    });

    return { items: items.map(toTransactionView), total };
  }
}
