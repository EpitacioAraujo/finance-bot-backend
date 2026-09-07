import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Between, In, Repository } from 'typeorm';
import { BillEntity } from '@/modules/finance/entities/bill.entity';
import { TransactionEntity } from '@/modules/finance/entities/transaction.entity';
import { addDays, dateAt, parseIso } from '@/shared/date';

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

  // Cada ocorrência sai de (ano, mês, dia), nunca de somar mês sobre a anterior:
  // caminhar a partir do resultado clampado faria dia 31 virar 28 para sempre.
  if (bill.frequency === 'monthly') {
    const day = bill.dueDay ?? 1;
    const start = parseIso(from);
    const year = start.getUTCFullYear();
    for (let month = start.getUTCMonth(); ; month++) {
      const date = dateAt(year, month, day);
      if (date > to) return dates;
      if (date >= from) dates.push(date);
    }
  }

  const anchor = parseIso(bill.dueDate as string);
  const month = anchor.getUTCMonth();
  const day = anchor.getUTCDate();
  for (let year = parseIso(from).getUTCFullYear(); ; year++) {
    const date = dateAt(year, month, day);
    if (date > to) return dates;
    if (date >= from) dates.push(date);
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

  async exec({ userId, from, to, status }: BillListInput): Promise<BillView[]> {
    const bills = await this.bills.find({
      where: { userId, active: true },
      relations: { paymentMethod: true, tag: true },
    });
    if (bills.length === 0) return [];

    // Pagamento adiantado ou atrasado ainda pertence à ocorrência da janela.
    const payments = await this.transactions.find({
      where: {
        userId,
        billId: In(bills.map((bill) => bill.id)),
        date: Between(addDays(from, -45), addDays(to, 45)),
      },
    });

    const views: BillView[] = [];
    for (const bill of bills) {
      const occurrences = occurrencesIn(bill, from, to);
      const candidates = payments.filter(
        (payment) => payment.billId === bill.id,
      );
      const taken = new Set<string>();

      for (const occurrenceDate of occurrences) {
        // Cada pagamento fica com a ocorrência de data mais próxima.
        const match = candidates
          .filter((payment) => !taken.has(payment.id))
          .sort(
            (a, b) =>
              Math.abs(parseIso(a.date).getTime() - parseIso(occurrenceDate).getTime()) -
              Math.abs(parseIso(b.date).getTime() - parseIso(occurrenceDate).getTime()),
          )[0];
        if (match) taken.add(match.id);

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
    if (!status) return ordered;
    return ordered.filter((view) => view.paid === (status === 'paid'));
  }
}
