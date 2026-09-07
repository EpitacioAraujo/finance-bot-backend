import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ulid } from 'ulid';
import { PaymentMethodCycleEntity } from '@/modules/finance/entities/payment-method-cycle.entity';
import { PaymentMethodEntity } from '@/modules/finance/entities/payment-method.entity';
import { NotFoundError, ValidationError } from '@/shared/errors';
import { addDays, dateAt, monthKey, parseIso } from '@/shared/date';

interface Input {
  paymentMethodId: string;
  date: string;
}

/**
 * Acha o ciclo cuja janela contém `date`; se não existe, cria. É a única porta
 * de entrada para fatura — ninguém calcula ciclo em outro lugar.
 */
@Injectable()
export class CycleResolveService {
  constructor(
    @InjectRepository(PaymentMethodCycleEntity)
    private readonly cycles: Repository<PaymentMethodCycleEntity>,
    @InjectRepository(PaymentMethodEntity)
    private readonly methods: Repository<PaymentMethodEntity>,
  ) {}

  async exec({
    paymentMethodId,
    date,
  }: Input): Promise<PaymentMethodCycleEntity> {
    const method = await this.methods.findOne({
      where: { id: paymentMethodId },
    });
    if (!method) throw new NotFoundError('Forma de pagamento não encontrada');
    if (method.kind !== 'credit') {
      throw new ValidationError(
        `"${method.description}" não é cartão de crédito e não tem fatura`,
      );
    }
    if (method.closingDay === null || method.dueDay === null) {
      throw new ValidationError(
        `"${method.description}" está sem dia de fechamento ou vencimento`,
      );
    }

    const purchase = parseIso(date);
    const year = purchase.getUTCFullYear();
    // Compra depois do fechamento entra na fatura do mês seguinte.
    const closeMonth =
      purchase.getUTCDate() > method.closingDay
        ? purchase.getUTCMonth() + 1
        : purchase.getUTCMonth();
    // Vencimento cai no mês seguinte ao fechamento quando dueDay <= closingDay.
    const dueMonth =
      method.dueDay <= method.closingDay ? closeMonth + 1 : closeMonth;

    const startDate = addDays(
      dateAt(year, closeMonth - 1, method.closingDay),
      1,
    );
    const endDate = dateAt(year, closeMonth, method.closingDay);
    const dueDate = dateAt(year, dueMonth, method.dueDay);
    const referenceMonth = monthKey(dueDate);

    const existing = await this.cycles.findOne({
      where: { paymentMethodId, referenceMonth },
    });
    if (existing) return existing;

    // Duas criações simultâneas do mesmo ciclo estouram o unique. Só acontece
    // com o mesmo usuário em paralelo; se virar problema, trocar por upsert.
    return this.cycles.save(
      this.cycles.create({
        id: ulid(),
        paymentMethodId,
        referenceMonth,
        startDate,
        endDate,
        dueDate,
        closedAt: null,
      }),
    );
  }
}
