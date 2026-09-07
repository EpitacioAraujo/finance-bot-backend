import { Inject, Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import Redis from 'ioredis';
import { In, Repository } from 'typeorm';
import { RawMessageEntity } from '@/modules/whatsapp/entities/raw-message.entity';
import { WhatsappSendService } from '@/modules/whatsapp/services/whatsapp-send/whatsapp-send.service';
import { UserResolveService } from '@/modules/finance/services/user-resolve/user-resolve.service';
import { PaymentMethodListService } from '@/modules/finance/services/payment-method-list/payment-method-list.service';
import { TagListService } from '@/modules/finance/services/tag-list/tag-list.service';
import { ConversationHistoryService } from '@/modules/ai/services/conversation-history/conversation-history.service';
import { ConversationSaveService } from '@/modules/ai/services/conversation-save/conversation-save.service';
import { PlanRequestService } from '@/modules/ai/services/plan-request/plan-request.service';
import {
  ActionResult,
  ActionRunnerService,
} from '@/modules/ai/services/action-runner/action-runner.service';
import { buildPrompt } from '@/modules/ai/prompt';
import { REDIS } from '@/config/redis.module';
import { DomainError } from '@/shared/errors';
import { isoToday } from '@/shared/date';

const HISTORY_LIMIT = 100;
const FALLBACK_REPLY = 'Não entendi direito. Pode mandar de novo?';

/** Ids que o agente pode usar em update/delete: só o que ele leu nesta rodada. */
const collectIds = (results: ActionResult[]): Set<string> => {
  const ids = new Set<string>();
  const walk = (value: unknown): void => {
    if (Array.isArray(value)) return value.forEach(walk);
    if (value && typeof value === 'object') {
      const record = value as Record<string, unknown>;
      if (typeof record.id === 'string') ids.add(record.id);
      Object.values(record).forEach(walk);
    }
  };
  walk(results.map((result) => result.data));
  return ids;
};

@Injectable()
export class InterpretUseCase {
  private readonly logger = new Logger(InterpretUseCase.name);

  constructor(
    @InjectRepository(RawMessageEntity)
    private readonly rawMessages: Repository<RawMessageEntity>,
    @Inject(REDIS) private readonly redis: Redis,
    private readonly userResolve: UserResolveService,
    private readonly paymentMethodList: PaymentMethodListService,
    private readonly tagList: TagListService,
    private readonly history: ConversationHistoryService,
    private readonly conversationSave: ConversationSaveService,
    private readonly planRequest: PlanRequestService,
    private readonly actionRunner: ActionRunnerService,
    private readonly send: WhatsappSendService,
  ) {}

  async exec({ phone }: { phone: string }): Promise<void> {
    const key = `pending:${phone}`;
    const ids = await this.redis.lrange(key, 0, -1);
    await this.redis.del(key);
    if (ids.length === 0) return;

    const messages = await this.rawMessages.find({ where: { id: In(ids) } });
    const pending = messages.filter((message) => !message.processedAt);

    // Job reprocessado depois de já ter gravado: reenvia o que ficou guardado
    // em vez de chamar o LLM e criar tudo de novo.
    if (pending.length === 0) {
      const previous = messages.at(-1)?.replyText;
      if (previous) await this.send.exec({ to: phone, text: previous });
      return;
    }

    const user = await this.userResolve.exec({ phone });
    if (!user) {
      this.logger.warn(`Telefone ${phone} não pertence a nenhum usuário`);
      return;
    }

    const incoming = pending
      .map((message) => message.resolvedText ?? '')
      .filter(Boolean);
    const [paymentMethods, tags, history] = await Promise.all([
      this.paymentMethodList.exec({ userId: user.id }),
      this.tagList.exec({ userId: user.id }),
      this.history.exec({ userId: user.id, limit: HISTORY_LIMIT }),
    ]);

    await this.conversationSave.exec({
      userId: user.id,
      role: 'user',
      content: incoming.join('\n'),
    });

    const context = {
      today: isoToday(user.timezone),
      now: new Date(),
      timezone: user.timezone,
      paymentMethods: paymentMethods.map((method) => ({
        description: method.description,
        kind: method.kind,
      })),
      tags: tags.map((tag) => tag.description),
      history,
      incoming,
    };

    let reply = FALLBACK_REPLY;
    try {
      let plan = await this.planRequest.exec({
        messages: buildPrompt(context),
      });
      let knownIds = new Set<string>();

      // Uma rodada de leitura, e só uma: o agente pergunta, respondemos, ele
      // decide. Sem teto isso vira laço.
      if (plan.queries.length > 0) {
        const results = await this.actionRunner.exec({
          userId: user.id,
          items: plan.queries,
          expect: 'query',
          knownIds,
        });
        knownIds = collectIds(results);
        plan = await this.planRequest.exec({
          messages: buildPrompt({ ...context, queryResults: results }),
        });
      }

      if (plan.actions.length > 0) {
        const results = await this.actionRunner.exec({
          userId: user.id,
          items: plan.actions,
          expect: 'command',
          knownIds,
        });
        // Erro de domínio volta ao agente para virar frase: "Não achei a forma
        // de pagamento" não diz ao usuário o que fazer a seguir.
        reply = results.some((result) => !result.ok)
          ? (
              await this.planRequest.exec({
                messages: buildPrompt({ ...context, actionResults: results }),
              })
            ).reply
          : plan.reply;
      } else {
        reply = plan.reply;
      }
    } catch (error) {
      // Plano malformado ou ação fora do catálogo: nada foi executado pela
      // metade. O resto sobe e o BullMQ tenta de novo.
      if (!(error instanceof DomainError)) throw error;
      this.logger.warn(`Plano recusado: ${error.message}`);
    }

    const now = new Date();
    for (const message of pending) {
      message.processedAt = now;
      message.replyText = reply;
    }
    await this.rawMessages.save(pending);

    await this.conversationSave.exec({
      userId: user.id,
      role: 'assistant',
      content: reply,
    });
    await this.send.exec({ to: phone, text: reply });
  }
}
