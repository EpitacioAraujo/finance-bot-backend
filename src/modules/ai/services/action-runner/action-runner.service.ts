import { Injectable, Logger } from '@nestjs/common';
import {
  ACTIONS,
  ActionName,
  isActionName,
  validateParams,
} from '@/modules/ai/catalog/actions';
import { AmbiguousError, DomainError, ValidationError } from '@/shared/errors';

import { PaymentMethodListService } from '@/modules/finance/services/payment-method-list/payment-method-list.service';
import { PaymentMethodCreateService } from '@/modules/finance/services/payment-method-create/payment-method-create.service';
import { TagListService } from '@/modules/finance/services/tag-list/tag-list.service';
import { TagCreateService } from '@/modules/finance/services/tag-create/tag-create.service';
import { TransactionListService } from '@/modules/finance/services/transaction-list/transaction-list.service';
import { TransactionUpdateService } from '@/modules/finance/services/transaction-update/transaction-update.service';
import { TransactionDeleteService } from '@/modules/finance/services/transaction-delete/transaction-delete.service';
import { SplitListService } from '@/modules/finance/services/split-list/split-list.service';
import { SplitPayService } from '@/modules/finance/services/split-pay/split-pay.service';
import { BillListService } from '@/modules/finance/services/bill-list/bill-list.service';
import { ReportService } from '@/modules/finance/services/report/report.service';
import { ConsolidatedListService } from '@/modules/finance/services/consolidated-list/consolidated-list.service';
import { ConsolidatedPayService } from '@/modules/finance/services/consolidated-pay/consolidated-pay.service';
import { TransactionCreateUseCase } from '@/modules/finance/use-cases/transaction-create/transaction-create.use-case';
import { BillPayUseCase } from '@/modules/finance/use-cases/bill-pay/bill-pay.use-case';
import { TagResolveService } from '@/modules/finance/services/tag-resolve/tag-resolve.service';

export interface PlanItem {
  action: string;
  params?: unknown;
}

export interface ActionResult {
  action: string;
  ok: boolean;
  data?: unknown;
  error?: string;
  candidates?: { id: string; description: string }[];
}

interface Input {
  userId: string;
  items: PlanItem[];
  expect: 'query' | 'command';
  /** Ids que apareceram numa leitura desta rodada. */
  knownIds: Set<string>;
}

const MAX_ITEMS = 10;

type Handler = (
  userId: string,
  params: Record<string, unknown>,
) => Promise<unknown>;

/**
 * A fronteira de segurança. O agente propõe; quem executa é isto, com o userId
 * que nós injetamos. Ele nunca toca o banco e nunca escolhe o escopo.
 */
@Injectable()
export class ActionRunnerService {
  private readonly logger = new Logger(ActionRunnerService.name);
  private readonly handlers: Record<ActionName, Handler>;

