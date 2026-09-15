import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { PaymentMethodEntity } from '@/modules/finance/entities/payment-method.entity';
import { AmbiguousError, NotFoundError } from '@/shared/errors';
import { matchByDescription } from '@/shared/text-match';

interface Input {
  userId: string;
  /** O agente manda nome. */
  text?: string;
  /** A web manda id. */
  id?: string;
}

/** Referência → entidade: "Nu Pj" ou o id, conforme quem chama. */
@Injectable()
export class PaymentMethodResolveService {
  constructor(
    @InjectRepository(PaymentMethodEntity)
    private readonly repo: Repository<PaymentMethodEntity>,
  ) {}

  async exec({ userId, text, id }: Input): Promise<PaymentMethodEntity> {
    if (id) {
      const found = await this.repo.findOne({
        where: { id, userId, active: true },
      });
      if (!found) throw new NotFoundError('Forma de pagamento não encontrada');
      return found;
    }

    // Um usuário tem poucas formas de pagamento — filtrar em memória evita
    // depender da extensão unaccent no Postgres.
    const all = await this.repo.find({ where: { userId, active: true } });
    const matches = matchByDescription(all, text ?? '');

    if (matches.length === 0) {
      throw new NotFoundError(`Não achei a forma de pagamento "${text}"`);
    }
    if (matches.length > 1) {
      throw new AmbiguousError(
        `"${text}" casou com mais de uma forma de pagamento`,
        matches.map((m) => ({ id: m.id, description: m.description })),
      );
    }
    return matches[0];
  }
}
