import { Inject, Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import Redis from 'ioredis';
import { In, Repository } from 'typeorm';
import { RawMessageEntity } from '@/modules/whatsapp/entities/raw-message.entity';
import { WhatsappSendService } from '@/modules/whatsapp/services/whatsapp-send/whatsapp-send.service';
import { UserResolveService } from '@/modules/finance/services/user-resolve/user-resolve.service';
import { AgentReplyUseCase } from '@/modules/ai/use-cases/agent-reply/agent-reply.use-case';
import { REDIS } from '@/config/redis.module';

/**
 * A ponta WhatsApp do agente: desempilha o debounce, garante que a mesma
 * mensagem não vira duas escritas e devolve a resposta pelo canal. Quem pensa
 * é o `AgentReplyUseCase`.
 */
@Injectable()
export class InterpretUseCase {
  private readonly logger = new Logger(InterpretUseCase.name);

  constructor(
    @InjectRepository(RawMessageEntity)
    private readonly rawMessages: Repository<RawMessageEntity>,
    @Inject(REDIS) private readonly redis: Redis,
    private readonly userResolve: UserResolveService,
    private readonly agentReply: AgentReplyUseCase,
    private readonly send: WhatsappSendService,
  ) {}

  async exec({ phone }: { phone: string }): Promise<void> {
    const key = `pending:${phone}`;
    const ids = await this.redis.lrange(key, 0, -1);
    if (ids.length === 0) return;

    // `ltrim` só do que foi lido, e só depois de a resposta sair: apagar antes
    // fazia a tentativa seguinte do BullMQ achar a fila vazia e desistir em
    // silêncio, inclusive quando o que falhou foi o envio. Mensagem que chegar
    // durante a rodada fica para a próxima.
    const consume = (): Promise<unknown> =>
      this.redis.ltrim(key, ids.length, -1);

    // Ordenado: o reenvio pega a última resposta, e `find` sem `order` devolve
    // o que o plano do Postgres quiser.
    const messages = await this.rawMessages.find({
      where: { id: In(ids) },
      order: { createdAt: 'ASC' },
    });
    const pending = messages.filter((message) => !message.processedAt);

    // Job reprocessado depois de já ter gravado: reenvia o que ficou guardado
    // em vez de chamar o LLM e criar tudo de novo.
    if (pending.length === 0) {
      const previous = messages.at(-1)?.replyText;
      if (previous) await this.send.exec({ to: phone, text: previous });
      await consume();
      return;
    }

    const user = await this.userResolve.exec({ phone });
    if (!user) {
      await consume();
      this.logger.warn(`Telefone ${phone} não pertence a nenhum usuário`);
      return;
    }

    const { reply } = await this.agentReply.exec({
      user,
      incoming: pending
        .map((message) => message.resolvedText ?? '')
        .filter(Boolean),
    });

    const now = new Date();
    for (const message of pending) {
      message.processedAt = now;
      message.replyText = reply;
    }
    await this.rawMessages.save(pending);

    await this.send.exec({ to: phone, text: reply });
    await consume();
  }
}
