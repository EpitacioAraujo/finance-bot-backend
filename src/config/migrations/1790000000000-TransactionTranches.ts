import { MigrationInterface, QueryRunner } from "typeorm";

/**
 * Split vira tranche e passa a existir sempre: compra à vista ganha a linha que
 * nunca teve. Com isso `transactions.cycle_id` e `transactions.installments`
 * perdem a razão de existir — o ciclo mora na tranche e o número de parcelas é
 * quantas tranches a compra tem.
 */
export class TransactionTranches1790000000000 implements MigrationInterface {
    name = 'TransactionTranches1790000000000'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "transaction_splits" RENAME TO "transaction_tranches"`);
        await queryRunner.query(`ALTER INDEX "IDX_62fc55a7ab32262223ffbb6a4a" RENAME TO "IDX_transaction_tranches_transaction_number"`);
        await queryRunner.query(`CREATE INDEX "IDX_transaction_tranches_due_date" ON "transaction_tranches" ("due_date")`);

        // A tranche que faltava. Fora do crédito ela nasce paga na data da
        // compra — o dinheiro saiu no ato; no crédito quita quando a fatura
        // fecha, então herda o closed_at do ciclo. O id da tranche é o id da
        // transação: já é único e poupa gerar ULID em SQL.
        //
        // O critério é "não tem linha nenhuma", não `installments = 1`: confiar
        // na coluna deixaria sem tranche a compra que diz ser parcelada mas
        // perdeu os splits, e ela sumiria da lista e do caixa em silêncio. Para
        // dado saudável dá exatamente o mesmo conjunto. A transação apagada
        // mantém os splits apagados, então o EXISTS a exclui — e a apagada à
        // vista ganha a tranche já com o `deleted_at` dela.
        await queryRunner.query(`
            INSERT INTO "transaction_tranches"
                ("id", "created_at", "updated_at", "deleted_at", "transaction_id", "number", "amount", "due_date", "cycle_id", "paid_at")
            SELECT t."id", t."created_at", t."updated_at", t."deleted_at", t."id", 1, t."amount",
                   COALESCE(c."due_date", t."date"),
                   t."cycle_id",
                   CASE WHEN t."cycle_id" IS NULL
                        THEN t."date"::timestamptz
                        ELSE c."closed_at"
                   END
              FROM "transactions" t
              LEFT JOIN "payment_method_cycles" c ON c."id" = t."cycle_id"
             WHERE NOT EXISTS (
                   SELECT 1 FROM "transaction_tranches" tr
                    WHERE tr."transaction_id" = t."id"
                   )
        `);

        // Invariante 1 do modelo novo. Se algo escapou, derruba a migration:
        // ela roda em transação, então o rollback é automático e o deploy falha
        // alto em vez de subir com dinheiro invisível na tela.
        const [{ orfas }] = (await queryRunner.query(`
            SELECT count(*)::int AS orfas
              FROM "transactions" t
             WHERE t."deleted_at" IS NULL
               AND NOT EXISTS (
                   SELECT 1 FROM "transaction_tranches" tr
                    WHERE tr."transaction_id" = t."id" AND tr."deleted_at" IS NULL
                   )
        `)) as [{ orfas: number }];
        if (orfas > 0) {
            throw new Error(
                `${orfas} transação(ões) ficaram sem tranche — backfill incompleto, nada foi aplicado`,
            );
        }

        await queryRunner.query(`ALTER TABLE "transactions" DROP CONSTRAINT "FK_19ede37113187aad03020feb18c"`);
        await queryRunner.query(`ALTER TABLE "transactions" DROP COLUMN "cycle_id"`);
        await queryRunner.query(`ALTER TABLE "transactions" DROP COLUMN "installments"`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "transactions" ADD "cycle_id" character varying(26)`);
        await queryRunner.query(`ALTER TABLE "transactions" ADD "installments" smallint NOT NULL DEFAULT '1'`);
        await queryRunner.query(`ALTER TABLE "transactions" ADD CONSTRAINT "FK_19ede37113187aad03020feb18c" FOREIGN KEY ("cycle_id") REFERENCES "payment_method_cycles"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`);

        await queryRunner.query(`
            UPDATE "transactions" t
               SET "installments" = sub."count",
                   "cycle_id" = CASE WHEN sub."count" = 1 THEN sub."cycle_id" END
              FROM (
                    -- Sem filtro de deleted_at: a transação apagada tem as
                    -- tranches apagadas junto, e filtrar aqui devolveria ela
                    -- com installments = 1. Transação viva nunca tem tranche
                    -- apagada solta — o delete leva as duas, o update regenera.
                    SELECT "transaction_id", COUNT(*) AS "count", MIN("cycle_id") AS "cycle_id"
                      FROM "transaction_tranches"
                     GROUP BY "transaction_id"
                   ) sub
             WHERE sub."transaction_id" = t."id"
        `);

        // A tranche de compra à vista volta a não existir.
        await queryRunner.query(`DELETE FROM "transaction_tranches" WHERE "number" = 1 AND "transaction_id" NOT IN (SELECT "transaction_id" FROM "transaction_tranches" WHERE "number" > 1)`);

        await queryRunner.query(`DROP INDEX "IDX_transaction_tranches_due_date"`);
        await queryRunner.query(`ALTER INDEX "IDX_transaction_tranches_transaction_number" RENAME TO "IDX_62fc55a7ab32262223ffbb6a4a"`);
        await queryRunner.query(`ALTER TABLE "transaction_tranches" RENAME TO "transaction_splits"`);
    }

}
