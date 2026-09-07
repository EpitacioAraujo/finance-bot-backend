import { Injectable } from '@nestjs/common';
import { env } from '@/config/env';

@Injectable()
export class WhatsappMediaService {
  async exec({
    mediaId,
  }: {
    mediaId: string;
  }): Promise<{ audio: ArrayBuffer; mimeType: string }> {
    const headers = { Authorization: `Bearer ${env.whatsapp.accessToken}` };

    const meta = await fetch(
      `https://graph.facebook.com/${env.whatsapp.apiVersion}/${mediaId}`,
      { headers },
    );
    if (!meta.ok) {
      throw new Error(`Meta ${meta.status} ao buscar a url da mídia`);
    }
    const { url, mime_type: mimeType } = (await meta.json()) as {
      url: string;
      mime_type: string;
    };

    const file = await fetch(url, { headers });
    if (!file.ok) throw new Error(`Meta ${file.status} ao baixar a mídia`);

    return { audio: await file.arrayBuffer(), mimeType };
  }
}
