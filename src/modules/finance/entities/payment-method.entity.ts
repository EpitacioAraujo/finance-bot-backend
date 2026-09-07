import { Column, Entity, Index, JoinColumn, ManyToOne } from 'typeorm';
import { BaseEntity } from '@/shared/entities/base.entity';
import { UserEntity } from './user.entity';

export type PaymentMethodKind =
  | 'cash'
  | 'debit'
  | 'credit'
  | 'pix'
  | 'transfer';

export const PAYMENT_METHOD_KINDS: readonly PaymentMethodKind[] = [
  'cash',
  'debit',
  'credit',
  'pix',
  'transfer',
];

@Entity('payment_methods')
@Index(['userId', 'description'], { unique: true })
export class PaymentMethodEntity extends BaseEntity {
  @Column('varchar', { length: 26 })
  userId!: string;

  @ManyToOne(() => UserEntity)
  @JoinColumn({ name: 'user_id' })
  user?: UserEntity;

  @Column('text')
  description!: string;

  /** É aqui que "no crédito" vive — não na transação. */
  @Column('varchar', { length: 10 })
  kind!: PaymentMethodKind;

  /** Só `credit`. Dia de fechamento da fatura. */
  @Column('smallint', { nullable: true })
  closingDay!: number | null;

  /** Só `credit`. Dia de vencimento da fatura. */
  @Column('smallint', { nullable: true })
  dueDay!: number | null;

  @Column('boolean', { default: false })
  showInBills!: boolean;

  @Column('boolean', { default: true })
  active!: boolean;
}
