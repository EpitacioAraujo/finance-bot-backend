import { ValidationError } from '@/shared/errors';
import { BillFrequency } from './entities/bill.entity';
import { PaymentMethodKind } from './entities/payment-method.entity';

/**
 * Fechamento e vencimento existem para cartão de crédito e só para ele. O tipo
 * decide: fora do crédito os dias são zerados, não rejeitados — quem chama
 * manda o que tem, inclusive o resto de quando era crédito.
 */
export const applyPaymentMethodKind = (method: {
  kind: PaymentMethodKind;
  closingDay?: number | null;
  dueDay?: number | null;
}): void => {
  if (method.kind === 'credit') {
    if (method.closingDay == null || method.dueDay == null) {
      throw new ValidationError(
        'Cartão de crédito exige dia de fechamento e de vencimento',
      );
    }
    return;
  }
  method.closingDay = null;
  method.dueDay = null;
};

/**
 * `none` e `yearly` são ancoradas numa data — dia sozinho não diz o mês da
 * conta anual. `monthly` é ancorada num dia do mês. A frequência decide qual
 * campo vale; o outro é zerado, não rejeitado.
 */
export const applyBillSchedule = (bill: {
  frequency: BillFrequency;
  dueDate?: string | null;
  dueDay?: number | null;
}): void => {
  if (bill.frequency === 'monthly') {
    if (bill.dueDay == null || bill.dueDay < 1 || bill.dueDay > 31) {
      throw new ValidationError('Conta mensal exige um dia de vencimento de 1 a 31');
    }
    bill.dueDate = null;
    return;
  }
  if (!bill.dueDate) {
    throw new ValidationError(
      `frequency=${bill.frequency} exige uma data de vencimento`,
    );
  }
  bill.dueDay = null;
};
