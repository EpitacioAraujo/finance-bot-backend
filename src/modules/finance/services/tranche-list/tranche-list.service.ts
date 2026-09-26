import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { TransactionTrancheEntity } from '@/modules/finance/entities/transaction-tranche.entity';
import { TransactionEntity } from '@/modules/finance/entities/transaction.entity';
import { NotFoundError } from '@/shared/errors';

@Injectable()
export class TrancheListService {
  constructor(
    @InjectRepository(TransactionTrancheEntity)
    private readonly tranches: Repository<TransactionTrancheEntity>,
    @InjectRepository(TransactionEntity)
    private readonly transactions: Repository<TransactionEntity>,
  ) {}

  async exec({
    userId,
    transactionId,
  }: {
    userId: string;
    transactionId: string;
  }): Promise<TransactionTrancheEntity[]> {
    const owned = await this.transactions.findOne({
      where: { id: transactionId, userId },
    });
    if (!owned) throw new NotFoundError('Lançamento não encontrado');

    return this.tranches.find({
      where: { transactionId },
      order: { number: 'ASC' },
    });
  }
}
