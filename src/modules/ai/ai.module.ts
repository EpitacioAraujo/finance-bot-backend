import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { BullModule } from '@nestjs/bullmq';

import { ConversationMessageEntity } from './entities/conversation-message.entity';
import { RawMessageEntity } from '@/modules/whatsapp/entities/raw-message.entity';
import { FinanceModule } from '@/modules/finance/finance.module';
import { WhatsappModule } from '@/modules/whatsapp/whatsapp.module';
import { QUEUE_INTERPRET } from '@/shared/queues';

import { ConversationHistoryService } from './services/conversation-history/conversation-history.service';
import { ConversationSaveService } from './services/conversation-save/conversation-save.service';
import { PlanRequestService } from './services/plan-request/plan-request.service';
import { ActionRunnerService } from './services/action-runner/action-runner.service';
import { InterpretUseCase } from './use-cases/interpret/interpret.use-case';
import { InterpretWorker } from './queues/interpret.worker';

/** Importa whatsapp e finance. Nenhum dos dois importa de volta. */
@Module({
  imports: [
    TypeOrmModule.forFeature([ConversationMessageEntity, RawMessageEntity]),
    BullModule.registerQueue({ name: QUEUE_INTERPRET }),
    FinanceModule,
    WhatsappModule,
  ],
  providers: [
    ConversationHistoryService,
    ConversationSaveService,
    PlanRequestService,
    ActionRunnerService,
    InterpretUseCase,
    InterpretWorker,
  ],
})
export class AiModule {}
