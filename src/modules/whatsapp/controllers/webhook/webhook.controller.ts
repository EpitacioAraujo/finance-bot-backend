import { Body, Controller, Get, HttpCode, Post, Query } from '@nestjs/common';
import { WebhookVerifyService } from '@/modules/whatsapp/services/webhook-verify/webhook-verify.service';
import { WebhookReceiveService } from '@/modules/whatsapp/services/webhook-receive/webhook-receive.service';

@Controller('whatsapp/webhook')
export class WebhookVerifyController {
  constructor(private readonly service: WebhookVerifyService) {}

  @Get()
  exec(
    @Query('hub.mode') mode?: string,
    @Query('hub.verify_token') token?: string,
    @Query('hub.challenge') challenge?: string,
  ): string {
    return this.service.exec({ mode, token, challenge });
  }
}

@Controller('whatsapp/webhook')
export class WebhookReceiveController {
  constructor(private readonly service: WebhookReceiveService) {}

  @Post()
  @HttpCode(200)
  async exec(@Body() payload: unknown): Promise<{ received: true }> {
    await this.service.exec({ payload });
    return { received: true };
  }
}
