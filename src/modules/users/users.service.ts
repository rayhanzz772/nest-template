import {
  Inject,
  Injectable,
  NotFoundException,
  ConflictException,
} from '@nestjs/common';
import { DRIZZLE } from '../../database/database.module.js';
import { users } from '../../database/schema/user.schema.js';
import { roles } from '../../database/schema/role.schema.js';
import type { Database } from '../../database/database.types.js';
import { count, eq, and, isNull, desc } from 'drizzle-orm';
import { CreateUserDto } from './dto/create-user.dto.js';
import { UpdateUserDto } from './dto/update-user.dto.js';
import { PaginationQueryDto } from '../../common/dto/pagination-query.dto.js';
import { createPaginationMeta } from '../../common/utils/pagination.util.js';
import { apiResponse } from '../../common/dto/api-response.dto.js';
import type { IUsersService } from './users.service.interface.js';
import { PasswordService } from '../../security/password.service.js';

@Injectable()
export class UsersService implements IUsersService {
  constructor(
    @Inject(DRIZZLE)
    private readonly db: Database,
    private readonly passwordService: PasswordService,
  ) {}

  async findAll(query: PaginationQueryDto) {
    const { page, limit, offset } = query;

    const [data, totalResult] = await Promise.all([
      this.db
        .select({
          id: users.id,
          name: users.name,
          email: users.email,
          createdAt: users.createdAt,
          role: {
            id: roles.id,
            name: roles.name,
            code: roles.code,
          },
        })
        .from(users)
        .where(isNull(users.deletedAt))
        .leftJoin(roles, eq(users.roleId, roles.id))
        .limit(limit)
        .orderBy(desc(users.createdAt), users.id)
        .offset(offset),
      this.db
        .select({ count: count() })
        .from(users)
        .where(isNull(users.deletedAt)),
    ]);

    const totalItems = Number(totalResult[0]?.count ?? 0);
    const meta = createPaginationMeta(page, limit, totalItems);

    return apiResponse(data, 'Users retrieved successfully', meta);
  }

  async findById(id: string) {
    const result = await this.db
      .select({
        id: users.id,
        name: users.name,
        email: users.email,
        createdAt: users.createdAt,
        role: {
          id: roles.id,
          name: roles.name,
          code: roles.code,
        },
      })
      .from(users)
      .leftJoin(roles, eq(users.roleId, roles.id))
      .where(and(eq(users.id, id), isNull(users.deletedAt)));

    if (!result[0]) {
      throw new NotFoundException(`User with id ${id} not found`);
    }

    return apiResponse(result[0], 'User retrieved successfully');
  }

  async create(data: CreateUserDto) {
    const normalizedEmail = data.email.trim().toLowerCase();

    const [existingUser] = await this.db
      .select({ id: users.id })
      .from(users)
      .where(and(eq(users.email, normalizedEmail), isNull(users.deletedAt)))
      .limit(1);

    if (existingUser) {
      throw new ConflictException('Email already registered');
    }

    const hashedPassword = await this.passwordService.hash(data.password);

    try {
      const [createdUser] = await this.db
        .insert(users)
        .values({
          name: data.name.trim(),
          email: normalizedEmail,
          password: hashedPassword,
          roleId: data.roleId,
        })
        .returning({
          id: users.id,
          name: users.name,
          email: users.email,
          roleId: users.roleId,
          createdAt: users.createdAt,
        });

      return apiResponse(createdUser, 'User created successfully');
    } catch (error) {
      const pgCode =
        (error as { code?: string }).code ??
        (error as { cause?: { code?: string } }).cause?.code;

      if (pgCode === '23505') {
        throw new ConflictException('Email already registered');
      }

      throw error;
    }
  }

  async update(id: string, data: UpdateUserDto) {
    const normalizedEmail = data.email.trim().toLowerCase();

    const emailFilter = normalizedEmail
      ? and(eq(users.email, normalizedEmail), isNull(users.deletedAt))
      : undefined;

    const [existingUser] = await this.db
      .select({ id: users.id })
      .from(users)
      .where(emailFilter)
      .limit(1);

    if (existingUser && existingUser.id !== id) {
      throw new ConflictException('Email already registered');
    }

    try {
      const [updatedUser] = await this.db
        .update(users)
        .set({
          name: data.name?.trim(),
          email: normalizedEmail,
        })
        .where(and(eq(users.id, id), isNull(users.deletedAt)))
        .returning({
          id: users.id,
          name: users.name,
          email: users.email,
          roleId: users.roleId,
          createdAt: users.createdAt,
        });

      if (!updatedUser) {
        throw new NotFoundException(`User with id ${id} not found`);
      }

      return apiResponse(updatedUser, 'User updated successfully');
    } catch (error) {
      const pgCode =
        (error as { code?: string }).code ??
        (error as { cause?: { code?: string } }).cause?.code;

      if (pgCode === '23505') {
        throw new ConflictException('Email already registered');
      }

      throw error;
    }
  }

  async delete(id: string) {
    const [deletedUser] = await this.db
      .update(users)
      .set({ deletedAt: new Date() })
      .where(and(eq(users.id, id), isNull(users.deletedAt)))
      .returning({
        id: users.id,
        deletedAt: users.deletedAt,
      });

    if (!deletedUser) {
      throw new NotFoundException(`User with id ${id} not found`);
    }

    return apiResponse(deletedUser, 'User deleted successfully');
  }
}
