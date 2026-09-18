import { ValidationError } from '@/shared/errors';

type FieldType = 'string' | 'number' | 'boolean' | 'date' | 'string[]';

interface Field {
  type: FieldType;
  required?: boolean;
  enum?: readonly string[];
  /** Teto para campos numéricos — é o que limita `limit` das leituras. */
  max?: number;
}

export type Schema = Record<string, Field>;

export interface ActionSpec {
  kind: 'query' | 'command';
  description: string;
  params: Schema;
}

/**
 * A lista fechada. Nada fora daqui é aceito na volta do agente, e é esta mesma
 * tabela que vai no prompt como definição das ações — uma fonte, não duas.
 *
 * `userId` não aparece em nenhum schema de propósito: ele é injetado pelo
 * ActionRunner e qualquer valor que o agente mandar é descartado aqui.
 */
export const ACTIONS = {
  list_payment_methods: {
    kind: 'query',
    description: 'Lista as formas de pagamento do usuário.',
    params: {},
  },
  list_tags: {
    kind: 'query',
    description: 'Lista as tags do usuário.',
    params: {},
  },
  list_transactions: {
    kind: 'query',
    description: 'Lista lançamentos num período.',
    params: {
      from: { type: 'date', required: true },
      to: { type: 'date', required: true },
      type: { type: 'string', enum: ['income', 'expense'] },
      tag: { type: 'string' },
      paymentMethod: { type: 'string' },
      limit: { type: 'number', max: 200 },
    },
  },
  list_bills: {
    kind: 'query',
    description: 'Lista contas a pagar previstas num período.',
    params: {
      from: { type: 'date', required: true },
      to: { type: 'date', required: true },
      status: { type: 'string', enum: ['paid', 'pending'] },
    },
  },
  list_splits: {
    kind: 'query',
    description: 'Lista as parcelas de um lançamento parcelado.',
    params: { transactionId: { type: 'string', required: true } },
  },
  get_report: {
    kind: 'query',
    description: 'Totais do período, opcionalmente agrupados.',
    params: {
      from: { type: 'date', required: true },
      to: { type: 'date', required: true },
      groupBy: {
        type: 'string',
        enum: ['tag', 'payment_method', 'none'],
        required: true,
      },
      type: { type: 'string', enum: ['income', 'expense'] },
    },
  },
  list_consolidated: {
    kind: 'query',
    description: 'Faturas de cartão de crédito com vencimento no período.',
    params: {
      from: { type: 'date', required: true },
      to: { type: 'date', required: true },
    },
  },

  create_transaction: {
    kind: 'command',
    description:
      'Registra uma compra, despesa ou receita. Use o nome da forma de pagamento, nunca um id.',
    params: {
      description: { type: 'string', required: true },
      amount: { type: 'number', required: true },
      type: { type: 'string', enum: ['income', 'expense'], required: true },
      paymentMethod: { type: 'string', required: true },
      date: { type: 'date' },
      tags: { type: 'string[]' },
      installments: { type: 'number', max: 99 },
    },
  },
  update_transaction: {
    kind: 'command',
    description:
      'Altera um lançamento. O id precisa ter vindo de uma leitura desta conversa.',
    params: {
      id: { type: 'string', required: true },
      description: { type: 'string' },
      amount: { type: 'number' },
      date: { type: 'date' },
      tags: { type: 'string[]' },
    },
  },
  delete_transaction: {
    kind: 'command',
    description:
      'Apaga um lançamento. O id precisa ter vindo de uma leitura desta conversa.',
    params: { id: { type: 'string', required: true } },
  },
  pay_split: {
    kind: 'command',
    description: 'Marca uma parcela como paga.',
    params: {
      transactionId: { type: 'string', required: true },
      number: { type: 'number' },
    },
  },
  pay_bill: {
    kind: 'command',
    description: 'Paga uma conta prevista, criando o lançamento dela.',
    params: {
      billId: { type: 'string', required: true },
      amount: { type: 'number' },
      date: { type: 'date' },
      paymentMethod: { type: 'string' },
    },
  },
  pay_consolidated: {
    kind: 'command',
    description: 'Fecha a fatura de um cartão e quita as parcelas dela.',
    params: { cycleId: { type: 'string', required: true } },
  },
  create_payment_method: {
    kind: 'command',
    description:
      'Cria forma de pagamento. Só quando o usuário pedir explicitamente — nunca para viabilizar uma compra. kind=credit exige closingDay e dueDay; qualquer outro kind não aceita nenhum dos dois.',
    params: {
      description: { type: 'string', required: true },
      kind: {
        type: 'string',
        enum: ['cash', 'debit', 'credit', 'pix', 'transfer'],
        required: true,
      },
      closingDay: { type: 'number', max: 31 },
      dueDay: { type: 'number', max: 31 },
    },
  },
  create_tag: {
    kind: 'command',
    description:
      'Cria tag. Só quando o usuário pedir explicitamente — nunca para fechar uma compra.',
    params: { description: { type: 'string', required: true } },
  },
  create_bill: {
    kind: 'command',
    description:
      'Cadastra uma conta recorrente ou prevista (aluguel, internet, IPTU). monthly exige dueDay; none e yearly exigem dueDate. Use o nome da forma de pagamento e da tag, nunca um id.',
    params: {
      description: { type: 'string', required: true },
      predictedAmount: { type: 'number', required: true },
      frequency: {
        type: 'string',
        enum: ['none', 'monthly', 'yearly'],
        required: true,
      },
      paymentMethod: { type: 'string', required: true },
      dueDay: { type: 'number', max: 31 },
      dueDate: { type: 'date' },
      tag: { type: 'string' },
    },
  },
} as const satisfies Record<string, ActionSpec>;

