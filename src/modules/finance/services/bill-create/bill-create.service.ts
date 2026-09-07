import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ulid } from 'ulid';
import {
  BillEntity,
  BillFrequency,
} from '@/modules/finance/entities/bill.entity';
import { assertBillSchedule } from '@/modules/finance/rules';
import { ValidationError } from '@/shared/errors';

export interface BillCreateInput {
  userId: string;
  description: string;
  predictedAmount: number;
  frequency: BillFrequency;
  paymentMethodId: string;
  dueDate?: string | null;
  dueDay?: number | null;
  tagId?: string | null;
  notes?: string | null;
  active?: boolean;
}

@Injectable()
export class BillCreateService {
  constructor(
    @InjectRepository(BillEntity)
    private readonly repo: Repository<BillEntity>,
  ) {}

  async exec(input: BillCreateInput): Promise<BillEntity> {
    if (input.predictedAmount <= 0) {
      throw new ValidationError('O valor previsto precisa ser maior que zero');
    }
    assertBillSchedule(input);

    return this.repo.save(
      this.repo.create({
        id: ulid(),
        userId: input.userId,
        description: input.description.trim(),
        predictedAmount: input.predictedAmount,
        frequency: input.frequency,
        paymentMethodId: input.paymentMethodId,
        dueDate: input.dueDate ?? null,
        dueDay: input.dueDay ?? null,
        tagId: input.tagId ?? null,
        notes: input.notes ?? null,
        active: input.active ?? true,
      }),
    );
  }
}
