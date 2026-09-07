import { Column, Entity, JoinColumn, ManyToOne } from 'typeorm';
import { BaseEntity } from '@/shared/entities/base.entity';
import { decimalTransformer } from '@/shared/decimal.transformer';
import { UserEntity } from './user.entity';
import { PaymentMethodEntity } from './payment-method.entity';
import { TagEntity } from './tag.entity';

export type BillFrequency = 'none' | 'monthly' | 'yearly';

export const BILL_FREQUENCIES: readonly BillFrequency[] = [
  'none',
  'monthly',
  'yearly',
];

/**
 * Conta a pagar — previsão, não fato consumado. Não tem flag de pago: está paga
 * porque existe transaction com este billId na janela. E a ocorrência recorrente
 * não vira linha: é expandida na leitura a partir de frequency + dueDay.
 */
@Entity('bills')
export class BillEntity extends BaseEntity {
  @Column('varchar', { length: 26 })
  userId!: string;

  @ManyToOne(() => UserEntity)
  @JoinColumn({ name: 'user_id' })
  user?: UserEntity;

  @Column('text')
  description!: string;

  @Column('decimal', {
    precision: 15,
    scale: 2,
    transformer: decimalTransformer,
  })
  predictedAmount!: number;

  /** Preenchido só quando frequency = none. */
  @Column('date', { nullable: true })
  dueDate!: string | null;

  /** Preenchido em todas as outras frequency. */
  @Column('smallint', { nullable: true })
  dueDay!: number | null;

  @Column('varchar', { length: 10 })
  frequency!: BillFrequency;

  @Column('varchar', { length: 26 })
  paymentMethodId!: string;

  @ManyToOne(() => PaymentMethodEntity)
  @JoinColumn({ name: 'payment_method_id' })
  paymentMethod?: PaymentMethodEntity;

  @Column('varchar', { length: 26, nullable: true })
  tagId!: string | null;

  @ManyToOne(() => TagEntity, { nullable: true })
  @JoinColumn({ name: 'tag_id' })
  tag?: TagEntity | null;

  @Column('boolean', { default: true })
  active!: boolean;

  @Column('text', { nullable: true })
  notes!: string | null;
}
