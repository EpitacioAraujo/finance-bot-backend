import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import {
  PaymentMethodEntity,
  PaymentMethodKind,
} from '@/modules/finance/entities/payment-method.entity';
import { assertPaymentMethodKind } from '@/modules/finance/rules';
import { NotFoundError } from '@/shared/errors';

export interface PaymentMethodUpdateInput {
  userId: string;
  id: string;
  description?: string;
  kind?: PaymentMethodKind;
  closingDay?: number | null;
  dueDay?: number | null;
  showInBills?: boolean;
  active?: boolean;
}

@Injectable()
export class PaymentMethodUpdateService {
  constructor(
    @InjectRepository(PaymentMethodEntity)
    private readonly repo: Repository<PaymentMethodEntity>,
  ) {}

  async exec({
    userId,
    id,
    ...fields
  }: PaymentMethodUpdateInput): Promise<PaymentMethodEntity> {
    const method = await this.repo.findOne({ where: { id, userId } });
    if (!method) throw new NotFoundError('Forma de pagamento não encontrada');

    Object.assign(method, fields);
    assertPaymentMethodKind(method);

    return this.repo.save(method);
  }
}
