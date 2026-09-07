import { Column, Entity, Index, JoinColumn, ManyToOne } from 'typeorm';
import { BaseEntity } from '@/shared/entities/base.entity';
import { PaymentMethodEntity } from './payment-method.entity';

/** A fatura do cartão. Existe só para payment_method com kind = credit. */
@Entity('payment_method_cycles')
@Index(['paymentMethodId', 'referenceMonth'], { unique: true })
export class PaymentMethodCycleEntity extends BaseEntity {
  @Column('varchar', { length: 26 })
  paymentMethodId!: string;

  @ManyToOne(() => PaymentMethodEntity)
  @JoinColumn({ name: 'payment_method_id' })
  paymentMethod?: PaymentMethodEntity;

  /** '2026-03' */
  @Column('varchar', { length: 7 })
  referenceMonth!: string;

  @Column('date')
  startDate!: string;

  @Column('date')
  endDate!: string;

  @Column('date')
  dueDate!: string;

  @Column('timestamptz', { nullable: true })
  closedAt!: Date | null;
}
