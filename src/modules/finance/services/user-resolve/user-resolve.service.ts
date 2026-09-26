import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { UserEntity } from '@/modules/finance/entities/user.entity';

/** Telefone do WhatsApp → usuário. Na web quem resolve é o `CurrentUserGuard`. */
@Injectable()
export class UserResolveService {
  constructor(
    @InjectRepository(UserEntity)
    private readonly repo: Repository<UserEntity>,
  ) {}

  async exec({ phone }: { phone: string }): Promise<UserEntity | null> {
    // Coluna undefined o TypeORM ignora, e a consulta viraria `WHERE active`,
    // devolvendo a conta de outra pessoa.
    if (!phone) return null;
    return this.repo.findOne({ where: { phone, active: true } });
  }
}