export type ActionName = keyof typeof ACTIONS;

export const isActionName = (value: string): value is ActionName =>
  Object.prototype.hasOwnProperty.call(ACTIONS, value);

const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;

const checkField = (
  action: string,
  name: string,
  field: Field,
  value: unknown,
): unknown => {
  if (field.type === 'number') {
    if (typeof value !== 'number' || Number.isNaN(value)) {
      throw new ValidationError(`${action}.${name} precisa ser número`);
    }
    if (field.max !== undefined && value > field.max) {
      throw new ValidationError(`${action}.${name} passa do limite ${field.max}`);
    }
    return value;
  }
  if (field.type === 'boolean') {
    if (typeof value !== 'boolean') {
      throw new ValidationError(`${action}.${name} precisa ser booleano`);
    }
    return value;
  }
  if (field.type === 'string[]') {
    if (!Array.isArray(value) || value.some((v) => typeof v !== 'string')) {
      throw new ValidationError(`${action}.${name} precisa ser lista de texto`);
    }
    return value;
  }
  if (typeof value !== 'string') {
    throw new ValidationError(`${action}.${name} precisa ser texto`);
  }
  if (field.type === 'date' && !ISO_DATE.test(value)) {
    throw new ValidationError(`${action}.${name} precisa estar em YYYY-MM-DD`);
  }
  if (field.enum && !field.enum.includes(value)) {
    throw new ValidationError(
      `${action}.${name} precisa ser um de: ${field.enum.join(', ')}`,
    );
  }
  return value;
};

/**
 * Devolve só os campos declarados no schema: campo extra é descartado em
 * silêncio (inclusive um userId que o agente tenha inventado), campo inválido
 * derruba o plano inteiro.
 */
export const validateParams = (
  action: ActionName,
  raw: unknown,
): Record<string, unknown> => {
  const params = (raw ?? {}) as Record<string, unknown>;
  if (typeof params !== 'object' || Array.isArray(params)) {
    throw new ValidationError(`${action}.params precisa ser um objeto`);
  }

  const schema: Schema = ACTIONS[action].params;
  const clean: Record<string, unknown> = {};

  for (const [name, field] of Object.entries(schema)) {
    const value = params[name];
    if (value === undefined || value === null) {
      if (field.required) {
        throw new ValidationError(`${action}.${name} é obrigatório`);
      }
      continue;
    }
    clean[name] = checkField(action, name, field, value);
  }

  return clean;
};
