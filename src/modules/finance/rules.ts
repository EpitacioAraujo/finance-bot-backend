import { ValidationError } from '@/shared/errors';
import { BillFrequency } from './entities/bill.entity';
import { PaymentMethodKind } from './entities/payment-method.entity';

/** Fechamento e vencimento existem para cartão de crédito e só para ele. */
export const assertPaymentMethodKind = (input: {
  kind: PaymentMethodKind;
  closingDay?: number | null;
  dueDay?: number | null;
}): void => {
  const hasDays = input.closingDay != null && input.dueDay != null;
  if (input.kind === 'credit' && !hasDays) {
    throw new ValidationError(
      'Cartão de crédito exige dia de fechamento e de vencimento',
    );
  }
  if (input.kind !== 'credit' && (input.closingDay != null || input.dueDay != null)) {
    throw new ValidationError(
      'Fechamento e vencimento só valem para cartão de crédito',
    );
  }
};

/**
 * `none` e `yearly` são ancoradas numa data — dia sozinho não diz o mês da
 * conta anual. `monthly` é ancorada num dia do mês.
 */
export const assertBillSchedule = (input: {
  frequency: BillFrequency;
  dueDate?: string | null;
  dueDay?: number | null;
}): void => {
  const needsDate = input.frequency !== 'monthly';

  if (needsDate && !input.dueDate) {
    throw new ValidationError(
      `frequency=${input.frequency} exige uma data de vencimento`,
    );
  }
  if (!needsDate && input.dueDay == null) {
    throw new ValidationError(
      `frequency=${input.frequency} exige um dia de vencimento`,
    );
  }
  if (!needsDate && input.dueDate) {
    throw new ValidationError(
      `frequency=${input.frequency} não usa data de vencimento`,
    );
  }
  if (needsDate && input.dueDay != null) {
    throw new ValidationError(
      `frequency=${input.frequency} não usa dia de vencimento`,
    );
  }
  if (
    input.frequency === 'monthly' &&
    (input.dueDay! < 1 || input.dueDay! > 31)
  ) {
    throw new ValidationError('dueDay mensal vai de 1 a 31');
  }
};
