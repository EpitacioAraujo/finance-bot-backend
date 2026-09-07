import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { IsNull, Repository } from 'typeorm';
import { PaymentMethodCycleEntity } from '@/modules/finance/entities/payment-method-cycle.entity';
import { PaymentMethodEntity } from '@/modules/finance/entities/payment-method.entity';
import { TransactionSplitEntity } from '@/modules/finance/entities/transaction-split.entity';
import { ConflictError, NotFoundError } from '@/shared/errors';

/**
 * Pagar a fatura fecha o ciclo e quita as parcelas dele. **Não cria transação.**
 * As compras do cartão já são as despesas; lançar o pagamento da fatura como
 * despesa contaria o mesmo dinheiro duas vezes.
 */
@Injectable()
export class ConsolidatedPayService {
  constructor(
    @InjectRepository(PaymentMethodCycleEntity)
    private readonly cycles: Repository<PaymentMethodCycleEntity>,
    @InjectRepository(PaymentMethodEntity)
    private readonly methods: Repository<PaymentMethodEntity>,
    @InjectRepository(TransactionSplitEntity)
    private readonly splits: Repository<TransactionSplitEntity>,
  ) {}

  async exec({
    userId,
    cycleId,
    paidAt,
  }: {
    userId: string;
    cycleId: string;
    paidAt?: Date;
  }): Promise<PaymentMethodCycleEntity> {
    const cycle = await this.cycles.findOne({ where: { id: cycleId } });
    if (!cycle) throw new NotFoundError('Fatura não encontrada');

    const owned = await this.methods.findOne({
      where: { id: cycle.paymentMethodId, userId },
    });
    if (!owned) throw new NotFoundError('Fatura não encontrada');

    if (cycle.closedAt) {
      throw new ConflictError(
        `A fatura de ${cycle.referenceMonth} já está paga`,
      );
    }

    const when = paidAt ?? new Date();
    await this.splits.update(
      { cycleId, paidAt: IsNull() },
      { paidAt: when },
    );

    cycle.closedAt = when;
    return this.cycles.save(cycle);
  }
}
