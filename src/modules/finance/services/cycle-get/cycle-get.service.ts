import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { PaymentMethodCycleEntity } from '@/modules/finance/entities/payment-method-cycle.entity';
import { PaymentMethodEntity } from '@/modules/finance/entities/payment-method.entity';
import { NotFoundError } from '@/shared/errors';

/** A fatura pelo id, já confirmando que o cartão é de quem está pedindo. */
@Injectable()
export class CycleGetService {
  constructor(
    @InjectRepository(PaymentMethodCycleEntity)
    private readonly cycles: Repository<PaymentMethodCycleEntity>,
    @InjectRepository(PaymentMethodEntity)
    private readonly methods: Repository<PaymentMethodEntity>,
  ) {}

  async exec({
    userId,
    cycleId,
  }: {
    userId: string;
    cycleId: string;
  }): Promise<PaymentMethodCycleEntity> {
    const cycle = await this.cycles.findOne({ where: { id: cycleId } });
    if (!cycle) throw new NotFoundError('Fatura não encontrada');

    const owned = await this.methods.findOne({
      where: { id: cycle.paymentMethodId, userId },
    });
    if (!owned) throw new NotFoundError('Fatura não encontrada');

    return cycle;
  }
}
