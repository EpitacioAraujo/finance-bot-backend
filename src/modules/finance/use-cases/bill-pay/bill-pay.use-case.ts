import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { BillEntity } from '@/modules/finance/entities/bill.entity';
import { UserEntity } from '@/modules/finance/entities/user.entity';
import { BillListService } from '@/modules/finance/services/bill-list/bill-list.service';
import {
  TransactionCreateUseCase,
  TransactionCreateUseCaseOutput,
} from '@/modules/finance/use-cases/transaction-create/transaction-create.use-case';
import { ConflictError, NotFoundError } from '@/shared/errors';
import { addDays, isoToday, parseIso } from '@/shared/date';

export interface BillPayInput {
  userId: string;
  billId: string;
  amount?: number;
  date?: string;
  /** Qual vencimento está sendo pago; a tela sabe, o WhatsApp não. */
  occurrenceDate?: string;
  /** De onde saiu o dinheiro. Omitido, usa a forma de pagamento da conta. */
  paymentMethod?: string;
}

/**
 * Não existe "marcar conta como paga". Uma conta está paga porque existe uma
 * transação apontando para ela — um estado, não dois.
 */
@Injectable()
export class BillPayUseCase {
  constructor(
    @InjectRepository(BillEntity)
    private readonly bills: Repository<BillEntity>,
    @InjectRepository(UserEntity)
    private readonly users: Repository<UserEntity>,
    private readonly billList: BillListService,
    private readonly transactionCreate: TransactionCreateUseCase,
  ) {}

  async exec(input: BillPayInput): Promise<TransactionCreateUseCaseOutput> {
    const user = await this.users.findOne({
      where: { id: input.userId, active: true },
    });
    if (!user) throw new NotFoundError('Usuário não encontrado');

    const bill = await this.bills.findOne({
      where: { id: input.billId, userId: input.userId },
    });
    if (!bill) throw new NotFoundError('Conta não encontrada');

    const date = input.date ?? isoToday(user.timezone);

    // A tela diz qual ocorrência está pagando. Pelo WhatsApp não vem nada, e aí
    // vale a ocorrência mais próxima da data do pagamento.
    const window = input.occurrenceDate
      ? { from: input.occurrenceDate, to: input.occurrenceDate }
      : { from: addDays(date, -20), to: addDays(date, 20) };

    const nearby = await this.billList.exec({ userId: input.userId, ...window });
    const candidates = nearby.items.filter((view) => view.id === bill.id);

    const occurrence = input.occurrenceDate
      ? candidates[0]
      : candidates.sort(
          (a, b) =>
            Math.abs(parseIso(a.occurrenceDate).getTime() - parseIso(date).getTime()) -
            Math.abs(parseIso(b.occurrenceDate).getTime() - parseIso(date).getTime()),
        )[0];

    if (input.occurrenceDate && !occurrence) {
      throw new NotFoundError(
        `"${bill.description}" não vence em ${input.occurrenceDate}`,
      );
    }

    if (occurrence?.paid) {
      throw new ConflictError(
        `"${bill.description}" de ${occurrence.occurrenceDate} já está paga`,
      );
    }

    return this.transactionCreate.exec({
      userId: input.userId,
      description: bill.description,
      amount: input.amount ?? bill.predictedAmount,
      type: 'expense',
      date,
      // A conta já tem os ids; só o override do agente vem como texto.
      ...(input.paymentMethod
        ? { paymentMethod: input.paymentMethod }
        : { paymentMethodId: bill.paymentMethodId }),
      tagIds: bill.tagId ? [bill.tagId] : [],
      billId: bill.id,
      billOccurrenceDate: occurrence?.occurrenceDate ?? null,
    });
  }
}
