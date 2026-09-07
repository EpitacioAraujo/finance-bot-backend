import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { BullModule } from '@nestjs/bullmq';

import { RawMessageEntity } from './entities/raw-message.entity';
import { FinanceModule } from '@/modules/finance/finance.module';
import { QUEUE_INBOUND, QUEUE_INTERPRET } from '@/shared/queues';

import { WebhookVerifyService } from './services/webhook-verify/webhook-verify.service';
import { WebhookReceiveService } from './services/webhook-receive/webhook-receive.service';
import { WhatsappMediaService } from './services/whatsapp-media/whatsapp-media.service';
import { TranscribeService } from './services/transcribe/transcribe.service';
import { WhatsappSendService } from './services/whatsapp-send/whatsapp-send.service';
import { InboundResolveUseCase } from './use-cases/inbound-resolve/inbound-resolve.use-case';
import { InboundWorker } from './queues/inbound.worker';
import {
  WebhookReceiveController,
  WebhookVerifyController,
} from './controllers/webhook/webhook.controller';

/** Adapter do canal. Não conhece o módulo ai — a fila é a costura. */
@Module({
  imports: [
    TypeOrmModule.forFeature([RawMessageEntity]),
    BullModule.registerQueue(
      { name: QUEUE_INBOUND },
      { name: QUEUE_INTERPRET },
    ),
    FinanceModule,
  ],
  controllers: [WebhookVerifyController, WebhookReceiveController],
  providers: [
    WebhookVerifyService,
    WebhookReceiveService,
    WhatsappMediaService,
    TranscribeService,
    WhatsappSendService,
    InboundResolveUseCase,
    InboundWorker,
  ],
  exports: [WhatsappSendService],
})
export class WhatsappModule {}
