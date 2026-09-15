import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Repository } from 'typeorm';
import { TagEntity } from '@/modules/finance/entities/tag.entity';
import { AmbiguousError, NotFoundError } from '@/shared/errors';
import { matchByDescription } from '@/shared/text-match';

interface Input {
  userId: string;
  /** O agente manda nomes. */
  texts?: string[];
  /** A web manda ids. */
  ids?: string[];
}

/** Resolve a lista inteira numa consulta só — não é uma chamada por tag. */
@Injectable()
export class TagResolveService {
  constructor(
    @InjectRepository(TagEntity)
    private readonly repo: Repository<TagEntity>,
  ) {}

  async exec({ userId, texts = [], ids = [] }: Input): Promise<TagEntity[]> {
    if (ids.length > 0) {
      const found = await this.repo.find({ where: { userId, id: In(ids) } });
      if (found.length !== new Set(ids).size) {
        throw new NotFoundError('Tag não encontrada');
      }
      return found;
    }

    if (texts.length === 0) return [];

    const all = await this.repo.find({ where: { userId } });
    const resolved: TagEntity[] = [];

    for (const text of texts) {
      const matches = matchByDescription(all, text);
      if (matches.length === 0) {
        throw new NotFoundError(`Não achei a tag "${text}"`);
      }
      if (matches.length > 1) {
        throw new AmbiguousError(
          `"${text}" casou com mais de uma tag`,
          matches.map((t) => ({ id: t.id, description: t.description })),
        );
      }
      resolved.push(matches[0]);
    }

    return resolved;
  }
}
