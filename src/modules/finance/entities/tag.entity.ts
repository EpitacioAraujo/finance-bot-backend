import { Column, Entity, Index, JoinColumn, ManyToOne } from 'typeorm';
import { BaseEntity } from '@/shared/entities/base.entity';
import { UserEntity } from './user.entity';

@Entity('tags')
@Index(['userId', 'description'], { unique: true })
export class TagEntity extends BaseEntity {
  @Column('varchar', { length: 26 })
  userId!: string;

  @ManyToOne(() => UserEntity)
  @JoinColumn({ name: 'user_id' })
  user?: UserEntity;

  @Column('text')
  description!: string;
}
