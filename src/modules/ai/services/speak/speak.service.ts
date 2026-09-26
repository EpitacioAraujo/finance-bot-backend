import { Injectable } from '@nestjs/common';
import { env } from '@/config/env';

/** Teto do `tts-1`. A resposta do agente é curta; isto é só para não estourar. */
const MAX_CHARS = 4096;

/** Texto → mp3. Trocar de provedor é reescrever este arquivo. */
@Injectable()
export class SpeakService {
  async exec({ text }: { text: string }): Promise<Buffer> {
    // Erro de configuração, não do cliente: sobe como falha mesmo, para o
    // log registrar e não virar 400 de quem só apertou o microfone.
    if (!env.openAi.apiKey) {
      throw new Error('Voz não configurada: falta OPENAI_API_KEY');
    }

    const response = await fetch('https://api.openai.com/v1/audio/speech', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${env.openAi.apiKey}`,
      },
      body: JSON.stringify({
        model: env.openAi.ttsModel,
        voice: env.openAi.ttsVoice,
        input: text.slice(0, MAX_CHARS),
        speed: env.openAi.ttsSpeed,
        // Só o gpt-4o-mini-tts lê isto; a família tts-1 recusa o campo.
        ...(env.openAi.ttsInstructions
          ? { instructions: env.openAi.ttsInstructions }
          : {}),
        response_format: 'mp3',
      }),
    });

    if (!response.ok) {
      throw new Error(
        `OpenAI respondeu ${response.status}: ${await response.text()}`,
      );
    }

    return Buffer.from(await response.arrayBuffer());
  }
}
