
import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { Pool } from 'pg';
import { drizzle } from 'drizzle-orm/node-postgres';
import * as schema from './schema.js';

export const DRIZZLE = 'DRIZZLE';

@Module({
  imports: [ConfigModule],
  providers: [
    {
      provide: DRIZZLE,
      inject: [ConfigService],
      useFactory: (config: ConfigService) => {
        const pool = new Pool({
          host: config.getOrThrow<string>('DB_HOST'),
          port: +config.getOrThrow<number>('DB_PORT'),
          user: config.getOrThrow<string>('DB_USER'),
          password: config.getOrThrow<string>('DB_PASSWORD'),
          database: config.getOrThrow<string>('DB_NAME'),
        });

        return drizzle({ client: pool, schema });
      },
    },
  ],
  exports: [DRIZZLE],
})
export class DatabaseModule { }
