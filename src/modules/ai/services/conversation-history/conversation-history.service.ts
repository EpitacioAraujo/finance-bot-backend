import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import {
  ConversationMessageEntity,
  MessageRole,
} from '@/modules/ai/entities/conversation-message.entity';

@Injectable()
export class ConversationHistoryService {
  constructor(
    @InjectRepository(ConversationMessageEntity)
    private readonly repo: Repository<ConversationMessageEntity>,
  ) {}

  async exec({
    userId,
    limit,
  }: {
    userId: string;
    limit: number;
  }): Promise<{ role: MessageRole; content: string; createdAt: Date }[]> {
    const rows = await this.repo.find({
      where: { userId },
      order: { createdAt: 'DESC' },
      take: limit,
    });

    return rows
      .reverse()
      .map((row) => ({
        role: row.role,
        content: row.content,
        createdAt: row.createdAt,
      }));
  }
}