  constructor(
    private readonly paymentMethodList: PaymentMethodListService,
    private readonly paymentMethodCreate: PaymentMethodCreateService,
    private readonly tagList: TagListService,
    private readonly tagCreate: TagCreateService,
    private readonly tagResolve: TagResolveService,
    private readonly transactionList: TransactionListService,
    private readonly transactionUpdate: TransactionUpdateService,
    private readonly transactionDelete: TransactionDeleteService,
    private readonly splitList: SplitListService,
    private readonly splitPay: SplitPayService,
    private readonly billList: BillListService,
    private readonly report: ReportService,
    private readonly consolidatedList: ConsolidatedListService,
    private readonly consolidatedPay: ConsolidatedPayService,
    private readonly transactionCreate: TransactionCreateUseCase,
    private readonly billPay: BillPayUseCase,
  ) {
    this.handlers = {
      list_payment_methods: (userId) => this.paymentMethodList.exec({ userId }),
      list_tags: (userId) => this.tagList.exec({ userId }),
      list_transactions: async (userId, p) => {
        const [tag] = p.tag
          ? await this.tagResolve.exec({ userId, texts: [p.tag as string] })
          : [];
        return this.transactionList.exec({
          userId,
          from: p.from as string,
          to: p.to as string,
          type: p.type as 'income' | 'expense' | undefined,
          tagId: tag?.id,
          limit: (p.limit as number | undefined) ?? 50,
        });
      },
      list_bills: (userId, p) =>
        this.billList.exec({
          userId,
          from: p.from as string,
          to: p.to as string,
          status: p.status as 'paid' | 'pending' | undefined,
        }),
      list_splits: (userId, p) =>
        this.splitList.exec({ userId, transactionId: p.transactionId as string }),
      get_report: (userId, p) =>
        this.report.exec({
          userId,
          from: p.from as string,
          to: p.to as string,
          groupBy: p.groupBy as 'tag' | 'payment_method' | 'none',
          type: p.type as 'income' | 'expense' | undefined,
        }),
      list_consolidated: (userId, p) =>
        this.consolidatedList.exec({
          userId,
          from: p.from as string,
          to: p.to as string,
        }),

      create_transaction: (userId, p) =>
        this.transactionCreate.exec({
          userId,
          description: p.description as string,
          amount: p.amount as number,
          type: p.type as 'income' | 'expense',
          paymentMethod: p.paymentMethod as string,
          date: p.date as string | undefined,
          tags: p.tags as string[] | undefined,
          installments: p.installments as number | undefined,
        }),
      update_transaction: (userId, p) =>
        this.transactionUpdate.exec({
          userId,
          id: p.id as string,
          description: p.description as string | undefined,
          amount: p.amount as number | undefined,
          date: p.date as string | undefined,
        }),
      delete_transaction: (userId, p) =>
        this.transactionDelete.exec({ userId, id: p.id as string }),
      pay_split: async (userId, p) => {
        const splits = await this.splitList.exec({
          userId,
          transactionId: p.transactionId as string,
        });
        const target = p.number
          ? splits.find((split) => split.number === p.number)
          : splits.find((split) => !split.paidAt);
        if (!target) throw new ValidationError('Não achei essa parcela em aberto');
        return this.splitPay.exec({ userId, splitId: target.id });
      },
      pay_bill: (userId, p) =>
        this.billPay.exec({
          userId,
          billId: p.billId as string,
          amount: p.amount as number | undefined,
          date: p.date as string | undefined,
          paymentMethod: p.paymentMethod as string | undefined,
        }),
      pay_consolidated: (userId, p) =>
        this.consolidatedPay.exec({ userId, cycleId: p.cycleId as string }),
      create_payment_method: (userId, p) =>
        this.paymentMethodCreate.exec({
          userId,
          description: p.description as string,
          kind: p.kind as 'cash' | 'debit' | 'credit' | 'pix' | 'transfer',
          closingDay: p.closingDay as number | undefined,
          dueDay: p.dueDay as number | undefined,
        }),
      create_tag: (userId, p) =>
        this.tagCreate.exec({ userId, description: p.description as string }),
    };
  }

  async exec({ userId, items, expect, knownIds }: Input): Promise<ActionResult[]> {
    if (items.length > MAX_ITEMS) {
      throw new ValidationError(`O plano passou de ${MAX_ITEMS} ações`);
    }

    const results: ActionResult[] = [];

    for (const item of items) {
      if (!isActionName(item.action)) {
        this.logger.warn(`Ação fora do catálogo: ${item.action}`);
        throw new ValidationError(`Ação desconhecida: ${item.action}`);
      }
      if (ACTIONS[item.action].kind !== expect) {
        throw new ValidationError(
          `${item.action} é ${ACTIONS[item.action].kind} e veio no lugar de ${expect}`,
        );
      }

      const params = validateParams(item.action, item.params);

      // Id inventado não existe — e se existir, é de outro registro.
      if (
        (item.action === 'update_transaction' ||
          item.action === 'delete_transaction') &&
        !knownIds.has(params.id as string)
      ) {
        throw new ValidationError(
          `${item.action} exige um id vindo de uma leitura desta conversa`,
        );
      }

      try {
        results.push({
          action: item.action,
          ok: true,
          data: await this.handlers[item.action](userId, params),
        });
      } catch (error) {
        // Erro de domínio volta ao agente como resultado: é assim que ele
        // pergunta "qual cartão?" em vez de inventar. O resto sobe e o job
        // tenta de novo.
        if (!(error instanceof DomainError)) throw error;
        results.push({
          action: item.action,
          ok: false,
          error: error.message,
          ...(error instanceof AmbiguousError
            ? { candidates: error.candidates }
            : {}),
        });
      }
    }

    return results;
  }
}
