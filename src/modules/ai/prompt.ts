import { ACTIONS } from './catalog/actions';
import { stamp } from '@/shared/date';

export interface PromptContext {
  today: string;
  now: Date;
  timezone: string;
  paymentMethods: { description: string; kind: string }[];
  tags: string[];
  history: { role: 'user' | 'assistant'; content: string; createdAt: Date }[];
  incoming: string[];
  /** Resultado das leituras da rodada anterior, quando houve. */
  queryResults?: unknown;
  /** Resultado das escritas, quando alguma falhou. */
  actionResults?: unknown;
}

export interface PromptMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

const rules = (context: PromptContext): string =>
  [
    'Você é o assistente financeiro de um usuário no WhatsApp. Você NÃO executa nada:',
    'você devolve um plano em JSON e o sistema executa o que for permitido.',
    '',
    `Agora são ${stamp(context.now, context.timezone)} de ${context.today} (fuso ${context.timezone}).`,
    'Cada mensagem começa com [dd/mm hh:mm] — é quando ela foi enviada, não faz parte do texto.',
    '',
    'Responda SEMPRE com este JSON e nada mais:',
    '{ "reply": string, "queries": [{"action": string, "params": object}], "actions": [{"action": string, "params": object}] }',
    '',
    'Regras:',
    '- A mensagem chega bagunçada. Extraia o que der e ignore o resto.',
    '- "no crédito" é ruído quando a forma de pagamento já é cartão de crédito.',
    '- Faltou valor, forma de pagamento ou descrição? Devolva actions vazio e pergunte no reply. Nunca chute.',
    '- Nunca crie forma de pagamento ou tag para viabilizar uma compra. Pergunte qual usar.',
    '- Ao perguntar qual forma de pagamento, ofereça SÓ as que estão na lista abaixo.',
    '  Nunca invente exemplo: se a lista estiver vazia, diga que não há nenhuma cadastrada',
    '  e ofereça criar uma, perguntando nome e tipo.',
    '- Se o usuário aceitar algo que você propôs na mensagem anterior, o "isso"/"esse"',
    '  dele se refere ao que VOCÊ escreveu. Releia sua própria mensagem antes de perguntar de novo.',
    '- Use o nome da forma de pagamento e da tag, nunca um id.',
    '- id em update/delete só se ele veio de uma leitura desta conversa.',
    '- Precisa consultar antes de decidir? Devolva queries e deixe actions vazio.',
    '- Mandou actions? O reply descreve o que FOI FEITO, no passado. Nunca pergunte',
    '  "confirma?" junto com actions: quando a resposta chega o sistema já executou.',
    '  Quer confirmação antes? Devolva actions vazio e só a pergunta.',
    '- Nunca repita uma ação que já apareceu como executada no histórico.',
    '- No reply, repita o que foi gravado para o usuário perceber se entendeu errado.',
    '',
    'Ações disponíveis:',
    ...Object.entries(ACTIONS).map(
      ([name, spec]) =>
        `- ${name} (${spec.kind}) — ${spec.description} params: ${JSON.stringify(spec.params)}`,
    ),
    '',
    'Formas de pagamento do usuário:',
    context.paymentMethods.length
      ? context.paymentMethods
          .map((m) => `- ${m.description} (${m.kind})`)
          .join('\n')
      : '- nenhuma cadastrada',
    '',
    'Tags do usuário:',
    context.tags.length ? context.tags.map((t) => `- ${t}`).join('\n') : '- nenhuma',
  ].join('\n');

export const buildPrompt = (context: PromptContext): PromptMessage[] => {
  const messages: PromptMessage[] = [
    { role: 'system', content: rules(context) },
    ...context.history.map((message) => ({
      role: message.role,
      content: `[${stamp(message.createdAt, context.timezone)}] ${message.content}`,
    })),
    {
      role: 'user',
      content: `[${stamp(context.now, context.timezone)}] ${context.incoming.join('\n')}`,
    },
  ];

  if (context.actionResults !== undefined) {
    messages.push({
      role: 'user',
      content: [
        'O sistema executou o seu plano e este foi o resultado:',
        JSON.stringify(context.actionResults),
        '',
        'ok:true já foi gravado — não mande de novo. ok:false não foi.',
        'Responda ao usuário em linguagem natural: o que entrou, o que faltou e o que',
        'ele precisa fazer. Devolva actions e queries vazios nesta resposta.',
      ].join('\n'),
    });
    return messages;
  }

  if (context.queryResults !== undefined) {
    messages.push({
      role: 'user',
      content: `Resultado das consultas que você pediu:\n${JSON.stringify(context.queryResults)}`,
    });
  }

  return messages;
};
