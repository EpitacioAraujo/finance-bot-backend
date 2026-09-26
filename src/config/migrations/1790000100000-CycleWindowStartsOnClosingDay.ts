import { MigrationInterface, QueryRunner } from "typeorm";

/**
 * O dia do fechamento passou a **abrir** o ciclo em vez de fechá-lo: fechamento
 * no dia 7 era 08/09–07/10 e vira 07/09–06/10. As faturas já gravadas foram
 * calculadas pela regra velha, e como a lista de transações filtra pelo
 * `start_date`, uma janela defasada joga a compra no mês errado.
 *
 * As duas pontas andam exatamente um dia para trás — inclusive quando o dia do
 * fechamento estourava o mês (dia 31 virava o 1º do mês seguinte, e voltar um
 * dia devolve o último dia certo).
 *
 * **Não remaneja tranche.** A compra feita no dia do fechamento passaria para a
 * fatura seguinte, e parte dessas faturas já está paga — mudar o total de uma
 * fatura quitada reescreveria dinheiro que já saiu.
 */
export class CycleWindowStartsOnClosingDay1790000100000 implements MigrationInterface {
    name = 'CycleWindowStartsOnClosingDay1790000100000'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`
            UPDATE "payment_method_cycles"
               SET "start_date" = "start_date" - INTERVAL '1 day',
                   "end_date"   = "end_date"   - INTERVAL '1 day'
        `);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`
            UPDATE "payment_method_cycles"
               SET "start_date" = "start_date" + INTERVAL '1 day',
                   "end_date"   = "end_date"   + INTERVAL '1 day'
        `);
    }

}
