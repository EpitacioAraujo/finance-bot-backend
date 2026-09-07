import { OnWorkerEvent, Processor, WorkerHost } from '@nestjs/bullmq';
import { Job } from 'bullmq';
import { Logger } from '@nestjs/common';
import { InboundResolveUseCase } from '@/modules/whatsapp/use-cases/inbound-resolve/inbound-resolve.use-case';
import { InboundJob, QUEUE_INBOUND } from '@/shared/queues';

/** Casca do BullMQ. `process` é contrato de framework; a regra fica no use case. */
@Processor(QUEUE_INBOUND)
export class InboundWorker extends WorkerHost {
  private readonly logger = new Logger(InboundWorker.name);

  constructor(private readonly useCase: InboundResolveUseCase) {
    super();
  }

  async process(job: Job<InboundJob>): Promise<void> {
    await this.useCase.exec({ rawMessageId: job.data.rawMessageId });
  }

  // Sem isto o job falho some no Redis e o log fica limpo enquanto nada funciona.
  @OnWorkerEvent('failed')
  onFailed(job: Job<InboundJob>, error: Error): void {
    this.logger.error(
      `Job ${job.id} falhou (tentativa ${job.attemptsMade}): ${error.message}`,
      error.stack,
    );
  }
}
