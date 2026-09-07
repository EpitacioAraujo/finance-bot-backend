import { Column, Entity, Index } from 'typeorm';
import { BaseEntity } from '@/shared/entities/base.entity';

export type MessageRole = 'user' | 'assistant';

/**
 * O chat, as duas pontas. Guarda **só texto trocado com o usuário** — resultado
 * de query nunca entra aqui, ele vive dentro da rodada em que foi pedido.
 */
@Entity('conversation_messages')
@Index(['userId', 'createdAt'])
export class ConversationMessageEntity extends BaseEntity {
  @Column('varchar', { length: 26 })
  userId!: string;

  @Column('varchar', { length: 10 })
  role!: MessageRole;

  @Column('text')
  content!: string;
}
