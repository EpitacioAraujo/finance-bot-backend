import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ulid } from 'ulid';
import { TagEntity } from '@/modules/finance/entities/tag.entity';
import { ConflictError, ValidationError } from '@/shared/errors';

@Injectable()
export class TagCreateService {
  constructor(
    @InjectRepository(TagEntity)
    private readonly repo: Repository<TagEntity>,
  ) {}

  async exec({
    userId,
    description,
  }: {
    userId: string;
    description: string;
  }): Promise<TagEntity> {
    const trimmed = description.trim();
    if (!trimmed) throw new ValidationError('A tag não pode ficar vazia');

    const existing = await this.repo.findOne({
      where: { userId, description: trimmed },
    });
    if (existing) throw new ConflictError(`A tag "${trimmed}" já existe`);

    return this.repo.save(
      this.repo.create({ id: ulid(), userId, description: trimmed }),
    );
  }
}
