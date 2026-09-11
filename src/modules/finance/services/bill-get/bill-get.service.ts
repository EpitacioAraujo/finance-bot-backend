import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { BillEntity } from '@/modules/finance/entities/bill.entity';
import { NotFoundError } from '@/shared/errors';

@Injectable()
export class BillGetService {
  constructor(
    @InjectRepository(BillEntity)
    private readonly bills: Repository<BillEntity>,
  ) {}

  async exec({ userId, id }: { userId: string; id: string }): Promise<BillEntity> {
    const bill = await this.bills.findOne({
      where: { id, userId },
      relations: { paymentMethod: true, tag: true },
    });
    if (!bill) throw new NotFoundError('Conta não encontrada');
    return bill;
  }
}
