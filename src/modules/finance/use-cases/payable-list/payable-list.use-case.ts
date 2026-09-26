import { Injectable } from '@nestjs/common';
import { BillListService } from '@/modules/finance/services/bill-list/bill-list.service';
import {
  ConsolidatedLine,
  ConsolidatedListUseCase,
} from '@/modules/finance/use-cases/consolidated-list/consolidated-list.use-case';
import { TransactionType } from '@/modules/finance/entities/transaction.entity';

export interface PayableListInput {
  userId: string;
  from: string;
  to: string;
  /** Omitido, traz a pagar e a receber juntas; o grupo diz qual é. */
  type?: TransactionType;
}

export interface RecurrenceLine {
  /** bill.id — é o que vai na URL de editar e apagar. */
  billId: string;
  /** Chave de linha: a mesma conta repete por ocorrência. */
  key: string;
  description: string;
  /** Em cartão, o dia em que a cobrança cai; fora dele, o vencimento. */
  date: string;
  amount: number;
  status: 'paid' | 'pending';
  /** Falso no cartão: lá dentro quem paga é a fatura. */
  payable: boolean;
}

export interface RecurrenceGroup {
  /** A pagar ou a receber. Cartão só aparece a pagar. */
  type: TransactionType;
  paymentMethod: { id: string; description: string };
  /**
   * Só crédito: a fatura do mês. É ela que se paga, de uma vez — por isso as
   * contas do grupo não têm botão próprio.
   */
  invoice: {
    /** Nulo na fatura que ainda não existe no banco: não há o que fechar. */
    cycleId: string | null;
    startDate: string;
    endDate: string;
    dueDate: string;
    total: number;
    status: 'paid' | 'pending';
  } | null;
  items: RecurrenceLine[];
}

export interface PayableListOutput {
  groups: RecurrenceGroup[];
}

/**
 * Uma tela, um botão por coisa que se paga. A forma de pagamento é o grupo; num
 * cartão o cabeçalho do grupo **é a fatura**, com o valor do mês e o botão que
 * quita tudo de uma vez. Fora do cartão cada conta tem o seu.
 *
 * Conta no cartão não ganha botão de propósito: o dinheiro dela sai pela
 * fatura, e oferecer os dois faria pagar duas vezes o mesmo valor.
 */
@Injectable()
export class PayableListUseCase {
  constructor(
    private readonly billList: BillListService,
    private readonly consolidatedList: ConsolidatedListUseCase,
  ) {}

  async exec({
    userId,
    from,
    to,
    type,
  }: PayableListInput): Promise<PayableListOutput> {
    // Fatura de cartão é sempre despesa: só fica de fora quando se pede a receber.
    const [bills, cycles] = await Promise.all([
      this.billList.exec({ userId, from, to, type }),
      type === TransactionType.Income
        ? []
        : this.consolidatedList.exec({ userId, from, to }),
    ]);

    const inside = (item: ConsolidatedLine): RecurrenceLine => ({
      ...item,
      payable: false,
    });

    const groups: RecurrenceGroup[] = cycles.map((cycle) => ({
      type: TransactionType.Expense,
      paymentMethod: cycle.paymentMethod,
      invoice: {
        cycleId: cycle.cycleId,
        startDate: cycle.startDate,
        endDate: cycle.endDate,
        dueDate: cycle.dueDate,
        total: cycle.total,
        status: cycle.closedAt ? 'paid' : 'pending',
      },
      items: cycle.items.map(inside),
    }));

    // Conta no cartão já entrou pela fatura acima; aqui entram as outras.
    for (const bill of bills.items) {
      if (bill.paymentMethod.kind === 'credit') continue;

      let group = groups.find(
        (candidate) =>
          candidate.invoice === null &&
          candidate.type === bill.type &&
          candidate.paymentMethod.id === bill.paymentMethod.id,
      );
      if (!group) {
        group = {
          type: bill.type,
          paymentMethod: {
            id: bill.paymentMethod.id,
            description: bill.paymentMethod.description,
          },
          invoice: null,
          items: [],
        };
        groups.push(group);
      }

      group.items.push({
        billId: bill.id,
        key: `${bill.id}-${bill.occurrenceDate}`,
        description: bill.description,
        date: bill.occurrenceDate,
        amount: bill.paidAmount ?? bill.predictedAmount,
        status: bill.paid ? 'paid' : 'pending',
        payable: true,
      });
    }

    for (const group of groups) {
      group.items.sort((a, b) => a.date.localeCompare(b.date));
    }

    return {
      // Fatura primeiro, por vencimento; o resto por nome.
      groups: groups.sort((a, b) => {
        if (a.invoice && b.invoice) {
          return a.invoice.dueDate.localeCompare(b.invoice.dueDate);
        }
        if (a.invoice) return -1;
        if (b.invoice) return 1;
        return a.paymentMethod.description.localeCompare(
          b.paymentMethod.description,
        );
      }),
    };
  }
}
