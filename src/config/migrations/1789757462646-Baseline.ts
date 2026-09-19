import { MigrationInterface, QueryRunner } from "typeorm";

export class Baseline1789757462646 implements MigrationInterface {
    name = 'Baseline1789757462646'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`CREATE TABLE "raw_messages" ("id" character varying(26) NOT NULL, "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "deleted_at" TIMESTAMP WITH TIME ZONE, "user_id" character varying(26), "wa_message_id" character varying(80) NOT NULL, "from" character varying(20) NOT NULL, "type" character varying(10) NOT NULL, "payload" jsonb NOT NULL, "resolved_text" text, "processed_at" TIMESTAMP WITH TIME ZONE, "reply_text" text, "error" text, CONSTRAINT "UQ_8b7974ca1f7ba1573b841da32f1" UNIQUE ("wa_message_id"), CONSTRAINT "PK_d4a50de11550b657fe3d8b04171" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE TABLE "users" ("id" character varying(26) NOT NULL, "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "deleted_at" TIMESTAMP WITH TIME ZONE, "phone" character varying(20) NOT NULL, "name" text NOT NULL, "timezone" character varying(40) NOT NULL DEFAULT 'America/Sao_Paulo', "active" boolean NOT NULL DEFAULT true, CONSTRAINT "UQ_a000cca60bcf04454e727699490" UNIQUE ("phone"), CONSTRAINT "PK_a3ffb1c0c8416b9fc6f907b7433" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE TABLE "payment_methods" ("id" character varying(26) NOT NULL, "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "deleted_at" TIMESTAMP WITH TIME ZONE, "user_id" character varying(26) NOT NULL, "description" text NOT NULL, "kind" character varying(10) NOT NULL, "closing_day" smallint, "due_day" smallint, "show_in_bills" boolean NOT NULL DEFAULT false, "active" boolean NOT NULL DEFAULT true, CONSTRAINT "PK_34f9b8c6dfb4ac3559f7e2820d1" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE UNIQUE INDEX "IDX_a22270e85de3cdbbec5b9ada3a" ON "payment_methods" ("user_id", "description") `);
        await queryRunner.query(`CREATE TABLE "payment_method_cycles" ("id" character varying(26) NOT NULL, "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "deleted_at" TIMESTAMP WITH TIME ZONE, "payment_method_id" character varying(26) NOT NULL, "reference_month" character varying(7) NOT NULL, "start_date" date NOT NULL, "end_date" date NOT NULL, "due_date" date NOT NULL, "closed_at" TIMESTAMP WITH TIME ZONE, CONSTRAINT "PK_a7c38a42f9d3a4f31f2e17d7db5" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE UNIQUE INDEX "IDX_bcba71132b04d93ecf6a29b218" ON "payment_method_cycles" ("payment_method_id", "reference_month") `);
        await queryRunner.query(`CREATE TABLE "tags" ("id" character varying(26) NOT NULL, "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "deleted_at" TIMESTAMP WITH TIME ZONE, "user_id" character varying(26) NOT NULL, "description" text NOT NULL, CONSTRAINT "PK_e7dc17249a1148a1970748eda99" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE UNIQUE INDEX "IDX_e7173da8cb7e92826a1eb430d5" ON "tags" ("user_id", "description") `);
        await queryRunner.query(`CREATE TABLE "transaction_splits" ("id" character varying(26) NOT NULL, "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "deleted_at" TIMESTAMP WITH TIME ZONE, "transaction_id" character varying(26) NOT NULL, "number" smallint NOT NULL, "amount" numeric(15,2) NOT NULL, "due_date" date NOT NULL, "cycle_id" character varying(26), "paid_at" TIMESTAMP WITH TIME ZONE, CONSTRAINT "PK_ff450f3d91d3c2764e27a3dfc15" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE UNIQUE INDEX "IDX_62fc55a7ab32262223ffbb6a4a" ON "transaction_splits" ("transaction_id", "number") `);
        await queryRunner.query(`CREATE TABLE "transactions" ("id" character varying(26) NOT NULL, "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "deleted_at" TIMESTAMP WITH TIME ZONE, "user_id" character varying(26) NOT NULL, "description" text NOT NULL, "amount" numeric(15,2) NOT NULL, "type" character varying(10) NOT NULL, "date" date NOT NULL, "payment_method_id" character varying(26) NOT NULL, "cycle_id" character varying(26), "bill_id" character varying(26), "bill_occurrence_date" date, "installments" smallint NOT NULL DEFAULT '1', "origin_message_id" character varying(26), "notes" text, CONSTRAINT "PK_a219afd8dd77ed80f5a862f1db9" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE INDEX "IDX_fe815e76e6d1e733cebfd0f903" ON "transactions" ("user_id", "date") `);
        await queryRunner.query(`CREATE TABLE "bills" ("id" character varying(26) NOT NULL, "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "deleted_at" TIMESTAMP WITH TIME ZONE, "user_id" character varying(26) NOT NULL, "description" text NOT NULL, "predicted_amount" numeric(15,2) NOT NULL, "due_date" date, "due_day" smallint, "frequency" character varying(10) NOT NULL, "payment_method_id" character varying(26) NOT NULL, "tag_id" character varying(26), "active" boolean NOT NULL DEFAULT true, "notes" text, CONSTRAINT "PK_a56215dfcb525755ec832cc80b7" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE TABLE "conversation_messages" ("id" character varying(26) NOT NULL, "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "deleted_at" TIMESTAMP WITH TIME ZONE, "user_id" character varying(26) NOT NULL, "role" character varying(10) NOT NULL, "content" text NOT NULL, CONSTRAINT "PK_113248f25c4c0a7c179b3f5a609" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE INDEX "IDX_1db9904ad89779dd871006ef76" ON "conversation_messages" ("user_id", "created_at") `);
        await queryRunner.query(`CREATE TABLE "transaction_tag" ("transaction_id" character varying(26) NOT NULL, "tag_id" character varying(26) NOT NULL, CONSTRAINT "PK_e49e70e7f5dbe176a3b87931d9d" PRIMARY KEY ("transaction_id", "tag_id"))`);
        await queryRunner.query(`CREATE INDEX "IDX_79fa5ed938e8219dc98d3cf28b" ON "transaction_tag" ("transaction_id") `);
        await queryRunner.query(`CREATE INDEX "IDX_7013cf230aa2d8e5c87a17d996" ON "transaction_tag" ("tag_id") `);
        await queryRunner.query(`ALTER TABLE "payment_methods" ADD CONSTRAINT "FK_d7d7fb15569674aaadcfbc0428c" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "payment_method_cycles" ADD CONSTRAINT "FK_44e297510d7f0eea0152e0bbff4" FOREIGN KEY ("payment_method_id") REFERENCES "payment_methods"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "tags" ADD CONSTRAINT "FK_74603743868d1e4f4fc2c0225b6" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "transaction_splits" ADD CONSTRAINT "FK_ffa9819d782617720cd8d13b109" FOREIGN KEY ("transaction_id") REFERENCES "transactions"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "transaction_splits" ADD CONSTRAINT "FK_1c5270963272fe5814eb4f64346" FOREIGN KEY ("cycle_id") REFERENCES "payment_method_cycles"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "transactions" ADD CONSTRAINT "FK_e9acc6efa76de013e8c1553ed2b" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "transactions" ADD CONSTRAINT "FK_388643fdd3e9eddd7691fcba092" FOREIGN KEY ("payment_method_id") REFERENCES "payment_methods"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "transactions" ADD CONSTRAINT "FK_19ede37113187aad03020feb18c" FOREIGN KEY ("cycle_id") REFERENCES "payment_method_cycles"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "bills" ADD CONSTRAINT "FK_03e3fcf1580c70bb68aedb999bf" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "bills" ADD CONSTRAINT "FK_eecc902dfba0d67baf4bb7ce390" FOREIGN KEY ("payment_method_id") REFERENCES "payment_methods"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "bills" ADD CONSTRAINT "FK_321b41493a119fe654d12073b00" FOREIGN KEY ("tag_id") REFERENCES "tags"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "transaction_tag" ADD CONSTRAINT "FK_79fa5ed938e8219dc98d3cf28b3" FOREIGN KEY ("transaction_id") REFERENCES "transactions"("id") ON DELETE CASCADE ON UPDATE CASCADE`);
        await queryRunner.query(`ALTER TABLE "transaction_tag" ADD CONSTRAINT "FK_7013cf230aa2d8e5c87a17d9963" FOREIGN KEY ("tag_id") REFERENCES "tags"("id") ON DELETE CASCADE ON UPDATE CASCADE`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "transaction_tag" DROP CONSTRAINT "FK_7013cf230aa2d8e5c87a17d9963"`);
        await queryRunner.query(`ALTER TABLE "transaction_tag" DROP CONSTRAINT "FK_79fa5ed938e8219dc98d3cf28b3"`);
        await queryRunner.query(`ALTER TABLE "bills" DROP CONSTRAINT "FK_321b41493a119fe654d12073b00"`);
        await queryRunner.query(`ALTER TABLE "bills" DROP CONSTRAINT "FK_eecc902dfba0d67baf4bb7ce390"`);
        await queryRunner.query(`ALTER TABLE "bills" DROP CONSTRAINT "FK_03e3fcf1580c70bb68aedb999bf"`);
        await queryRunner.query(`ALTER TABLE "transactions" DROP CONSTRAINT "FK_19ede37113187aad03020feb18c"`);
        await queryRunner.query(`ALTER TABLE "transactions" DROP CONSTRAINT "FK_388643fdd3e9eddd7691fcba092"`);
        await queryRunner.query(`ALTER TABLE "transactions" DROP CONSTRAINT "FK_e9acc6efa76de013e8c1553ed2b"`);
        await queryRunner.query(`ALTER TABLE "transaction_splits" DROP CONSTRAINT "FK_1c5270963272fe5814eb4f64346"`);
        await queryRunner.query(`ALTER TABLE "transaction_splits" DROP CONSTRAINT "FK_ffa9819d782617720cd8d13b109"`);
        await queryRunner.query(`ALTER TABLE "tags" DROP CONSTRAINT "FK_74603743868d1e4f4fc2c0225b6"`);
        await queryRunner.query(`ALTER TABLE "payment_method_cycles" DROP CONSTRAINT "FK_44e297510d7f0eea0152e0bbff4"`);
        await queryRunner.query(`ALTER TABLE "payment_methods" DROP CONSTRAINT "FK_d7d7fb15569674aaadcfbc0428c"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_7013cf230aa2d8e5c87a17d996"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_79fa5ed938e8219dc98d3cf28b"`);
        await queryRunner.query(`DROP TABLE "transaction_tag"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_1db9904ad89779dd871006ef76"`);
        await queryRunner.query(`DROP TABLE "conversation_messages"`);
        await queryRunner.query(`DROP TABLE "bills"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_fe815e76e6d1e733cebfd0f903"`);
        await queryRunner.query(`DROP TABLE "transactions"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_62fc55a7ab32262223ffbb6a4a"`);
        await queryRunner.query(`DROP TABLE "transaction_splits"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_e7173da8cb7e92826a1eb430d5"`);
        await queryRunner.query(`DROP TABLE "tags"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_bcba71132b04d93ecf6a29b218"`);
        await queryRunner.query(`DROP TABLE "payment_method_cycles"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_a22270e85de3cdbbec5b9ada3a"`);
        await queryRunner.query(`DROP TABLE "payment_methods"`);
        await queryRunner.query(`DROP TABLE "users"`);
        await queryRunner.query(`DROP TABLE "raw_messages"`);
    }

}
