import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { TagEntity } from '@/modules/finance/entities/tag.entity';
import { NotFoundError } from '@/shared/errors';

@Injectable()
export class TagDeleteService {
  constructor(
    @InjectRepository(TagEntity)
    private readonly repo: Repository<TagEntity>,
  ) {}

  async exec({ userId, id }: { userId: string; id: string }): Promise<void> {
    const result = await this.repo.softDelete({ id, userId });
    if (!result.affected) throw new NotFoundError('Tag não encontrada');
  }
}
