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
  }
}
