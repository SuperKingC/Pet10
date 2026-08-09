import pg from 'pg'
import { config } from '../config.js'
import { configurePostgresTypes } from './pgTypes.js'

configurePostgresTypes(pg.types)

export const pool = new pg.Pool({
  connectionString: config.databaseUrl,
  max: 10
})
