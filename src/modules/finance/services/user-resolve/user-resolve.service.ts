import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { UserEntity } from '@/modules/finance/entities/user.entity';

/** Telefone (WhatsApp) ou id (web) → usuário. A união impede chamada sem nenhum dos dois. */
@Injectable()
export class UserResolveService {
  constructor(
    @InjectRepository(UserEntity)
    private readonly repo: Repository<UserEntity>,
  ) {}

  async exec(by: { phone: string } | { id: string }): Promise<UserEntity | null> {
    const where = 'phone' in by ? { phone: by.phone } : { id: by.id };
    // Coluna undefined o TypeORM ignora: sem esta linha um id vazio viraria
    // `WHERE active = true` e devolveria a conta de outra pessoa.
    if (!Object.values(where)[0]) return null;
    return this.repo.findOne({ where: { ...where, active: true } });
  }
}
