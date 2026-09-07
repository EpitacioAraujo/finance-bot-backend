import { Column, Entity } from 'typeorm';
import { BaseEntity } from '@/shared/entities/base.entity';

export type RawMessageType = 'text' | 'audio' | 'image' | 'other';

/**
 * Log cru do webhook e ponto de idempotência. Não é fonte de contexto.
 *
 * Duas guardas: `waMessageId` unique cobre a reentrega do Meta; `processedAt`
 * cobre o retry do worker.
 */
@Entity('raw_messages')
export class RawMessageEntity extends BaseEntity {
  /** Nulo se o telefone não é de um usuário conhecido. */
  @Column('varchar', { length: 26, nullable: true })
  userId!: string | null;

  @Column('varchar', { length: 80, unique: true })
  waMessageId!: string;

  @Column('varchar', { length: 20 })
  from!: string;

  @Column('varchar', { length: 10 })
  type!: RawMessageType;

  @Column('jsonb')
  payload!: Record<string, unknown>;

  /** O texto puro ou a transcrição. */
  @Column('text', { nullable: true })
  resolvedText!: string | null;

  /** Gravado na mesma transação de banco das escritas do plano. */
  @Column('timestamptz', { nullable: true })
  processedAt!: Date | null;

  /** Resposta já gerada. No reprocessamento, reenvia esta. */
  @Column('text', { nullable: true })
  replyText!: string | null;

  @Column('text', { nullable: true })
  error!: string | null;
}
