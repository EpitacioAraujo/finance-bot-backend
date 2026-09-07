import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { TagEntity } from '@/modules/finance/entities/tag.entity';
import { NotFoundError, ValidationError } from '@/shared/errors';

@Injectable()
export class TagUpdateService {
  constructor(
    @InjectRepository(TagEntity)
    private readonly repo: Repository<TagEntity>,
  ) {}

  async exec({
    userId,
    id,
    description,
  }: {
    userId: string;
    id: string;
    description: string;
  }): Promise<TagEntity> {
    const trimmed = description.trim();
    if (!trimmed) throw new ValidationError('A tag não pode ficar vazia');

    const tag = await this.repo.findOne({ where: { id, userId } });
    if (!tag) throw new NotFoundError('Tag não encontrada');

    tag.description = trimmed;
    return this.repo.save(tag);
  }
}
