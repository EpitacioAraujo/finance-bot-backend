import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { BillEntity } from '@/modules/finance/entities/bill.entity';
import { NotFoundError } from '@/shared/errors';

@Injectable()
export class BillDeleteService {
  constructor(
    @InjectRepository(BillEntity)
    private readonly repo: Repository<BillEntity>,
  ) {}

  async exec({ userId, id }: { userId: string; id: string }): Promise<void> {
    const result = await this.repo.softDelete({ id, userId });
    if (!result.affected) throw new NotFoundError('Conta não encontrada');
  }
}
