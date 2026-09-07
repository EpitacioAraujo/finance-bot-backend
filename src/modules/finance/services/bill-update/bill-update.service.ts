import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import {
  BillEntity,
  BillFrequency,
} from '@/modules/finance/entities/bill.entity';
import { assertBillSchedule } from '@/modules/finance/rules';
import { NotFoundError } from '@/shared/errors';

export interface BillUpdateInput {
  userId: string;
  id: string;
  description?: string;
  predictedAmount?: number;
  frequency?: BillFrequency;
  dueDate?: string | null;
  dueDay?: number | null;
  paymentMethodId?: string;
  tagId?: string | null;
  notes?: string | null;
  active?: boolean;
}

@Injectable()
export class BillUpdateService {
  constructor(
    @InjectRepository(BillEntity)
    private readonly repo: Repository<BillEntity>,
  ) {}

  async exec({ userId, id, ...fields }: BillUpdateInput): Promise<BillEntity> {
    const bill = await this.repo.findOne({ where: { id, userId } });
    if (!bill) throw new NotFoundError('Conta não encontrada');

    Object.assign(bill, fields);
    assertBillSchedule(bill);

    return this.repo.save(bill);
  }
}
