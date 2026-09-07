import 'dotenv/config';

const required = (key: string): string => {
  const value = process.env[key];
  if (!value) throw new Error(`Variável de ambiente obrigatória ausente: ${key}`);
  return value;
};

const optional = (key: string, fallback: string): string =>
  process.env[key] ?? fallback;

const number = (key: string, fallback: number): number => {
  const raw = process.env[key];
  if (!raw) return fallback;
  const parsed = Number(raw);
  if (Number.isNaN(parsed)) throw new Error(`${key} não é um número: ${raw}`);
  return parsed;
};

export const env = {
  app: {
    port: number('APP_PORT', 3000),
    frontendUrl: optional('FRONTEND_URL', 'http://localhost:5173'),
  },
  db: {
    host: optional('DB_HOST', 'localhost'),
    port: number('DB_PORT', 5432),
    username: optional('DB_USERNAME', 'root'),
    password: optional('DB_PASSWORD', 'root'),
    database: optional('DB_DATABASE', 'finance'),
    synchronize: optional('DB_SYNCHRONIZE', 'false') === 'true',
  },
  redis: {
    host: optional('REDIS_HOST', 'localhost'),
    port: number('REDIS_PORT', 6379),
  },
  whatsapp: {
    verifyToken: required('WHATSAPP_VERIFY_TOKEN'),
    accessToken: required('WHATSAPP_ACCESS_TOKEN'),
    phoneNumberId: required('WHATSAPP_PHONE_NUMBER_ID'),
    apiVersion: optional('WHATSAPP_API_VERSION', 'v21.0'),
  },
  assemblyAi: {
    apiKey: required('ASSEMBLY_AI_API_KEY'),
  },
  deepSeek: {
    apiKey: required('DEEPSEEK_API_KEY'),
    model: optional('DEEPSEEK_MODEL', 'deepseek-chat'),
  },
  interpret: {
    debounceMs: number('INTERPRET_DEBOUNCE_MS', 8000),
  },
} as const;

export type Env = typeof env;
