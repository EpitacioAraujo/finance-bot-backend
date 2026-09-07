import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { TransactionSplitEntity } from '@/modules/finance/entities/transaction-split.entity';
import { TransactionEntity } from '@/modules/finance/entities/transaction.entity';
import { ConflictError, NotFoundError } from '@/shared/errors';

@Injectable()
export class SplitPayService {
  constructor(
    @InjectRepository(TransactionSplitEntity)
    private readonly splits: Repository<TransactionSplitEntity>,
    @InjectRepository(TransactionEntity)
    private readonly transactions: Repository<TransactionEntity>,
  ) {}

  async exec({
    userId,
    splitId,
    paidAt,
  }: {
    userId: string;
    splitId: string;
    paidAt?: Date;
  }): Promise<TransactionSplitEntity> {
    const split = await this.splits.findOne({ where: { id: splitId } });
    if (!split) throw new NotFoundError('Parcela não encontrada');

    const owned = await this.transactions.findOne({
      where: { id: split.transactionId, userId },
    });
    if (!owned) throw new NotFoundError('Parcela não encontrada');

    if (split.paidAt) {
      throw new ConflictError(`A parcela ${split.number} já está paga`);
    }

    split.paidAt = paidAt ?? new Date();
    return this.splits.save(split);
  }
}
