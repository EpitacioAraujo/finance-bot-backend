import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { TransactionEntity } from '@/modules/finance/entities/transaction.entity';
import { TransactionSplitEntity } from '@/modules/finance/entities/transaction-split.entity';
import { NotFoundError } from '@/shared/errors';

@Injectable()
export class TransactionDeleteService {
  constructor(
    @InjectRepository(TransactionEntity)
    private readonly repo: Repository<TransactionEntity>,
    @InjectRepository(TransactionSplitEntity)
    private readonly splits: Repository<TransactionSplitEntity>,
  ) {}

  async exec({ userId, id }: { userId: string; id: string }): Promise<void> {
    const result = await this.repo.softDelete({ id, userId });
    if (!result.affected) throw new NotFoundError('Lançamento não encontrado');

    // A parcela é somada na fatura pelo `deleted_at` dela mesma: deixar para
    // trás faria a fatura continuar cobrando uma compra que não existe mais.
    await this.splits.softDelete({ transactionId: id });
  }
}
