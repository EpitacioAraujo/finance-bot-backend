import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { TransactionEntity } from '@/modules/finance/entities/transaction.entity';
import {
  TransactionView,
  toTransactionView,
} from '@/modules/finance/services/transaction-list/transaction-list.service';
import { NotFoundError } from '@/shared/errors';

@Injectable()
export class TransactionGetService {
  constructor(
    @InjectRepository(TransactionEntity)
    private readonly transactions: Repository<TransactionEntity>,
  ) {}

  async exec({
    userId,
    id,
  }: {
    userId: string;
    id: string;
  }): Promise<TransactionView> {
    const transaction = await this.transactions.findOne({
      where: { id, userId },
      relations: { paymentMethod: true, tags: true, splits: true },
      order: { splits: { number: 'ASC' } },
    });
    if (!transaction) throw new NotFoundError('Transação não encontrada');
    return toTransactionView(transaction);
  }
}
