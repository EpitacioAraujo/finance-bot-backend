import { Injectable, Logger } from '@nestjs/common';
import { UserEntity } from '@/modules/finance/entities/user.entity';
import { TranscribeService } from '@/modules/whatsapp/services/transcribe/transcribe.service';
import { SpeakService } from '@/modules/ai/services/speak/speak.service';
import { AgentReplyUseCase } from '@/modules/ai/use-cases/agent-reply/agent-reply.use-case';
import { ValidationError } from '@/shared/errors';

export interface ChatSendOutput {
  /** O que foi entendido do áudio — a tela mostra para o usuário conferir. */
  transcript: string;
  reply: string;
  /** mp3 em base64; vazio se a voz falhou. Evita uma segunda rota e storage. */
  audio: string;
}

/**
 * A ponta web do agente: áudio entra, áudio sai. Sem fila e sem debounce — na
 * web se fala uma vez e se espera a resposta, então a requisição segura até o
 * fim.
 */
@Injectable()
export class ChatSendUseCase {
  private readonly logger = new Logger(ChatSendUseCase.name);

  constructor(
    private readonly transcribe: TranscribeService,
    private readonly agentReply: AgentReplyUseCase,
    private readonly speak: SpeakService,
  ) {}

  async exec({
    user,
    audio,
  }: {
    user: UserEntity;
    audio: Buffer;
  }): Promise<ChatSendOutput> {
    // O Buffer do multer é uma fatia de um pool compartilhado do Node; a cópia
    // é o que garante que só os bytes deste áudio sobem.
    const transcript = await this.transcribe.exec({
      audio: new Uint8Array(audio).buffer,
    });
    if (!transcript.trim()) {
      throw new ValidationError('Não consegui ouvir. Fala de novo?');
    }

    const { reply } = await this.agentReply.exec({
      user,
      incoming: [transcript],
    });

    // A partir daqui o agente já gravou. Deixar a voz estourar viraria 500, o
    // usuário repetiria a fala e a escrita aconteceria duas vezes — e a rota
    // não tem chave de idempotência. Sem voz, o texto ainda responde.
    let spoken = '';
    try {
      spoken = (await this.speak.exec({ text: reply })).toString('base64');
    } catch (error) {
      this.logger.error(
        `Voz falhou, respondendo só em texto: ${(error as Error).message}`,
        (error as Error).stack,
      );
    }

    return { transcript, reply, audio: spoken };
  }
}
