import { Column, Entity, Index, JoinColumn, ManyToOne } from 'typeorm';
import { BaseEntity } from '@/shared/entities/base.entity';
import { decimalTransformer } from '@/shared/decimal.transformer';
import { PaymentMethodCycleEntity } from './payment-method-cycle.entity';
import { TransactionEntity } from './transaction.entity';

/** Só existe quando installments > 1. Compra à vista não gera linha. */
@Entity('transaction_splits')
@Index(['transactionId', 'number'], { unique: true })
export class TransactionSplitEntity extends BaseEntity {
  @Column('varchar', { length: 26 })
  transactionId!: string;

  @ManyToOne(() => TransactionEntity, (transaction) => transaction.splits)
  @JoinColumn({ name: 'transaction_id' })
  transaction?: TransactionEntity;

  /** 1..N */
  @Column('smallint')
  number!: number;

  /** A soma das parcelas bate exatamente com transaction.amount. */
  @Column('decimal', {
    precision: 15,
    scale: 2,
    transformer: decimalTransformer,
  })
  amount!: number;

  @Column('date')
  dueDate!: string;

  /** Cada parcela cai num ciclo diferente do cartão. */
  @Column('varchar', { length: 26, nullable: true })
  cycleId!: string | null;

  @ManyToOne(() => PaymentMethodCycleEntity, { nullable: true })
  @JoinColumn({ name: 'cycle_id' })
  cycle?: PaymentMethodCycleEntity | null;

  @Column('timestamptz', { nullable: true })
  paidAt!: Date | null;
}
