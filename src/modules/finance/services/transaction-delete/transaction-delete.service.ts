import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { TransactionEntity } from '@/modules/finance/entities/transaction.entity';
import { NotFoundError } from '@/shared/errors';

@Injectable()
export class TransactionDeleteService {
  constructor(
    @InjectRepository(TransactionEntity)
    private readonly repo: Repository<TransactionEntity>,
  ) {}

  async exec({ userId, id }: { userId: string; id: string }): Promise<void> {
    const result = await this.repo.softDelete({ id, userId });
    if (!result.affected) throw new NotFoundError('Lançamento não encontrado');
  }
}
