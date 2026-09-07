import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { BullModule } from '@nestjs/bullmq';
import { dataSourceOptions } from './config/data-source';
import { RedisModule } from './config/redis.module';
import { FinanceModule } from './modules/finance/finance.module';
import { WhatsappModule } from './modules/whatsapp/whatsapp.module';
import { AiModule } from './modules/ai/ai.module';
import { env } from './config/env';

@Module({
  imports: [
    TypeOrmModule.forRoot(dataSourceOptions),
    BullModule.forRoot({
      connection: { host: env.redis.host, port: env.redis.port },
    }),
    RedisModule,
    FinanceModule,
    WhatsappModule,
    AiModule,
  ],
})
export class AppModule {}
