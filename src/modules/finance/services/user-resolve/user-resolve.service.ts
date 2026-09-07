import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { UserEntity } from '@/modules/finance/entities/user.entity';

/** Telefone do WhatsApp → usuário. É daqui que sai o userId de tudo. */
@Injectable()
export class UserResolveService {
  constructor(
    @InjectRepository(UserEntity)
    private readonly repo: Repository<UserEntity>,
  ) {}

  async exec({ phone }: { phone: string }): Promise<UserEntity | null> {
    return this.repo.findOne({ where: { phone, active: true } });
  }
}
