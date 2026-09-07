import { Injectable } from '@nestjs/common';
import { env } from '@/config/env';

const BASE = 'https://api.assemblyai.com/v2';
const POLL_INTERVAL_MS = 1500;
const POLL_LIMIT = 60;

interface Transcript {
  status: 'queued' | 'processing' | 'completed' | 'error';
  text?: string;
  error?: string;
}

const sleep = (ms: number): Promise<void> =>
  new Promise((resolve) => setTimeout(resolve, ms));

@Injectable()
export class TranscribeService {
  async exec({ audio }: { audio: ArrayBuffer }): Promise<string> {
    const headers = { authorization: env.assemblyAi.apiKey };

    const upload = await fetch(`${BASE}/upload`, {
      method: 'POST',
      headers: { ...headers, 'Content-Type': 'application/octet-stream' },
      body: audio,
    });
    if (!upload.ok) throw new Error(`AssemblyAI ${upload.status} no upload`);
    const { upload_url: uploadUrl } = (await upload.json()) as {
      upload_url: string;
    };

    const created = await fetch(`${BASE}/transcript`, {
      method: 'POST',
      headers: { ...headers, 'Content-Type': 'application/json' },
      body: JSON.stringify({ audio_url: uploadUrl, language_code: 'pt' }),
    });
    if (!created.ok) {
      throw new Error(`AssemblyAI ${created.status} ao pedir a transcrição`);
    }
    const { id } = (await created.json()) as { id: string };

    for (let attempt = 0; attempt < POLL_LIMIT; attempt++) {
      const poll = await fetch(`${BASE}/transcript/${id}`, { headers });
      if (!poll.ok) throw new Error(`AssemblyAI ${poll.status} no polling`);
      const result = (await poll.json()) as Transcript;

      if (result.status === 'completed') return result.text?.trim() ?? '';
      if (result.status === 'error') {
        throw new Error(`AssemblyAI falhou: ${result.error ?? 'sem detalhe'}`);
      }
      await sleep(POLL_INTERVAL_MS);
    }

    throw new Error('AssemblyAI não respondeu no tempo esperado');
  }
}
