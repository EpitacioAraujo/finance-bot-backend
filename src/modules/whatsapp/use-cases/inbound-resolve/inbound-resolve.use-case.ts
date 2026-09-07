import { Inject, Injectable, Logger } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bullmq';
import { InjectRepository } from '@nestjs/typeorm';
import { Queue } from 'bullmq';
import Redis from 'ioredis';
import { Repository } from 'typeorm';
import { RawMessageEntity } from '@/modules/whatsapp/entities/raw-message.entity';
import { WhatsappMediaService } from '@/modules/whatsapp/services/whatsapp-media/whatsapp-media.service';
import { TranscribeService } from '@/modules/whatsapp/services/transcribe/transcribe.service';
import { WhatsappSendService } from '@/modules/whatsapp/services/whatsapp-send/whatsapp-send.service';
import { REDIS } from '@/config/redis.module';
import { env } from '@/config/env';
import { InterpretJob, QUEUE_INTERPRET } from '@/shared/queues';

export const pendingKey = (phone: string): string => `pending:${phone}`;

/**
 * Resolve a mensagem em texto e agenda a interpretação. O job atrasado com
 * jobId por telefone é o debounce: mensagem nova reinicia a contagem, e as
 * frases soltas do usuário chegam juntas ao agente.
 */
@Injectable()
export class InboundResolveUseCase {
  private readonly logger = new Logger(InboundResolveUseCase.name);

  constructor(
    @InjectRepository(RawMessageEntity)
    private readonly repo: Repository<RawMessageEntity>,
    @InjectQueue(QUEUE_INTERPRET) private readonly queue: Queue<InterpretJob>,
    @Inject(REDIS) private readonly redis: Redis,
    private readonly media: WhatsappMediaService,
    private readonly transcribe: TranscribeService,
    private readonly send: WhatsappSendService,
  ) {}

  async exec({ rawMessageId }: { rawMessageId: string }): Promise<void> {
    const message = await this.repo.findOne({ where: { id: rawMessageId } });
    if (!message || message.processedAt) return;

    if (message.type === 'audio') {
      const mediaId = (message.payload.audio as { id?: string } | undefined)?.id;
      if (!mediaId) {
        await this.fail(message, 'Áudio sem id de mídia');
        return;
      }
      const { audio } = await this.media.exec({ mediaId });
      message.resolvedText = await this.transcribe.exec({ audio });
    }

    if (!message.resolvedText?.trim()) {
      await this.fail(message, 'Não consegui ouvir. Manda de novo?');
      return;
    }

    await this.repo.save(message);

    await this.redis.rpush(pendingKey(message.from), message.id);

    // Remover e reagendar reinicia o delay. Um job já em execução não sai —
    // daí o catch: nesse caso a mensagem entra na rodada seguinte.
    // Sem dois-pontos: o BullMQ recusa o caractere em jobId customizado.
    const jobId = `interpret-${message.from}`;
    await this.queue.remove(jobId).catch(() => undefined);
    await this.queue.add(
      QUEUE_INTERPRET,
      { phone: message.from },
      {
        jobId,
        delay: env.interpret.debounceMs,
        attempts: 3,
        backoff: { type: 'exponential', delay: 5000 },
        removeOnComplete: true,
        removeOnFail: 50,
      },
    );
  }

  private async fail(
    message: RawMessageEntity,
    reply: string,
  ): Promise<void> {
    this.logger.warn(`${message.id}: ${reply}`);
    message.error = reply;
    message.processedAt = new Date();
    message.replyText = reply;
    await this.repo.save(message);
    await this.send.exec({ to: message.from, text: reply });
  }
}
