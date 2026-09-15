import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { PaymentMethodEntity } from '@/modules/finance/entities/payment-method.entity';
import { NotFoundError } from '@/shared/errors';

@Injectable()
export class PaymentMethodGetService {
  constructor(
    @InjectRepository(PaymentMethodEntity)
    private readonly repo: Repository<PaymentMethodEntity>,
  ) {}

  async exec({ userId, id }: { userId: string; id: string }): Promise<PaymentMethodEntity> {
    const method = await this.repo.findOne({ where: { id, userId } });
    if (!method) throw new NotFoundError('Forma de pagamento não encontrada');
    return method;
  }
}
