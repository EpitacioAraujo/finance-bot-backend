import { Column, Entity, Index, JoinColumn, ManyToOne } from 'typeorm';
import { BaseEntity } from '@/shared/entities/base.entity';
import { decimalTransformer } from '@/shared/decimal.transformer';
import { PaymentMethodCycleEntity } from './payment-method-cycle.entity';
import { TransactionEntity } from './transaction.entity';

/**
 * A linha de pagamento: uma fatia da compra com valor, vencimento e estado de
 * pago. Existe sempre — à vista é uma tranche de número 1, não uma exceção. É
 * aqui que mora o "quando o dinheiro sai"; a transação guarda o "quando comprei".
 */
// Índices nomeados à mão: a migration renomeia os do tempo de `transaction_splits`
// e o hash que o TypeORM geraria não bate mais com o que está no banco.
@Entity('transaction_tranches')
@Index('IDX_transaction_tranches_transaction_number', ['transactionId', 'number'], {
  unique: true,
})
export class TransactionTrancheEntity extends BaseEntity {
  @Column('varchar', { length: 26 })
  transactionId!: string;

  @ManyToOne(() => TransactionEntity, (transaction) => transaction.tranches)
  @JoinColumn({ name: 'transaction_id' })
  transaction?: TransactionEntity;

  /** 1..N */
  @Column('smallint')
  number!: number;

  /** A soma das tranches bate exatamente com transaction.amount. */
  @Column('decimal', {
    precision: 15,
    scale: 2,
    transformer: decimalTransformer,
  })
  amount!: number;

  /** Filtrado por esta coluna, o total do período é caixa. */
  @Index('IDX_transaction_tranches_due_date')
  @Column('date')
  dueDate!: string;

  /** Preenchido se e só se a forma de pagamento é crédito. */
  @Column('varchar', { length: 26, nullable: true })
  cycleId!: string | null;

  @ManyToOne(() => PaymentMethodCycleEntity, { nullable: true })
  @JoinColumn({ name: 'cycle_id' })
  cycle?: PaymentMethodCycleEntity | null;

  @Column('timestamptz', { nullable: true })
  paidAt!: Date | null;
}
