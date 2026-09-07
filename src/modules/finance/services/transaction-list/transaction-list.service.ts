import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Between, Repository } from 'typeorm';
import {
  TransactionEntity,
  TransactionType,
} from '@/modules/finance/entities/transaction.entity';

export interface TransactionListInput {
  userId: string;
  from: string;
  to: string;
  type?: TransactionType;
  tagId?: string;
  paymentMethodId?: string;
  limit?: number;
  offset?: number;
}

export interface TransactionListResult {
  items: TransactionEntity[];
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
        date: Between(input.from, input.to),
        ...(input.type ? { type: input.type } : {}),
        ...(input.paymentMethodId
          ? { paymentMethodId: input.paymentMethodId }
          : {}),
        ...(input.tagId ? { tags: { id: input.tagId } } : {}),
      },
      relations: { paymentMethod: true, tags: true, splits: true },
      order: { date: 'DESC', createdAt: 'DESC' },
      take: input.limit ?? 100,
      skip: input.offset ?? 0,
    });

    return { items, total };
  }
}
