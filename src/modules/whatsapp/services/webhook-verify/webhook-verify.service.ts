import { Injectable } from '@nestjs/common';
import { env } from '@/config/env';
import { ValidationError } from '@/shared/errors';

@Injectable()
export class WebhookVerifyService {
  exec({
    mode,
    token,
    challenge,
  }: {
    mode?: string;
    token?: string;
    challenge?: string;
  }): string {
    if (mode !== 'subscribe' || token !== env.whatsapp.verifyToken) {
      throw new ValidationError('Verificação do webhook recusada');
    }
    return challenge ?? '';
  }
}
