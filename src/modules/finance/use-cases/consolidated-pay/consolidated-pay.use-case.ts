import { Injectable } from '@nestjs/common';
import { PaymentMethodCycleEntity } from '@/modules/finance/entities/payment-method-cycle.entity';
import { TransactionType } from '@/modules/finance/entities/transaction.entity';
import { CycleGetService } from '@/modules/finance/services/cycle-get/cycle-get.service';
import { BillListService } from '@/modules/finance/services/bill-list/bill-list.service';
import { ConsolidatedPayService } from '@/modules/finance/services/consolidated-pay/consolidated-pay.service';
import { BillPayUseCase } from '@/modules/finance/use-cases/bill-pay/bill-pay.use-case';
import { ConflictError } from '@/shared/errors';

/**
 * Pagar a fatura tem que quitar **tudo** que estava somado nela, e o total
 * inclui as contas recorrentes ainda previstas. Sem este passo elas ficavam
 * pendentes para sempre: a fatura fechava, a previsão sumia da tela junto, e
 * não sobrava caminho nenhum para pagá-las.
 *
 * A ordem importa. Primeiro as contas viram transação — cada uma cria a sua
 * tranche dentro desta mesma fatura — e só então o ciclo fecha, quitando todas
 * as tranches de uma vez, inclusive as que acabaram de nascer.
 */
@Injectable()
export class ConsolidatedPayUseCase {
  constructor(
    private readonly cycleGet: CycleGetService,
    private readonly billList: BillListService,
    private readonly billPay: BillPayUseCase,
    private readonly consolidatedPay: ConsolidatedPayService,
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
    const cycle = await this.cycleGet.exec({ userId, cycleId });
    // Antes de pagar as contas: depois, o ConflictError do service chegaria com
    // as transações já criadas.
    if (cycle.closedAt) {
      throw new ConflictError(
        `A fatura de ${cycle.referenceMonth} já está paga`,
      );
    }

    const bills = await this.billList.exec({
      userId,
      from: cycle.startDate,
      to: cycle.endDate,
      type: TransactionType.Expense,
      status: 'pending',
    });

    for (const bill of bills.items) {
      if (bill.paymentMethod.id !== cycle.paymentMethodId) continue;
      await this.billPay.exec({
        userId,
        billId: bill.id,
        occurrenceDate: bill.occurrenceDate,
        amount: bill.predictedAmount,
        date: bill.occurrenceDate,
      });
    }

    return this.consolidatedPay.exec({ userId, cycleId, paidAt });
  }
}
