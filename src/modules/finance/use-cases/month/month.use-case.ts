import { Injectable } from '@nestjs/common';
import { TransactionType } from '@/modules/finance/entities/transaction.entity';
import { PaymentMethodKind } from '@/modules/finance/entities/payment-method.entity';
import {
  BillListService,
  BillView,
} from '@/modules/finance/services/bill-list/bill-list.service';
import {
  TrancheDueListService,
  TrancheDueView,
} from '@/modules/finance/services/tranche-due-list/tranche-due-list.service';
import { PaymentMethodListService } from '@/modules/finance/services/payment-method-list/payment-method-list.service';
import { cycleOf } from '@/modules/finance/services/cycle-resolve/cycle-resolve.service';
import { ConsolidatedListUseCase } from '@/modules/finance/use-cases/consolidated-list/consolidated-list.use-case';
import { addDays, addMonths, dateAt, parseIso } from '@/shared/date';

export interface MonthLine {
  key: string;
  description: string;
  date: string;
  amount: number;
  status: 'paid' | 'pending';
  billId: string | null;
  transactionId: string | null;
  paymentMethod: string;
  /** '8/10' em parcela. */
  tranche: string | null;
  /** Só na linha de fatura: o ciclo que o Pagar fecha. */
  cycleId: string | null;
  /** Só nas contas pagas. */
  paidDate: string | null;
}

/** Previsto e efetivo têm as mesmas linhas; o que não se aplica vem 0. */
export interface MonthTotals {
  income: number;
  bills: number;
  recurring: number;
  entries: number;
  invoices: number;
  expense: number;
  balance: number;
}

export interface MonthGroup {
  paymentMethod: { id: string; description: string; kind: PaymentMethodKind };
  /** Soma dos lançamentos. */
  total: number;
  /** Soma das recorrências cobradas nesta forma. */
  recurring: number;
  /** Só cartão: a janela do ciclo que abre no mês. */
  invoice: { startDate: string; endDate: string; dueDate: string } | null;
  items: MonthLine[];
}

export interface MonthOutput {
  totals: {
    /** Conta pendente pelo previsto; cartão pela compra. */
    planned: MonthTotals;
    /** Só o que já entrou ou saiu: cartão conta quando a fatura é paga. */
    actual: MonthTotals;
  };
  bills: {
    /**
     * Contas fora do cartão + a fatura do ciclo anterior de cada cartão. A
     * fatura só soma no efetivo: no previsto, as compras dela já contaram no
     * mês em que foram feitas.
     */
    payable: MonthLine[];
    /** Contas a receber + receitas avulsas. */
    receivable: MonthLine[];
  };
  /** Contas no cartão: caem sozinhas na fatura. Ocorrência no mês civil. */
  recurring: MonthLine[];
  /** Uma por forma de pagamento ativa. */
  groups: MonthGroup[];
}

/**
 * O mês como a planilha. O mês é o de consumo: no cartão, o ciclo que abre nele
 * (fechamento dia 7: setembro é 07/09 a 06/10); fora dele, a data.
 *
 * Tranche com `billId` é o pagamento de uma conta ou a cobrança de uma
 * recorrência. Ela não entra nos lançamentos: a conta já mostra o valor, e
 * contar a tranche também somaria o mesmo dinheiro duas vezes.
 */
@Injectable()
export class MonthUseCase {
  constructor(
    private readonly trancheDueList: TrancheDueListService,
    private readonly billList: BillListService,
    private readonly consolidatedList: ConsolidatedListUseCase,
    private readonly paymentMethodList: PaymentMethodListService,
  ) {}

