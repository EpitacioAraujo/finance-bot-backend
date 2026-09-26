import { Injectable, Logger } from '@nestjs/common';
import { UserEntity } from '@/modules/finance/entities/user.entity';
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
import { DomainError } from '@/shared/errors';
import { isoToday } from '@/shared/date';

const HISTORY_LIMIT = 60;
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

/**
 * O agente sem canal: recebe o que o usuário disse, já em texto, executa o que
 * o plano mandar e devolve a frase de resposta. Quem chama é que sabe se isso
 * veio do WhatsApp ou do site — aqui não tem telefone nem requisição.
 *
 * O histórico é o mesmo nos dois canais, então dá para começar num e continuar
 * no outro.
 */
@Injectable()
export class AgentReplyUseCase {
  private readonly logger = new Logger(AgentReplyUseCase.name);

  constructor(
    private readonly paymentMethodList: PaymentMethodListService,
    private readonly tagList: TagListService,
    private readonly history: ConversationHistoryService,
    private readonly conversationSave: ConversationSaveService,
    private readonly planRequest: PlanRequestService,
    private readonly actionRunner: ActionRunnerService,
  ) {}

  async exec({
    user,
    incoming,
  }: {
    user: UserEntity;
    incoming: string[];
  }): Promise<{ reply: string }> {
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

      // O plano só garante que `reply` é string. Vazia, viraria mensagem em
      // branco no WhatsApp e 400 na síntese de voz.
      if (!reply.trim()) reply = FALLBACK_REPLY;
    } catch (error) {
      // Plano malformado ou ação fora do catálogo: nada foi executado pela
      // metade. O resto sobe e quem chamou decide se tenta de novo.
      if (!(error instanceof DomainError)) throw error;
      this.logger.warn(`Plano recusado: ${error.message}`);
    }

    await this.conversationSave.exec({
      userId: user.id,
      role: 'assistant',
      content: reply,
    });

    return { reply };
  }
}
