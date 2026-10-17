
import { Inject, Injectable } from '@nestjs/common';
import { DRIZZLE } from '../db/db.module.js';
import { users } from '../db/schema.js';
import type { Database } from '../db/db.types.js';
import { eq } from 'drizzle-orm';
import { CreateUserDto } from './dto/create-user.dto.js';
import { UpdateUserDto } from './dto/update-user.dto.js';

@Injectable()
export class UsersService {
  constructor(
    @Inject(DRIZZLE)
    private readonly db: Database,
  ) { }

  async findAll() {
    return this.db.select().from(users);
  }

  async findById(id: string) {
    const result = await this.db.select().from(users).where(eq(users.id, id));
    return result[0];
  }

  async create(data: CreateUserDto) {
    const result = await this.db.insert(users).values(data).returning();
    return result[0];
  }

  async update(id: string, data: UpdateUserDto) {
    const result = await this.db.update(users).set(data).where(eq(users.id, id)).returning();
    return result[0];
  }

  async delete(id: string) {
    const result = await this.db.delete(users).where(eq(users.id, id)).returning();
    return result[0];
  }
}
