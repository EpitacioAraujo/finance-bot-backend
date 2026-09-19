import { DataSource, DataSourceOptions } from 'typeorm';
import { env } from './env';
import { SnakeNamingStrategy } from '@/shared/naming.strategy';

export const dataSourceOptions: DataSourceOptions = {
  type: 'postgres',
  host: env.db.host,
  port: env.db.port,
  username: env.db.username,
  password: env.db.password,
  database: env.db.database,
  // Estrutura só muda por migration; as pendentes rodam ao conectar.
  migrationsRun: true,
  namingStrategy: new SnakeNamingStrategy(),
  entities: [__dirname + '/../modules/**/entities/*.entity.{ts,js}'],
  migrations: [__dirname + '/migrations/*.{ts,js}'],
};

export default new DataSource(dataSourceOptions);
