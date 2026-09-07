import { Column, Entity } from 'typeorm';
import { BaseEntity } from '@/shared/entities/base.entity';

@Entity('users')
export class UserEntity extends BaseEntity {
  /** O telefone do WhatsApp é a identidade. */
  @Column('varchar', { length: 20, unique: true })
  phone!: string;

  @Column('text')
  name!: string;

  /** Define o que é "hoje" às 23h. */
  @Column('varchar', { length: 40, default: 'America/Sao_Paulo' })
  timezone!: string;

  @Column('boolean', { default: true })
  active!: boolean;
}
