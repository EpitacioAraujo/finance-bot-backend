import { Injectable } from '@nestjs/common';
import { InjectDataSource, InjectRepository } from '@nestjs/typeorm';
import { DataSource, Repository } from 'typeorm';
import {
  TransactionEntity,
  TransactionType,
} from '@/modules/finance/entities/transaction.entity';
import { TransactionSplitEntity } from '@/modules/finance/entities/transaction-split.entity';
import { UserEntity } from '@/modules/finance/entities/user.entity';
import { PaymentMethodResolveService } from '@/modules/finance/services/payment-method-resolve/payment-method-resolve.service';
import { TagResolveService } from '@/modules/finance/services/tag-resolve/tag-resolve.service';
import { CycleResolveService } from '@/modules/finance/services/cycle-resolve/cycle-resolve.service';
import { TransactionCreateService } from '@/modules/finance/services/transaction-create/transaction-create.service';
import { SplitGenerateService } from '@/modules/finance/services/split-generate/split-generate.service';
import { NotFoundError } from '@/shared/errors';
import { isoToday } from '@/shared/date';

export interface TransactionCreateUseCaseInput {
  userId: string;
  description: string;
  amount: number;
  type: TransactionType;
  /** Exatamente um dos dois: o agente manda nome, a web manda id. */
  paymentMethod?: string;
  paymentMethodId?: string;
  date?: string;
  /** Idem: nomes do agente, ids da web. */
  tags?: string[];
  tagIds?: string[];
  installments?: number;
  billId?: string | null;
  billOccurrenceDate?: string | null;
  originMessageId?: string | null;
  notes?: string | null;
}

export type TransactionCreateUseCaseOutput = TransactionEntity & {
  splits: TransactionSplitEntity[];
};

@Injectable()
export class TransactionCreateUseCase {
  constructor(
    @InjectDataSource() private readonly dataSource: DataSource,
    @InjectRepository(UserEntity)
    private readonly users: Repository<UserEntity>,
    private readonly paymentMethodResolve: PaymentMethodResolveService,
    private readonly tagResolve: TagResolveService,
    private readonly cycleResolve: CycleResolveService,
    private readonly transactionCreate: TransactionCreateService,
    private readonly splitGenerate: SplitGenerateService,
  ) {}

  async exec(
    input: TransactionCreateUseCaseInput,
  ): Promise<TransactionCreateUseCaseOutput> {
    const user = await this.users.findOne({
      where: { id: input.userId, active: true },
    });
    if (!user) throw new NotFoundError('Usuário não encontrado');

    const method = await this.paymentMethodResolve.exec({
      userId: input.userId,
      text: input.paymentMethod,
      id: input.paymentMethodId,
    });
    const tags = await this.tagResolve.exec({
      userId: input.userId,
      texts: input.tags,
      ids: input.tagIds,
    });

    const date = input.date ?? isoToday(user.timezone);
    const installments = input.installments ?? 1;

    // À vista no crédito guarda o ciclo na própria transação; parcelado deixa
    // nulo e cada parcela carrega o seu — senão a fatura soma duas vezes.
    const cycle =
      method.kind === 'credit' && installments === 1
        ? await this.cycleResolve.exec({
            paymentMethodId: method.id,
            date,
          })
        : null;

    return this.dataSource.transaction(async (manager) => {
      const transaction = await this.transactionCreate.exec({
        userId: input.userId,
        description: input.description,
        amount: input.amount,
        type: input.type,
        date,
        paymentMethodId: method.id,
        tagIds: tags.map((tag) => tag.id),
        cycleId: cycle?.id ?? null,
        billId: input.billId ?? null,
        billOccurrenceDate: input.billOccurrenceDate ?? null,
        installments,
        originMessageId: input.originMessageId ?? null,
        notes: input.notes ?? null,
        manager,
      });

      const splits =
        installments > 1
          ? await this.splitGenerate.exec({
              transactionId: transaction.id,
              total: installments,
              amount: input.amount,
              paymentMethodId: method.id,
              purchaseDate: date,
              manager,
            })
          : [];

      return Object.assign(transaction, { splits });
    });
  }
}
