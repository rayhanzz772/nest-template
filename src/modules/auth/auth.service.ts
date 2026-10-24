import {
  ConflictException,
  Inject,
  Injectable,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { eq } from 'drizzle-orm';
import { DRIZZLE } from '../../database/database.module.js';
import type { Database } from '../../database/database.types.js';
import { users } from '../../database/schema/user.schema.js';
import { roles } from '../../database/schema/role.schema.js';
import { rolePermissions } from '../../database/schema/role-permission.schema.js';
import { permissions } from '../../database/schema/permission.schema.js';
import { PasswordService } from '../../security/password.service.js';
import type { IAuthService } from './auth.service.interface.js';
import type { RegisterDto } from './dto/register.dto.js';
import type { LoginDto } from './dto/login.dto.js';
import type { JwtConfig } from '../../config/jwt.config.js';

@Injectable()
export class AuthService implements IAuthService {
  constructor(
    @Inject(DRIZZLE)
    private readonly db: Database,
    private readonly passwordService: PasswordService,
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
  ) {}

  async register(dto: RegisterDto) {
    const existingUser = await this.db
      .select({ id: users.id })
      .from(users)
      .where(eq(users.email, dto.email.toLowerCase()))
      .limit(1);

    if (existingUser.length > 0) {
      throw new ConflictException('Email already registered');
    }

    // Default to USER role
    let defaultRole = (
      await this.db.select().from(roles).where(eq(roles.code, 'USER')).limit(1)
    )[0];

    if (!defaultRole) {
      // Fallback to any available role if USER not found
      const availableRoles = await this.db.select().from(roles).limit(1);
      defaultRole = availableRoles[0];
    }

    if (!defaultRole) {
      throw new NotFoundException('No default role available in system');
    }

    const hashedPassword = await this.passwordService.hash(dto.password);

    const createdUsers = await this.db
      .insert(users)
      .values({
        name: dto.name,
        email: dto.email.toLowerCase(),
        password: hashedPassword,
        roleId: defaultRole.id,
      })
      .returning({
        id: users.id,
        name: users.name,
        email: users.email,
        roleId: users.roleId,
        createdAt: users.createdAt,
      });

    return createdUsers[0];
  }

  async login(dto: LoginDto) {
    const matchedUsers = await this.db
      .select({
        id: users.id,
        name: users.name,
        email: users.email,
        password: users.password,
        roleId: users.roleId,
        role: {
          id: roles.id,
          name: roles.name,
          code: roles.code,
        },
      })
      .from(users)
      .leftJoin(roles, eq(users.roleId, roles.id))
      .where(eq(users.email, dto.email.toLowerCase()))
      .limit(1);

    const user = matchedUsers[0];

    if (!user) {
      throw new UnauthorizedException('Invalid credentials');
    }

    const isPasswordValid = await this.passwordService.verify(
      user.password,
      dto.password,
    );

    if (!isPasswordValid) {
      throw new UnauthorizedException('Invalid credentials');
    }

    const jwtConfig = this.configService.get<JwtConfig>('jwt');
    const secret = jwtConfig?.secret ?? process.env.JWT_SECRET ?? 'supersecretjwtkey_change_in_production';
    const expiresIn = jwtConfig?.expiresIn ?? '1d';
    const refreshSecret =
      jwtConfig?.refreshSecret ??
      process.env.JWT_REFRESH_SECRET ??
      'supersecretrefreshkey_change_in_production';
    const refreshExpiresIn = jwtConfig?.refreshExpiresIn ?? '7d';

    const payload = {
      sub: user.id,
      email: user.email,
      role: user.role?.code ?? 'USER',
    };

    const [accessToken, refreshToken] = await Promise.all([
      this.jwtService.signAsync(payload, {
        secret,
        expiresIn: expiresIn as `${number}${'s' | 'm' | 'h' | 'd'}`,
      }),
      this.jwtService.signAsync(payload, {
        secret: refreshSecret,
        expiresIn: refreshExpiresIn as `${number}${'s' | 'm' | 'h' | 'd'}`,
      }),
    ]);

    return {
      accessToken,
      refreshToken,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
      },
    };
  }

  async getProfile(userId: string) {
    const userResult = await this.db
      .select({
        id: users.id,
        name: users.name,
        email: users.email,
        createdAt: users.createdAt,
        role: {
          id: roles.id,
          name: roles.name,
          code: roles.code,
          description: roles.description,
        },
      })
      .from(users)
      .leftJoin(roles, eq(users.roleId, roles.id))
      .where(eq(users.id, userId))
      .limit(1);

    const user = userResult[0];
    if (!user) {
      throw new NotFoundException('User not found');
    }

    let userPermissions: Array<{ id: string; name: string; code: string }> = [];
    if (user.role?.id) {
      const perms = await this.db
        .select({
          id: permissions.id,
          name: permissions.name,
          code: permissions.code,
        })
        .from(rolePermissions)
        .innerJoin(permissions, eq(rolePermissions.permissionId, permissions.id))
        .where(eq(rolePermissions.roleId, user.role.id));

      userPermissions = perms;
    }

    return {
      ...user,
      permissions: userPermissions,
    };
  }
}