  async exec({
    userId,
    from,
    to,
  }: {
    userId: string;
    from: string;
    to: string;
  }): Promise<MonthOutput> {
    const [tranches, bills, previousCycles, methods] = await Promise.all([
      this.trancheDueList.exec({ userId, from, to }),
      this.billList.exec({ userId, from, to }),
      // A fatura que se paga neste mês é a do ciclo que abriu no anterior.
      this.consolidatedList.exec({
        userId,
        from: addMonths(from, -1),
        to: addDays(from, -1),
        basis: 'cycle',
      }),
      this.paymentMethodList.exec({ userId }),
    ]);

    const byDate = (a: MonthLine, b: MonthLine): number =>
      a.date.localeCompare(b.date);
    // Em centavos: somar decimal em float deixa saldo de -1068.2999999.
    const sum = (amounts: number[]): number =>
      amounts.reduce((acc, amount) => acc + Math.round(amount * 100), 0) / 100;
    const amounts = (lines: MonthLine[]): number[] =>
      lines.map((line) => line.amount);
    const paid = (lines: MonthLine[]): MonthLine[] =>
      lines.filter((line) => line.status === 'paid');

    const fromBill = (bill: BillView): MonthLine => ({
      key: `${bill.id}-${bill.occurrenceDate}`,
      description: bill.description,
      date: bill.occurrenceDate,
      amount: bill.paidAmount ?? bill.predictedAmount,
      status: bill.paid ? 'paid' : 'pending',
      billId: bill.id,
      transactionId: bill.paidTransactionId,
      paymentMethod: bill.paymentMethod.description,
      tranche: null,
      cycleId: null,
      paidDate: bill.paidDate,
    });

    const fromTranche = (tranche: TrancheDueView): MonthLine => ({
      key: tranche.id,
      description: tranche.description,
      date: tranche.purchaseDate,
      amount: tranche.amount,
      status: tranche.paidAt || !tranche.cycleId ? 'paid' : 'pending',
      billId: tranche.billId,
      transactionId: tranche.transactionId,
      paymentMethod: tranche.paymentMethod.description,
      tranche: tranche.tranche,
      cycleId: null,
      paidDate: null,
    });

    const onCard = (bill: BillView): boolean => bill.paymentMethod.kind === 'credit';
    const expense = (bill: BillView): boolean => bill.type === TransactionType.Expense;

    const payableBills = bills.items
      .filter((bill) => expense(bill) && !onCard(bill))
      .map(fromBill);
    const recurring = bills.items
      .filter((bill) => expense(bill) && onCard(bill))
      .map(fromBill)
      .sort(byDate);
    const receivable = [
      ...bills.items.filter((bill) => !expense(bill)).map(fromBill),
      ...tranches
        .filter(
          (tranche) =>
            tranche.type === TransactionType.Income &&
            !tranche.cycleId &&
            !tranche.billId,
        )
        .map(fromTranche),
    ].sort(byDate);

    const start = parseIso(from);
    const groups: MonthGroup[] = methods.map((method) => {
      const items = tranches
        .filter(
          (tranche) =>
            tranche.type === TransactionType.Expense &&
            tranche.paymentMethod.id === method.id &&
            !tranche.billId,
        )
        .map(fromTranche)
        .sort(byDate);
      const window =
        method.closingDay !== null &&
        cycleOf(
          method,
          dateAt(start.getUTCFullYear(), start.getUTCMonth(), method.closingDay),
        );

      return {
        paymentMethod: {
          id: method.id,
          description: method.description,
          kind: method.kind,
        },
        total: sum(amounts(items)),
        recurring: sum(
          bills.items
            .filter(
              (bill) =>
                expense(bill) && onCard(bill) && bill.paymentMethod.id === method.id,
            )
            .map((bill) => bill.paidAmount ?? bill.predictedAmount),
        ),
        invoice: window
          ? {
              startDate: window.startDate,
              endDate: window.endDate,
              dueDate: window.dueDate,
            }
          : null,
        items,
      };
    });

    const invoices = previousCycles.map(
      (cycle): MonthLine => ({
        key: `invoice-${cycle.paymentMethod.id}-${cycle.startDate}`,
        description: `Fatura ${cycle.paymentMethod.description} de ${parseIso(
          cycle.startDate,
        ).toLocaleDateString('pt-BR', { month: 'long', timeZone: 'UTC' })}`,
        date: cycle.dueDate,
        amount: cycle.total,
        status: cycle.closedAt ? 'paid' : 'pending',
        billId: null,
        transactionId: null,
        paymentMethod: cycle.paymentMethod.description,
        tranche: null,
        cycleId: cycle.cycleId,
        paidDate: null,
      }),
    );

    const totals = (parts: Omit<MonthTotals, 'expense' | 'balance'>): MonthTotals => {
      const total = sum([parts.bills, parts.recurring, parts.entries, parts.invoices]);
      return { ...parts, expense: total, balance: sum([parts.income, -total]) };
    };

    return {
      totals: {
        planned: totals({
          income: sum(amounts(receivable)),
          bills: sum(amounts(payableBills)),
          recurring: sum(amounts(recurring)),
          entries: sum(groups.map((group) => group.total)),
          invoices: 0,
        }),
        actual: totals({
          income: sum(amounts(paid(receivable))),
          bills: sum(amounts(paid(payableBills))),
          recurring: 0,
          entries: sum(
            groups
              .filter((group) => group.paymentMethod.kind !== 'credit')
              .map((group) => group.total),
          ),
          invoices: sum(amounts(paid(invoices))),
        }),
      },
      bills: {
        payable: [...payableBills, ...invoices].sort(byDate),
        receivable,
      },
      recurring,
      groups,
    };
  }
}
