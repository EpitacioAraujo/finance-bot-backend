import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { TagEntity } from '@/modules/finance/entities/tag.entity';
import { NotFoundError } from '@/shared/errors';

@Injectable()
export class TagGetService {
  constructor(
    @InjectRepository(TagEntity)
    private readonly repo: Repository<TagEntity>,
  ) {}

  async exec({ userId, id }: { userId: string; id: string }): Promise<TagEntity> {
    const tag = await this.repo.findOne({ where: { id, userId } });
    if (!tag) throw new NotFoundError('Tag não encontrada');
    return tag;
  }
}
