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

export interface CycleWindow {
  referenceMonth: string;
  startDate: string;
  endDate: string;
  dueDate: string;
}

/**
 * O dia do fechamento **abre** o ciclo: ele vai do dia do fechamento até a
 * véspera do próximo. Fechamento no dia 7 → 07/09 a 06/10, e a compra do dia 7
 * já é do ciclo novo.
 *
 * Separada do service porque é a aritmética que erra sozinha — o resto aqui é
 * só achar ou criar a linha.
 */
export const cycleWindow = (
  closingDay: number,
  dueDay: number,
  date: string,
): CycleWindow => {
  const purchase = parseIso(date);
  const year = purchase.getUTCFullYear();
  const closeMonth =
    purchase.getUTCDate() >= closingDay
      ? purchase.getUTCMonth() + 1
      : purchase.getUTCMonth();
  // Vencimento cai no mês seguinte ao fechamento quando dueDay <= closingDay.
  const dueMonth = dueDay <= closingDay ? closeMonth + 1 : closeMonth;
  const dueDate = dateAt(year, dueMonth, dueDay);

  return {
    referenceMonth: monthKey(dueDate),
    startDate: dateAt(year, closeMonth - 1, closingDay),
    endDate: addDays(dateAt(year, closeMonth, closingDay), -1),
    dueDate,
  };
};

/**
 * A fatura em que uma cobrança daquela data cai. Null quando a forma de
 * pagamento não é crédito ou está sem fechamento/vencimento — aí não há
 * fatura, e a cobrança se explica sozinha.
 *
 * Não toca o banco: serve para ler o que ainda não aconteceu.
 */
export const cycleOf = (
  method: PaymentMethodEntity,
  date: string,
): CycleWindow | null =>
  method.kind === 'credit' && method.closingDay !== null && method.dueDay !== null
    ? cycleWindow(method.closingDay, method.dueDay, date)
    : null;

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

    const { referenceMonth, startDate, endDate, dueDate } = cycleWindow(
      method.closingDay,
      method.dueDay,
      date,
    );

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
