import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { BullModule } from '@nestjs/bullmq';

import { ConversationMessageEntity } from './entities/conversation-message.entity';
import { RawMessageEntity } from '@/modules/whatsapp/entities/raw-message.entity';
import { UserEntity } from '@/modules/finance/entities/user.entity';
import { FinanceModule } from '@/modules/finance/finance.module';
import { WhatsappModule } from '@/modules/whatsapp/whatsapp.module';
import { QUEUE_INTERPRET } from '@/shared/queues';

import { ConversationHistoryService } from './services/conversation-history/conversation-history.service';
import { ConversationSaveService } from './services/conversation-save/conversation-save.service';
import { PlanRequestService } from './services/plan-request/plan-request.service';
import { ActionRunnerService } from './services/action-runner/action-runner.service';
import { SpeakService } from './services/speak/speak.service';
import { AgentReplyUseCase } from './use-cases/agent-reply/agent-reply.use-case';
import { InterpretUseCase } from './use-cases/interpret/interpret.use-case';
import { ChatSendUseCase } from './use-cases/chat-send/chat-send.use-case';
import { InterpretWorker } from './queues/interpret.worker';
import { ChatSendController } from './controllers/chat-send/chat-send.controller';

/** Importa whatsapp e finance. Nenhum dos dois importa de volta. */
@Module({
  imports: [
    // UserEntity é do CurrentUserGuard, que agora roda numa rota daqui.
    TypeOrmModule.forFeature([
      ConversationMessageEntity,
      RawMessageEntity,
      UserEntity,
    ]),
    BullModule.registerQueue({ name: QUEUE_INTERPRET }),
    FinanceModule,
    WhatsappModule,
  ],
  controllers: [ChatSendController],
  providers: [
    ConversationHistoryService,
    ConversationSaveService,
    PlanRequestService,
    ActionRunnerService,
    SpeakService,
    AgentReplyUseCase,
    InterpretUseCase,
    ChatSendUseCase,
    InterpretWorker,
  ],
})
export class AiModule {}
