import { Injectable } from '@nestjs/common';
import { InjectDataSource, InjectRepository } from '@nestjs/typeorm';
import { DataSource, Repository } from 'typeorm';
import {
  TransactionEntity,
  TransactionType,
} from '@/modules/finance/entities/transaction.entity';
import { TransactionTrancheEntity } from '@/modules/finance/entities/transaction-tranche.entity';
import { UserEntity } from '@/modules/finance/entities/user.entity';
import { PaymentMethodResolveService } from '@/modules/finance/services/payment-method-resolve/payment-method-resolve.service';
import { TagResolveService } from '@/modules/finance/services/tag-resolve/tag-resolve.service';
import { TransactionCreateService } from '@/modules/finance/services/transaction-create/transaction-create.service';
import { TrancheGenerateService } from '@/modules/finance/services/tranche-generate/tranche-generate.service';
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
  /** Quantas tranches gerar. 1 = à vista, e mesmo assim gera uma. */
  installments?: number;
  billId?: string | null;
  billOccurrenceDate?: string | null;
  originMessageId?: string | null;
  notes?: string | null;
}

export type TransactionCreateUseCaseOutput = TransactionEntity & {
  tranches: TransactionTrancheEntity[];
};

@Injectable()
export class TransactionCreateUseCase {
  constructor(
    @InjectDataSource() private readonly dataSource: DataSource,
    @InjectRepository(UserEntity)
    private readonly users: Repository<UserEntity>,
    private readonly paymentMethodResolve: PaymentMethodResolveService,
    private readonly tagResolve: TagResolveService,
    private readonly transactionCreate: TransactionCreateService,
    private readonly trancheGenerate: TrancheGenerateService,
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

    return this.dataSource.transaction(async (manager) => {
      const transaction = await this.transactionCreate.exec({
        userId: input.userId,
        description: input.description,
        amount: input.amount,
        type: input.type,
        date,
        paymentMethodId: method.id,
        tagIds: tags.map((tag) => tag.id),
        billId: input.billId ?? null,
        billOccurrenceDate: input.billOccurrenceDate ?? null,
        originMessageId: input.originMessageId ?? null,
        notes: input.notes ?? null,
        manager,
      });

      // Sempre, inclusive à vista: quem lê fatura e caixa não tem caso especial
      // para tratar, e ciclo mora só na tranche.
      const tranches = await this.trancheGenerate.exec({
        transactionId: transaction.id,
        total: input.installments ?? 1,
        amount: input.amount,
        paymentMethodId: method.id,
        purchaseDate: date,
        manager,
      });

      return Object.assign(transaction, { tranches });
    });
  }
}
