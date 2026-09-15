import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ulid } from 'ulid';
import {
  PaymentMethodEntity,
  PaymentMethodKind,
} from '@/modules/finance/entities/payment-method.entity';
import { applyPaymentMethodKind } from '@/modules/finance/rules';

export interface PaymentMethodCreateInput {
  userId: string;
  description: string;
  kind: PaymentMethodKind;
  closingDay?: number | null;
  dueDay?: number | null;
  showInBills?: boolean;
}

@Injectable()
export class PaymentMethodCreateService {
  constructor(
    @InjectRepository(PaymentMethodEntity)
    private readonly repo: Repository<PaymentMethodEntity>,
  ) {}

  async exec(input: PaymentMethodCreateInput): Promise<PaymentMethodEntity> {
    const method = this.repo.create({
      id: ulid(),
      userId: input.userId,
      description: input.description.trim(),
      kind: input.kind,
      closingDay: input.closingDay ?? null,
      dueDay: input.dueDay ?? null,
      showInBills: input.showInBills ?? input.kind === 'credit',
      active: true,
    });
    applyPaymentMethodKind(method);

    return this.repo.save(method);
  }
}
