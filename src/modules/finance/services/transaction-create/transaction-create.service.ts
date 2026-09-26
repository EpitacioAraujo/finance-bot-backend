import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { EntityManager, Repository } from 'typeorm';
import { ulid } from 'ulid';
import {
  TransactionEntity,
  TransactionType,
} from '@/modules/finance/entities/transaction.entity';
import { TagEntity } from '@/modules/finance/entities/tag.entity';
import { ValidationError } from '@/shared/errors';

export interface TransactionCreateInput {
  userId: string;
  description: string;
  amount: number;
  type: TransactionType;
  date: string;
  paymentMethodId: string;
  tagIds?: string[];
  billId?: string | null;
  billOccurrenceDate?: string | null;
  originMessageId?: string | null;
  notes?: string | null;
  /** Passado pelo use case para as escritas caírem na mesma transação de banco. */
  manager?: EntityManager;
}

/** Grava uma linha e nada mais. Resolver nome e gerar tranche é do use case. */
@Injectable()
export class TransactionCreateService {
  constructor(
    @InjectRepository(TransactionEntity)
    private readonly repo: Repository<TransactionEntity>,
  ) {}

  async exec(input: TransactionCreateInput): Promise<TransactionEntity> {
    const repo = input.manager?.getRepository(TransactionEntity) ?? this.repo;

    if (input.amount <= 0) {
      throw new ValidationError('O valor precisa ser maior que zero');
    }
    if (!input.description.trim()) {
      throw new ValidationError('A descrição não pode ficar vazia');
    }

    return repo.save(
      repo.create({
        id: ulid(),
        userId: input.userId,
        description: input.description.trim(),
        amount: input.amount,
        type: input.type,
        date: input.date,
        paymentMethodId: input.paymentMethodId,
        billId: input.billId ?? null,
        billOccurrenceDate: input.billOccurrenceDate ?? null,
        originMessageId: input.originMessageId ?? null,
        notes: input.notes ?? null,
        tags: (input.tagIds ?? []).map((id) => ({ id }) as TagEntity),
      }),
    );
  }
}
