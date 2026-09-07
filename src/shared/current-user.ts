import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
  createParamDecorator,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Request } from 'express';
import { UserEntity } from '@/modules/finance/entities/user.entity';

/**
 * PROVISÓRIO. Autenticação não entrou nos contratos e precisa de uma rodada
 * própria: hoje isto só resolve o usuário pelo header `x-user-id` e recusa se
 * ele não existir. Não é autenticação — não expor a API assim.
 */
@Injectable()
export class CurrentUserGuard implements CanActivate {
  constructor(
    @InjectRepository(UserEntity)
    private readonly users: Repository<UserEntity>,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<Request>();
    const userId = request.header('x-user-id');
    if (!userId) throw new UnauthorizedException('x-user-id ausente');

    const user = await this.users.findOne({ where: { id: userId, active: true } });
    if (!user) throw new UnauthorizedException('Usuário desconhecido');

    (request as Request & { userId?: string }).userId = user.id;
    return true;
  }
}

export const CurrentUser = createParamDecorator(
  (_data: unknown, context: ExecutionContext): string => {
    const request = context
      .switchToHttp()
      .getRequest<Request & { userId?: string }>();
    return request.userId!;
  },
);
