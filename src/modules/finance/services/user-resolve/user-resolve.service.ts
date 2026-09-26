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
    return this.repo.findOne({ where: { ...by, active: true } });
  }
}
