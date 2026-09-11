import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { TransactionEntity } from '@/modules/finance/entities/transaction.entity';
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
  }): Promise<TransactionEntity> {
    const transaction = await this.transactions.findOne({
      where: { id, userId },
      relations: { paymentMethod: true, tags: true, splits: true },
    });
    if (!transaction) throw new NotFoundError('Transação não encontrada');
    return transaction;
  }
}
