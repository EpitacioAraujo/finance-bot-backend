import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { TransactionEntity } from '@/modules/finance/entities/transaction.entity';
import { TagEntity } from '@/modules/finance/entities/tag.entity';
import { NotFoundError, ValidationError } from '@/shared/errors';

export interface TransactionUpdateInput {
  userId: string;
  id: string;
  description?: string;
  amount?: number;
  date?: string;
  paymentMethodId?: string;
  tagIds?: string[];
  notes?: string | null;
}

@Injectable()
export class TransactionUpdateService {
  constructor(
    @InjectRepository(TransactionEntity)
    private readonly repo: Repository<TransactionEntity>,
  ) {}

  async exec({
    userId,
    id,
    tagIds,
    ...fields
  }: TransactionUpdateInput): Promise<TransactionEntity> {
    const transaction = await this.repo.findOne({
      where: { id, userId },
      relations: { tags: true },
    });
    if (!transaction) throw new NotFoundError('Lançamento não encontrado');
    if (fields.amount !== undefined && fields.amount <= 0) {
      throw new ValidationError('O valor precisa ser maior que zero');
    }

    Object.assign(transaction, fields);
    if (tagIds) {
      transaction.tags = tagIds.map((tagId) => ({ id: tagId }) as TagEntity);
    }

    return this.repo.save(transaction);
  }
}
