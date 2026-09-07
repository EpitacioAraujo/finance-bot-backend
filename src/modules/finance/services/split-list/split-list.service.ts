import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { TransactionSplitEntity } from '@/modules/finance/entities/transaction-split.entity';
import { TransactionEntity } from '@/modules/finance/entities/transaction.entity';
import { NotFoundError } from '@/shared/errors';

@Injectable()
export class SplitListService {
  constructor(
    @InjectRepository(TransactionSplitEntity)
    private readonly splits: Repository<TransactionSplitEntity>,
    @InjectRepository(TransactionEntity)
    private readonly transactions: Repository<TransactionEntity>,
  ) {}

  async exec({
    userId,
    transactionId,
  }: {
    userId: string;
    transactionId: string;
  }): Promise<TransactionSplitEntity[]> {
    const owned = await this.transactions.findOne({
      where: { id: transactionId, userId },
    });
    if (!owned) throw new NotFoundError('Lançamento não encontrado');

    return this.splits.find({
      where: { transactionId },
      order: { number: 'ASC' },
    });
  }
}
