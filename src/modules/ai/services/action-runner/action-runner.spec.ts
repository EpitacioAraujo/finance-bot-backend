import { ActionRunnerService } from './action-runner.service';

// As 20 dependências ficam undefined de propósito: o caminho testado devolve
// antes de chamar qualquer handler. Se um dia executar, estoura aqui — que é
// exatamente o que o segundo teste usa como prova.
const runner = (): ActionRunnerService =>
  new (ActionRunnerService as unknown as new (
    ...args: unknown[]
  ) => ActionRunnerService)(...Array.from({ length: 20 }, () => undefined));

describe('plano inválido', () => {
  it('volta como resultado em vez de derrubar o turno', async () => {
    const results = await runner().exec({
      userId: 'u',
      items: [{ action: 'create_bill', params: { description: 'academia' } }],
      expect: 'command',
      knownIds: new Set(),
    });

    expect(results).toEqual([
      {
        action: 'create_bill',
        ok: false,
        error: 'create_bill.predictedAmount é obrigatório',
      },
    ]);
  });

  it('um item inválido impede todos: nada roda pela metade', async () => {
    const results = await runner().exec({
      userId: 'u',
      items: [
        { action: 'list_tags', params: {} },
        { action: 'drop_table', params: {} },
      ],
      expect: 'query',
      knownIds: new Set(),
    });

    // `list_tags` é válida. Não aparece no resultado porque não executou — e
    // se tivesse executado, o service undefined teria estourado.
    expect(results).toEqual([
      { action: 'drop_table', ok: false, error: 'Ação desconhecida: drop_table' },
    ]);
  });
});
