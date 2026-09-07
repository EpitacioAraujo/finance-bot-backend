import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { PaymentMethodEntity } from '@/modules/finance/entities/payment-method.entity';

@Injectable()
export class PaymentMethodListService {
  constructor(
    @InjectRepository(PaymentMethodEntity)
    private readonly repo: Repository<PaymentMethodEntity>,
  ) {}

  async exec({
    userId,
    activeOnly,
  }: {
    userId: string;
    activeOnly?: boolean;
  }): Promise<PaymentMethodEntity[]> {
    return this.repo.find({
      where: { userId, ...(activeOnly === false ? {} : { active: true }) },
      order: { description: 'ASC' },
    });
  }
}
