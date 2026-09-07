import { OnWorkerEvent, Processor, WorkerHost } from '@nestjs/bullmq';
import { Job } from 'bullmq';
import { Logger } from '@nestjs/common';
import { InterpretUseCase } from '@/modules/ai/use-cases/interpret/interpret.use-case';
import { InterpretJob, QUEUE_INTERPRET } from '@/shared/queues';

/** Casca do BullMQ. `process` é contrato de framework; a regra fica no use case. */
@Processor(QUEUE_INTERPRET)
export class InterpretWorker extends WorkerHost {
  private readonly logger = new Logger(InterpretWorker.name);

  constructor(private readonly useCase: InterpretUseCase) {
    super();
  }

  async process(job: Job<InterpretJob>): Promise<void> {
    await this.useCase.exec({ phone: job.data.phone });
  }

  // Sem isto o job falho some no Redis e o log fica limpo enquanto nada funciona.
  @OnWorkerEvent('failed')
  onFailed(job: Job<InterpretJob>, error: Error): void {
    this.logger.error(
      `Job ${job.id} falhou (tentativa ${job.attemptsMade}): ${error.message}`,
      error.stack,
    );
  }
}
