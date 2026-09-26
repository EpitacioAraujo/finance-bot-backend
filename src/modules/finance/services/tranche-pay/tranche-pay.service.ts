import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { TransactionTrancheEntity } from '@/modules/finance/entities/transaction-tranche.entity';
import { TransactionEntity } from '@/modules/finance/entities/transaction.entity';
import { ConflictError, NotFoundError } from '@/shared/errors';

@Injectable()
export class TranchePayService {
  constructor(
    @InjectRepository(TransactionTrancheEntity)
    private readonly tranches: Repository<TransactionTrancheEntity>,
    @InjectRepository(TransactionEntity)
    private readonly transactions: Repository<TransactionEntity>,
  ) {}

  async exec({
    userId,
    trancheId,
    paidAt,
  }: {
    userId: string;
    trancheId: string;
    paidAt?: Date;
  }): Promise<TransactionTrancheEntity> {
    const tranche = await this.tranches.findOne({ where: { id: trancheId } });
    if (!tranche) throw new NotFoundError('Parcela não encontrada');

    const owned = await this.transactions.findOne({
      where: { id: tranche.transactionId, userId },
    });
    if (!owned) throw new NotFoundError('Parcela não encontrada');

    if (tranche.paidAt) {
      throw new ConflictError(`A parcela ${tranche.number} já está paga`);
    }

    tranche.paidAt = paidAt ?? new Date();
    return this.tranches.save(tranche);
  }
}
