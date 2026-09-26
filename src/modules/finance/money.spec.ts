import { addMonths, dateAt, isoToday } from '@/shared/date';
import {
  trancheAmounts,
  trancheSettledAt,
} from './services/tranche-generate/tranche-generate.service';
import { occurrencesIn } from './services/bill-list/bill-list.service';
import { cycleWindow } from './services/cycle-resolve/cycle-resolve.service';
import { BillEntity } from './entities/bill.entity';

// `createdAt` bem no passado: a ocorrência recorrente é cortada pelo mês de
// cadastro, e sem isso todo caso mensal cairia fora da janela do teste.
const bill = (fields: Partial<BillEntity>): BillEntity =>
  ({
    dueDate: null,
    dueDay: null,
    createdAt: new Date('2020-01-01T00:00:00Z'),
    ...fields,
  }) as BillEntity;

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

describe('tranches', () => {
  it('soma exatamente o total, com a sobra na primeira', () => {
    expect(trancheAmounts(10, 3)).toEqual([3.34, 3.33, 3.33]);
    expect(trancheAmounts(100, 4)).toEqual([25, 25, 25, 25]);
  });

  it('à vista é uma tranche com o total inteiro', () => {
    expect(trancheAmounts(99.99, 1)).toEqual([99.99]);
  });

  it('não perde centavo em nenhuma divisão', () => {
    for (let total = 1; total <= 24; total++) {
      for (const amount of [10, 99.99, 1234.56, 0.05]) {
        const cents = trancheAmounts(amount, total).reduce(
          (acc, value) => acc + Math.round(value * 100),
          0,
        );
        expect(cents).toBe(Math.round(amount * 100));
      }
    }
  });

  it('nasce paga fora do crédito só quando vence no ato', () => {
    // Pix à vista: o dinheiro saiu.
    expect(trancheSettledAt('pix', '2026-03-10', '2026-03-10')).toEqual(
      new Date('2026-03-10T00:00:00Z'),
    );
    // Boleto em 10x: a 1ª saiu, a 2ª ainda não.
    expect(trancheSettledAt('transfer', '2026-04-10', '2026-03-10')).toBeNull();
    // Crédito nunca: quita quando a fatura fecha.
    expect(trancheSettledAt('credit', '2026-03-10', '2026-03-10')).toBeNull();
  });
});

describe('ciclo de cartão', () => {
  it('o dia do fechamento abre o ciclo, não fecha', () => {
    // Fecha dia 7, vence dia 15.
    expect(cycleWindow(7, 15, '2026-09-06')).toEqual({
      referenceMonth: '2026-09',
      startDate: '2026-08-07',
      endDate: '2026-09-06',
      dueDate: '2026-09-15',
    });
    expect(cycleWindow(7, 15, '2026-09-07')).toEqual({
      referenceMonth: '2026-10',
      startDate: '2026-09-07',
      endDate: '2026-10-06',
      dueDate: '2026-10-15',
    });
  });

  it('vencimento antes do fechamento cai no mês seguinte', () => {
    // Fecha dia 20, vence dia 10: a fatura de 20/09 a 19/10 vence em 10/11.
    expect(cycleWindow(20, 10, '2026-09-25')).toEqual({
      referenceMonth: '2026-11',
      startDate: '2026-09-20',
      endDate: '2026-10-19',
      dueDate: '2026-11-10',
    });
  });

  it('fechamento dia 31 clampa nos meses curtos sem deixar buraco', () => {
    const fev = cycleWindow(31, 10, '2026-02-15');
    expect(fev.startDate).toBe('2026-01-31');
    expect(fev.endDate).toBe('2026-02-27');
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
