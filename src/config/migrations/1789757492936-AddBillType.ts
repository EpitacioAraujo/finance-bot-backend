import { MigrationInterface, QueryRunner } from "typeorm";

export class AddBillType1789757492936 implements MigrationInterface {
    name = 'AddBillType1789757492936'

    public async up(queryRunner: QueryRunner): Promise<void> {
        // O default existe só pra preencher as linhas que já estão lá: toda
        // conta cadastrada até aqui é a pagar. Cai em seguida — default é código.
        await queryRunner.query(`ALTER TABLE "bills" ADD "type" character varying(10) NOT NULL DEFAULT 'expense'`);
        await queryRunner.query(`ALTER TABLE "bills" ALTER COLUMN "type" DROP DEFAULT`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "bills" DROP COLUMN "type"`);
    }

}
