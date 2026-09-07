import { Injectable } from '@nestjs/common';
import { env } from '@/config/env';
import { ValidationError } from '@/shared/errors';
import { PromptMessage } from '@/modules/ai/prompt';
import { PlanItem } from '@/modules/ai/services/action-runner/action-runner.service';

export interface Plan {
  reply: string;
  queries: PlanItem[];
  actions: PlanItem[];
}

interface ChatCompletion {
  choices?: { message?: { content?: string } }[];
}

const asItems = (value: unknown, field: string): PlanItem[] => {
  if (value === undefined || value === null) return [];
  if (!Array.isArray(value)) {
    throw new ValidationError(`O plano trouxe ${field} que não é lista`);
  }
  return value.map((item) => {
    const entry = item as { action?: unknown; params?: unknown };
    if (typeof entry?.action !== 'string') {
      throw new ValidationError(`O plano trouxe ${field} sem "action"`);
    }
    return { action: entry.action, params: entry.params };
  });
};

/** Chama o LLM e valida o formato. Retry e backoff ficam com o BullMQ. */
@Injectable()
export class PlanRequestService {
  async exec({ messages }: { messages: PromptMessage[] }): Promise<Plan> {
    const response = await fetch(
      'https://api.deepseek.com/chat/completions',
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${env.deepSeek.apiKey}`,
        },
        body: JSON.stringify({
          model: env.deepSeek.model,
          messages,
          response_format: { type: 'json_object' },
          temperature: 0.2,
        }),
      },
    );

    if (!response.ok) {
      throw new Error(
        `DeepSeek respondeu ${response.status}: ${await response.text()}`,
      );
    }

    const body = (await response.json()) as ChatCompletion;
    const content = body.choices?.[0]?.message?.content;
    if (!content) throw new Error('DeepSeek respondeu sem conteúdo');

    let parsed: Record<string, unknown>;
    try {
      parsed = JSON.parse(content) as Record<string, unknown>;
    } catch {
      throw new ValidationError('O plano não veio em JSON válido');
    }

    if (typeof parsed.reply !== 'string') {
      throw new ValidationError('O plano veio sem "reply"');
    }

    return {
      reply: parsed.reply,
      queries: asItems(parsed.queries, 'queries'),
      actions: asItems(parsed.actions, 'actions'),
    };
  }
}
