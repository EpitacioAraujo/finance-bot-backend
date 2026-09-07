import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { PaymentMethodEntity } from '@/modules/finance/entities/payment-method.entity';
import { TransactionEntity } from '@/modules/finance/entities/transaction.entity';
import { ConflictError, NotFoundError } from '@/shared/errors';

@Injectable()
export class PaymentMethodDeleteService {
  constructor(
    @InjectRepository(PaymentMethodEntity)
    private readonly methods: Repository<PaymentMethodEntity>,
    @InjectRepository(TransactionEntity)
    private readonly transactions: Repository<TransactionEntity>,
  ) {}

  async exec({ userId, id }: { userId: string; id: string }): Promise<void> {
    const method = await this.methods.findOne({ where: { id, userId } });
    if (!method) throw new NotFoundError('Forma de pagamento não encontrada');

    // Não apaga em cascata dinheiro do usuário.
    const used = await this.transactions.countBy({ paymentMethodId: id });
    if (used > 0) {
      throw new ConflictError(
        `"${method.description}" tem ${used} lançamento(s) e não pode ser apagada`,
      );
    }

    await this.methods.softDelete({ id });
  }
}
