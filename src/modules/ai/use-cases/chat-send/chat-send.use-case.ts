import { Injectable } from '@nestjs/common';
import { UserResolveService } from '@/modules/finance/services/user-resolve/user-resolve.service';
import { TranscribeService } from '@/modules/whatsapp/services/transcribe/transcribe.service';
import { SpeakService } from '@/modules/ai/services/speak/speak.service';
import { AgentReplyUseCase } from '@/modules/ai/use-cases/agent-reply/agent-reply.use-case';
import { NotFoundError, ValidationError } from '@/shared/errors';

export interface ChatSendOutput {
  /** O que foi entendido do áudio — a tela mostra para o usuário conferir. */
  transcript: string;
  reply: string;
  /** mp3 em base64. Evita uma segunda rota e um lugar para guardar arquivo. */
  audio: string;
}

/**
 * A ponta web do agente: áudio entra, áudio sai. Sem fila e sem debounce — na
 * web se fala uma vez e se espera a resposta, então a requisição segura até o
 * fim.
 */
@Injectable()
export class ChatSendUseCase {
  constructor(
    private readonly userResolve: UserResolveService,
    private readonly transcribe: TranscribeService,
    private readonly agentReply: AgentReplyUseCase,
    private readonly speak: SpeakService,
  ) {}

  async exec({
    userId,
    audio,
  }: {
    userId: string;
    audio: Buffer;
  }): Promise<ChatSendOutput> {
    const user = await this.userResolve.exec({ id: userId });
    if (!user) throw new NotFoundError('Usuário não encontrado');

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

    return {
      transcript,
      reply,
      audio: (await this.speak.exec({ text: reply })).toString('base64'),
    };
  }
}
