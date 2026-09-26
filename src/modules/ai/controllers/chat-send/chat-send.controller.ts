import {
  Controller,
  Post,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { CurrentUserEntity, CurrentUserGuard } from '@/shared/current-user';
import { UserEntity } from '@/modules/finance/entities/user.entity';
import {
  ChatSendOutput,
  ChatSendUseCase,
} from '@/modules/ai/use-cases/chat-send/chat-send.use-case';
import { ValidationError } from '@/shared/errors';

/** Um minuto de opus dá ~150KB; o mp4 que o iPhone grava é bem mais pesado. */
const MAX_BYTES = 10 * 1024 * 1024;

@Controller('chat')
@UseGuards(CurrentUserGuard)
export class ChatSendController {
  constructor(private readonly useCase: ChatSendUseCase) {}

  @Post()
  @UseInterceptors(FileInterceptor('audio', { limits: { fileSize: MAX_BYTES } }))
  async exec(
    @CurrentUserEntity() user: UserEntity,
    @UploadedFile() file?: Express.Multer.File,
  ): Promise<ChatSendOutput> {
    if (!file) throw new ValidationError('Nenhum áudio recebido');
    // O navegador manda webm/opus; o Safari manda mp4. Qualquer outra coisa
    // não veio do gravador e não tem por que chegar aqui.
    if (!file.mimetype.startsWith('audio/')) {
      throw new ValidationError(`Formato não suportado: ${file.mimetype}`);
    }

    return this.useCase.exec({ user, audio: file.buffer });
  }
}
