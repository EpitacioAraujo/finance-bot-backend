import { ACTIONS, isActionName, validateParams } from './actions';
import { ValidationError } from '@/shared/errors';

describe('catálogo de ações', () => {
  it('recusa nome fora do catálogo', () => {
    expect(isActionName('drop_table')).toBe(false);
    expect(isActionName('create_transaction')).toBe(true);
  });

  it('descarta userId que o agente tentar mandar', () => {
    const clean = validateParams('create_tag', {
      description: 'mercado',
      userId: 'outro-usuario',
    });
    expect(clean).toEqual({ description: 'mercado' });
  });

  it('descarta qualquer campo fora do schema', () => {
    const clean = validateParams('list_tags', { limit: 999, sql: 'DROP TABLE' });
    expect(clean).toEqual({});
  });

  it('exige os campos obrigatórios', () => {
    expect(() => validateParams('create_transaction', { description: 'açaí' })).toThrow(
      ValidationError,
    );
  });

  it('respeita o teto de limit das leituras', () => {
    expect(() =>
      validateParams('list_transactions', {
        from: '2026-01-01',
        to: '2026-01-31',
        limit: 5000,
      }),
    ).toThrow(ValidationError);
  });

  it('recusa valor fora do enum', () => {
    expect(() =>
      validateParams('create_transaction', {
        description: 'açaí',
        amount: 10,
        type: 'transfer',
        paymentMethod: 'Nu Pj',
      }),
    ).toThrow(ValidationError);
  });

  it('recusa data fora de YYYY-MM-DD', () => {
    expect(() =>
      validateParams('list_bills', { from: '01/03/2026', to: '2026-03-31' }),
    ).toThrow(ValidationError);
  });

  it('aceita o plano do açaí', () => {
    expect(
      validateParams('create_transaction', {
        description: 'açaí',
        amount: 10,
        type: 'expense',
        paymentMethod: 'Nu Pj',
        date: '2026-09-03',
      }),
    ).toEqual({
      description: 'açaí',
      amount: 10,
      type: 'expense',
      paymentMethod: 'Nu Pj',
      date: '2026-09-03',
    });
  });

  it('toda ação declara kind e descrição', () => {
    for (const [name, spec] of Object.entries(ACTIONS)) {
      expect(['query', 'command']).toContain(spec.kind);
      expect(spec.description.length).toBeGreaterThan(10);
      expect(Object.keys(spec.params)).not.toContain('userId');
      expect(name).toMatch(/^[a-z_]+$/);
    }
  });
});
