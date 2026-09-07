import { addMonths, dateAt, isoToday } from '@/shared/date';
import { splitAmounts } from './services/split-generate/split-generate.service';
import { occurrencesIn } from './services/bill-list/bill-list.service';
import { BillEntity } from './entities/bill.entity';

const bill = (fields: Partial<BillEntity>): BillEntity =>
  ({ dueDate: null, dueDay: null, ...fields }) as BillEntity;

describe('datas', () => {
  it('clampa o dia ao tamanho do mês', () => {
    expect(dateAt(2026, 1, 31)).toBe('2026-02-28');
    expect(dateAt(2028, 1, 31)).toBe('2028-02-29');
  });

  it('não vaza para o mês seguinte ao somar meses', () => {
    expect(addMonths('2026-01-31', 1)).toBe('2026-02-28');
    expect(addMonths('2026-12-15', 1)).toBe('2027-01-15');
    expect(addMonths('2026-01-15', -1)).toBe('2025-12-15');
  });

  it('devolve o hoje do fuso do usuário', () => {
    expect(isoToday('America/Sao_Paulo')).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });
});

describe('parcelas', () => {
  it('soma exatamente o total, com a sobra na primeira', () => {
    expect(splitAmounts(10, 3)).toEqual([3.34, 3.33, 3.33]);
    expect(splitAmounts(100, 4)).toEqual([25, 25, 25, 25]);
  });

  it('não perde centavo em nenhuma divisão', () => {
    for (let total = 2; total <= 24; total++) {
      for (const amount of [10, 99.99, 1234.56, 0.05]) {
        const cents = splitAmounts(amount, total).reduce(
          (acc, value) => acc + Math.round(value * 100),
          0,
        );
        expect(cents).toBe(Math.round(amount * 100));
      }
    }
  });
});

describe('ocorrências de conta a pagar', () => {
  it('conta única só aparece se cair na janela', () => {
    const once = bill({ frequency: 'none', dueDate: '2026-03-10' });
    expect(occurrencesIn(once, '2026-03-01', '2026-03-31')).toEqual(['2026-03-10']);
    expect(occurrencesIn(once, '2026-04-01', '2026-04-30')).toEqual([]);
  });

  it('mensal expande uma por mês da janela', () => {
    const monthly = bill({ frequency: 'monthly', dueDay: 10 });
    expect(occurrencesIn(monthly, '2026-01-01', '2026-03-31')).toEqual([
      '2026-01-10',
      '2026-02-10',
      '2026-03-10',
    ]);
  });

  it('mensal no dia 31 cai no último dia dos meses curtos', () => {
    const monthly = bill({ frequency: 'monthly', dueDay: 31 });
    expect(occurrencesIn(monthly, '2026-01-01', '2026-03-31')).toEqual([
      '2026-01-31',
      '2026-02-28',
      '2026-03-31',
    ]);
  });

  it('anual repete a partir da data âncora', () => {
    const yearly = bill({ frequency: 'yearly', dueDate: '2025-07-20' });
    expect(occurrencesIn(yearly, '2026-01-01', '2027-12-31')).toEqual([
      '2026-07-20',
      '2027-07-20',
    ]);
  });

});
