import {
  Column,
  Entity,
  Index,
  JoinColumn,
  JoinTable,
  ManyToMany,
  ManyToOne,
  OneToMany,
} from 'typeorm';
import { BaseEntity } from '@/shared/entities/base.entity';
import { decimalTransformer } from '@/shared/decimal.transformer';
import { UserEntity } from './user.entity';
import { PaymentMethodEntity } from './payment-method.entity';
import { PaymentMethodCycleEntity } from './payment-method-cycle.entity';
import { TagEntity } from './tag.entity';
import { TransactionSplitEntity } from './transaction-split.entity';

export enum TransactionType {
  Income = 'income',
  Expense = 'expense',
}

export const TRANSACTION_TYPES: readonly TransactionType[] =
  Object.values(TransactionType);

@Entity('transactions')
@Index(['userId', 'date'])
export class TransactionEntity extends BaseEntity {
  @Column('varchar', { length: 26 })
  userId!: string;

  @ManyToOne(() => UserEntity)
  @JoinColumn({ name: 'user_id' })
  user?: UserEntity;

  @Column('text')
  description!: string;

  /** Valor total, sempre positivo. O sinal vem de `type`. */
  @Column('decimal', {
    precision: 15,
    scale: 2,
    transformer: decimalTransformer,
  })
  amount!: number;

  @Column('varchar', { length: 10 })
  type!: TransactionType;

  /** Data da compra, não do vencimento. */
  @Column('date')
  date!: string;

  @Column('varchar', { length: 26 })
  paymentMethodId!: string;

  @ManyToOne(() => PaymentMethodEntity)
  @JoinColumn({ name: 'payment_method_id' })
  paymentMethod?: PaymentMethodEntity;

  /** Preenchido quando cai num cartão de crédito. */
  @Column('varchar', { length: 26, nullable: true })
  cycleId!: string | null;

  @ManyToOne(() => PaymentMethodCycleEntity, { nullable: true })
  @JoinColumn({ name: 'cycle_id' })
  cycle?: PaymentMethodCycleEntity | null;

  /** Preenchido quando é o pagamento de uma conta. */
  @Column('varchar', { length: 26, nullable: true })
  billId!: string | null;

  /**
   * Qual ocorrência da conta este pagamento quita. Sem isto, um pagamento único
   * apareceria como pagando todo mês próximo o bastante.
   */
  @Column('date', { nullable: true })
  billOccurrenceDate!: string | null;

  /** 1 = à vista. */
  @Column('smallint', { default: 1 })
  installments!: number;

  /** Rastro de qual mensagem do WhatsApp gerou o lançamento. */
  @Column('varchar', { length: 26, nullable: true })
  originMessageId!: string | null;

  @Column('text', { nullable: true })
  notes!: string | null;

  @ManyToMany(() => TagEntity)
  @JoinTable({
    name: 'transaction_tag',
    joinColumn: { name: 'transaction_id' },
    inverseJoinColumn: { name: 'tag_id' },
  })
  tags?: TagEntity[];

  @OneToMany(() => TransactionSplitEntity, (split) => split.transaction)
  splits?: TransactionSplitEntity[];
}
