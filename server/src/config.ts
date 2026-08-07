import { z } from 'zod'

const environmentSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  PORT: z.coerce.number().int().positive().default(8787),
  APP_ORIGIN: z.string().default('http://localhost:5173'),
  DATABASE_URL: z.string().default('postgres://pet10:pet10@localhost:5432/pet10'),
  REDIS_URL: z.string().default('redis://localhost:6379'),
  JWT_SECRET: z.string().optional(),
  JWT_EXPIRES_IN: z.string().default('30d'),
  LOGIN_CODE_TTL_SECONDS: z.coerce.number().int().positive().default(600),
  MAIL_MODE: z.enum(['console', 'smtp']).default('console'),
  AI_API_KEY: z.string().optional(),
  AI_BASE_URL: z.string().url().default('https://api.openai.com/v1'),
  AI_MODEL: z.string().default('gpt-4.1-mini'),
  OSS_REGION: z.string().optional(),
  OSS_BUCKET: z.string().optional(),
  OSS_ACCESS_KEY_ID: z.string().optional(),
  OSS_ACCESS_KEY_SECRET: z.string().optional(),
  OSS_PUBLIC_BASE_URL: z.preprocess(
    value => value === '' ? undefined : value,
    z.string().url().optional()
  )
})

export interface ServerConfig {
  nodeEnv: 'development' | 'test' | 'production'
  port: number
  appOrigin: string
  databaseUrl: string
  redisUrl: string
  jwtSecret: string
  jwtExpiresIn: string
  loginCodeTtlSeconds: number
  mail: {
    mode: 'console' | 'smtp'
  }
  ai: {
    enabled: boolean
    apiKey?: string
    baseUrl: string
    model: string
  }
  oss: {
    enabled: boolean
    region?: string
    bucket?: string
    accessKeyId?: string
    accessKeySecret?: string
    publicBaseUrl?: string
  }
}

export function parseConfig(environment: NodeJS.ProcessEnv | Record<string, string | undefined>): ServerConfig {
  const parsed = environmentSchema.parse(environment)
  if (parsed.NODE_ENV === 'production' && !parsed.JWT_SECRET) {
    throw new Error('JWT_SECRET is required in production')
  }

  return {
    nodeEnv: parsed.NODE_ENV,
    port: parsed.PORT,
    appOrigin: parsed.APP_ORIGIN,
    databaseUrl: parsed.DATABASE_URL,
    redisUrl: parsed.REDIS_URL,
    jwtSecret: parsed.JWT_SECRET ?? 'development-only-change-me',
    jwtExpiresIn: parsed.JWT_EXPIRES_IN,
    loginCodeTtlSeconds: parsed.LOGIN_CODE_TTL_SECONDS,
    mail: {
      mode: parsed.MAIL_MODE
    },
    ai: {
      enabled: Boolean(parsed.AI_API_KEY),
      apiKey: parsed.AI_API_KEY,
      baseUrl: parsed.AI_BASE_URL.replace(/\/$/, ''),
      model: parsed.AI_MODEL
    },
    oss: {
      enabled: Boolean(parsed.OSS_REGION && parsed.OSS_BUCKET && parsed.OSS_ACCESS_KEY_ID && parsed.OSS_ACCESS_KEY_SECRET),
      region: parsed.OSS_REGION,
      bucket: parsed.OSS_BUCKET,
      accessKeyId: parsed.OSS_ACCESS_KEY_ID,
      accessKeySecret: parsed.OSS_ACCESS_KEY_SECRET,
      publicBaseUrl: parsed.OSS_PUBLIC_BASE_URL?.replace(/\/$/, '')
    }
  }
}

export const config = parseConfig(process.env)
