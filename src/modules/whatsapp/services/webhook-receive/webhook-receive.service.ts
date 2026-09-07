import { Injectable, Logger } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bullmq';
import { InjectRepository } from '@nestjs/typeorm';
import { Queue } from 'bullmq';
import { Repository } from 'typeorm';
import { ulid } from 'ulid';
import {
  RawMessageEntity,
  RawMessageType,
} from '@/modules/whatsapp/entities/raw-message.entity';
import { UserResolveService } from '@/modules/finance/services/user-resolve/user-resolve.service';
import { InboundJob, QUEUE_INBOUND } from '@/shared/queues';

interface WebhookMessage {
  id: string;
  from: string;
  type: string;
  text?: { body?: string };
}

const typeOf = (raw: string): RawMessageType =>
  raw === 'text' || raw === 'audio' || raw === 'image' ? raw : 'other';

/**
 * Grava, enfileira e devolve. Nenhum I/O lento aqui: o Meta reenvia a
 * notificação se a resposta passar de poucos segundos.
 */
@Injectable()
export class WebhookReceiveService {
  private readonly logger = new Logger(WebhookReceiveService.name);

  constructor(
    @InjectRepository(RawMessageEntity)
    private readonly repo: Repository<RawMessageEntity>,
    @InjectQueue(QUEUE_INBOUND) private readonly queue: Queue<InboundJob>,
    private readonly userResolve: UserResolveService,
  ) {}

  async exec({ payload }: { payload: unknown }): Promise<void> {
    const body = payload as {
      entry?: { changes?: { value?: { messages?: WebhookMessage[] } }[] }[];
    };
    const messages =
      body.entry?.flatMap(
        (entry) =>
          entry.changes?.flatMap((change) => change.value?.messages ?? []) ?? [],
      ) ?? [];

    for (const message of messages) {
      // waMessageId é unique: a reentrega do Meta cai aqui e para.
      const seen = await this.repo.findOne({
        where: { waMessageId: message.id },
      });
      if (seen) {
        this.logger.log(`Mensagem ${message.id} já recebida, ignorando`);
        continue;
      }

      const user = await this.userResolve.exec({ phone: message.from });
      const saved = await this.repo.save(
        this.repo.create({
          id: ulid(),
          userId: user?.id ?? null,
          waMessageId: message.id,
          from: message.from,
          type: typeOf(message.type),
          payload: message as unknown as Record<string, unknown>,
          resolvedText: message.text?.body ?? null,
          processedAt: null,
          replyText: null,
          error: null,
        }),
      );

      await this.queue.add(QUEUE_INBOUND, { rawMessageId: saved.id });
    }
  }
}
