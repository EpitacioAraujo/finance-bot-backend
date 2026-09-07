import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ulid } from 'ulid';
import {
  ConversationMessageEntity,
  MessageRole,
} from '@/modules/ai/entities/conversation-message.entity';

@Injectable()
export class ConversationSaveService {
  constructor(
    @InjectRepository(ConversationMessageEntity)
    private readonly repo: Repository<ConversationMessageEntity>,
  ) {}

  async exec({
    userId,
    role,
    content,
  }: {
    userId: string;
    role: MessageRole;
    content: string;
  }): Promise<void> {
    await this.repo.save(
      this.repo.create({ id: ulid(), userId, role, content }),
    );
  }
}
