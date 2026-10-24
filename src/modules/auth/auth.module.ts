import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { JwtModule } from '@nestjs/jwt';
import { APP_GUARD } from '@nestjs/core';
import { AuthService } from './auth.service.js';
import { AuthController } from './auth.controller.js';
import { AUTH_SERVICE } from './auth.service.interface.js';
import { DatabaseModule } from '../../database/database.module.js';
import { SecurityModule } from '../../security/security.module.js';
import { AuthGuard } from '../../common/guards/auth.guard.js';

@Module({
  imports: [
    DatabaseModule,
    SecurityModule,
    ConfigModule,
    JwtModule.registerAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        secret:
          config.get<string>('jwt.secret') ??
          process.env.JWT_SECRET ??
          'supersecretjwtkey_change_in_production',
        signOptions: {
          expiresIn: (config.get<string>('jwt.expiresIn') ?? '1d') as `${number}${'s' | 'm' | 'h' | 'd'}`,
        },
      }),
    }),
  ],
  controllers: [AuthController],
  providers: [
    {
      provide: AUTH_SERVICE,
      useClass: AuthService,
    },
    {
      provide: APP_GUARD,
      useClass: AuthGuard,
    },
  ],
  exports: [AUTH_SERVICE, JwtModule],
})
export class AuthModule {}
