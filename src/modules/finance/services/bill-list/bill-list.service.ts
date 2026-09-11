import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Repository } from 'typeorm';
import { BillEntity } from '@/modules/finance/entities/bill.entity';
import { TransactionEntity } from '@/modules/finance/entities/transaction.entity';
import { dateAt, parseIso } from '@/shared/date';

export interface BillView {
  id: string;
  description: string;
  predictedAmount: number;
  occurrenceDate: string;
  frequency: string;
  paid: boolean;
  paidTransactionId: string | null;
  paidAmount: number | null;
  paymentMethod: { id: string; description: string };
  tag: { id: string; description: string } | null;
  notes: string | null;
}

export interface BillSummary {
  /** Soma do previsto de todas as ocorrências da janela. */
  totalPredicted: number;
  /** Soma do que foi realmente pago — valor da transação, não o previsto. */
  totalPaid: number;
  /** Soma do previsto das ocorrências ainda em aberto. */
  totalPending: number;
}

export interface BillListResult {
  items: BillView[];
  /** Cobre a janela inteira; o filtro de status só corta `items`. */
  summary: BillSummary;
}

export interface BillListInput {
  userId: string;
  from: string;
  to: string;
  status?: 'paid' | 'pending';
}

/**
 * Expande as ocorrências da janela a partir de frequency + dueDay/dueDate.
 * Nenhuma linha é criada no banco — não existe job mensal gerando previsão.
 */
export const occurrencesIn = (bill: BillEntity, from: string, to: string): string[] => {
  if (bill.frequency === 'none') {
    return bill.dueDate && bill.dueDate >= from && bill.dueDate <= to
      ? [bill.dueDate]
      : [];
  }

  const dates: string[] = [];

  // A conta recorrente vale do mês em que foi cadastrada em diante: antes disso
  // ela não existia, e gerar ocorrência para trás inventaria dívida vencida.
  const createdMonth = `${bill.createdAt.toISOString().slice(0, 7)}-01`;
  const start = from > createdMonth ? from : createdMonth;
  if (start > to) return dates;

  // Cada ocorrência sai de (ano, mês, dia), nunca de somar mês sobre a anterior:
  // caminhar a partir do resultado clampado faria dia 31 virar 28 para sempre.
  if (bill.frequency === 'monthly') {
    const day = bill.dueDay ?? 1;
    const first = parseIso(start);
    const year = first.getUTCFullYear();
    for (let month = first.getUTCMonth(); ; month++) {
      const date = dateAt(year, month, day);
      if (date > to) return dates;
      if (date >= start) dates.push(date);
    }
  }

  const anchor = parseIso(bill.dueDate as string);
  const month = anchor.getUTCMonth();
  const day = anchor.getUTCDate();
  for (let year = parseIso(start).getUTCFullYear(); ; year++) {
    const date = dateAt(year, month, day);
    if (date > to) return dates;
    if (date >= start) dates.push(date);
  }
};

@Injectable()
export class BillListService {
  constructor(
    @InjectRepository(BillEntity)
    private readonly bills: Repository<BillEntity>,
    @InjectRepository(TransactionEntity)
    private readonly transactions: Repository<TransactionEntity>,
  ) {}

  async exec({ userId, from, to, status }: BillListInput): Promise<BillListResult> {
    const bills = await this.bills.find({
      where: { userId, active: true },
      relations: { paymentMethod: true, tag: true },
    });
    if (bills.length === 0) {
      return {
        items: [],
        summary: { totalPredicted: 0, totalPaid: 0, totalPending: 0 },
      };
    }

    // O pagamento diz qual ocorrência quitou (`billOccurrenceDate`), então não
    // há palpite por proximidade: quem pagou setembro não paga outubro junto.
    const payments = await this.transactions.find({
      where: { userId, billId: In(bills.map((bill) => bill.id)) },
    });

    const views: BillView[] = [];
    for (const bill of bills) {
      const occurrences = occurrencesIn(bill, from, to);
      const candidates = payments.filter(
        (payment) => payment.billId === bill.id,
      );

      for (const occurrenceDate of occurrences) {
        const match = candidates.find(
          (payment) => payment.billOccurrenceDate === occurrenceDate,
        );

        views.push({
          id: bill.id,
          description: bill.description,
          predictedAmount: bill.predictedAmount,
          occurrenceDate,
          frequency: bill.frequency,
          paid: Boolean(match),
          paidTransactionId: match?.id ?? null,
          paidAmount: match?.amount ?? null,
          paymentMethod: {
            id: bill.paymentMethodId,
            description: bill.paymentMethod?.description ?? '',
          },
          tag: bill.tag
            ? { id: bill.tag.id, description: bill.tag.description }
            : null,
          notes: bill.notes,
        });
      }
    }

    const ordered = views.sort((a, b) =>
      a.occurrenceDate.localeCompare(b.occurrenceDate),
    );

    const summary = ordered.reduce(
      (acc, view) => ({
        totalPredicted: acc.totalPredicted + view.predictedAmount,
        totalPaid: acc.totalPaid + (view.paidAmount ?? 0),
        totalPending:
          acc.totalPending + (view.paid ? 0 : view.predictedAmount),
      }),
      { totalPredicted: 0, totalPaid: 0, totalPending: 0 },
    );

    return {
      items: status
        ? ordered.filter((view) => view.paid === (status === 'paid'))
        : ordered,
      summary,
    };
  }
}
