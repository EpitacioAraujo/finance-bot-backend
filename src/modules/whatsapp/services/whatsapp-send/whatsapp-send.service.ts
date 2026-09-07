import { Injectable } from '@nestjs/common';
import { env } from '@/config/env';

@Injectable()
export class WhatsappSendService {
  async exec({ to, text }: { to: string; text: string }): Promise<void> {
    const response = await fetch(
      `https://graph.facebook.com/${env.whatsapp.apiVersion}/${env.whatsapp.phoneNumberId}/messages`,
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${env.whatsapp.accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          messaging_product: 'whatsapp',
          to,
          type: 'text',
          text: { body: text },
        }),
      },
    );

    if (!response.ok) {
      throw new Error(
        `Meta ${response.status} ao enviar: ${await response.text()}`,
      );
    }
  }
}
