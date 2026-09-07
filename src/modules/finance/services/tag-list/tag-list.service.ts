import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { TagEntity } from '@/modules/finance/entities/tag.entity';

@Injectable()
export class TagListService {
  constructor(
    @InjectRepository(TagEntity)
    private readonly repo: Repository<TagEntity>,
  ) {}

  async exec({ userId }: { userId: string }): Promise<TagEntity[]> {
    return this.repo.find({ where: { userId }, order: { description: 'ASC' } });
  }
}
