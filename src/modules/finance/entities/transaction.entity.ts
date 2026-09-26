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
import { TagEntity } from './tag.entity';
import { TransactionTrancheEntity } from './transaction-tranche.entity';

export enum TransactionType {
  Income = 'income',
  Expense = 'expense',
}

export const TRANSACTION_TYPES: readonly TransactionType[] =
  Object.values(TransactionType);

/**
 * O fato da compra: o que foi, quanto, quando comprei. Como o dinheiro sai está
 * nas tranches — nunca aqui. Filtrado por `date`, o total do período é
 * competência; por `tranche.dueDate`, é caixa.
 */
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

  /** Preenchido quando é o pagamento de uma conta. */
  @Column('varchar', { length: 26, nullable: true })
  billId!: string | null;

  /**
   * Qual ocorrência da conta este pagamento quita. Sem isto, um pagamento único
   * apareceria como pagando todo mês próximo o bastante.
   */
  @Column('date', { nullable: true })
  billOccurrenceDate!: string | null;

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

  /** Nunca vazio: à vista tem uma. `tranches.length` é o número de parcelas. */
  @OneToMany(() => TransactionTrancheEntity, (tranche) => tranche.transaction)
  tranches?: TransactionTrancheEntity[];
}
