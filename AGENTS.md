# Agent Guidelines for NestJS Template Repository

This file serves as the definitive reference for autonomous agents and developers working on this codebase.

---

## 1. Project Overview

This repository is a production-ready boilerplate backend built with:
- **Framework**: [NestJS](https://nestjs.com/) v12 (Modular Node.js framework)
- **Language**: TypeScript v6 running in ESM mode (`"type": "module"`, NodeNext resolution)
- **Database & ORM**: PostgreSQL with [Drizzle ORM](https://orm.drizzle.team/)
- **Validation**: `class-validator` and `class-transformer`
- **Security**: Password hashing via `argon2` (argon2id variant)
- **Tooling**: `oxlint` for type-aware linting, `vitest` for unit/integration/e2e tests, `tsx` for scripts

### Existing Functionality
- **User Management**: Basic CRUD operations for users (`/api/v1/users`).
- **Role Management**: Roles table schema and seeder (`Admin`, `User`).
- **Response Normalization**: Global interceptor wrapping responses in `{ success, message, data, meta? }`.
- **Global Error Handling**: Global exception filter normalizing error responses.
- **Seeding System**: Standalone TypeScript seed scripts in `src/scripts/`.

---

## 2. Architecture & Execution Flow

### High-Level Architecture
The project applies SOLID principles and modular NestJS architecture:
1. **Modules**: Group features into independent units (`AuthModule`, `UsersModule`, `DatabaseModule`, `SecurityModule`).
2. **Dependency Inversion (DIP)**: Controllers and consumers depend on string DI tokens and TypeScript interfaces (`USERS_SERVICE` / `IUsersService`), not direct concrete classes.
3. **Database Access**: PostgreSQL connection pool managed by `DatabaseModule` exporting the `DRIZZLE` injection token.

### Execution Flow
```text
HTTP Request
     │
     ▼
[Global Prefix: api/v1]
     │
     ▼
[Global ValidationPipe] (whitelist: true, forbidNonWhitelisted: true, transform: true)
     │
     ▼
[Controller] (Route handler, extracts @Param, @Query, @Body)
     │
     ▼
[Service Interface Token: e.g. USERS_SERVICE]
     │
     ▼
[Concrete Service Implementation] (Business logic + Drizzle queries)
     │
     ▼
[Drizzle ORM / pg Pool] (@Inject(DRIZZLE))
     │
     ▼
[ResponseInterceptor] (Wraps output in ApiResponse structure)
     │   (If exception occurs ──► [HttpExceptionFilter])
     ▼
HTTP Response
```

### Key Entry & Configuration Files
- Entry point: [`src/main.ts`](file:///home/ray/Projects/nest-template/src/main.ts)
- Root module: [`src/app.module.ts`](file:///home/ray/Projects/nest-template/src/app.module.ts)
- Configuration loader: [`src/config/index.ts`](file:///home/ray/Projects/nest-template/src/config/index.ts)
- Global Interceptor: [`src/common/interceptors/response.interceptor.ts`](file:///home/ray/Projects/nest-template/src/common/interceptors/response.interceptor.ts)
- Global Filter: [`src/common/filters/http-exception.filter.ts`](file:///home/ray/Projects/nest-template/src/common/filters/http-exception.filter.ts)
- Database Provider: [`src/database/database.module.ts`](file:///home/ray/Projects/nest-template/src/database/database.module.ts)

---

## 3. Layer Responsibilities: Business Logic & Data Access

| Layer | Location | Responsibility | Rules |
|---|---|---|---|
| **Controllers** | `src/modules/<name>/<name>.controller.ts` | Routing, HTTP status, parameter extraction. | **No** business logic, **no** direct DB calls. Delegate strictly to injected service interfaces. |
| **Service Interfaces** | `src/modules/<name>/<name>.service.interface.ts` | Contract and DI Token definition. | Export interface `I<Name>Service` and string token `<NAME>_SERVICE`. |
| **Services** | `src/modules/<name>/<name>.service.ts` | Business logic, transactions, and data access. | Implements `I<Name>Service`. Injects `DRIZZLE` token and helper services (e.g. `PasswordService`). |
| **DTOs** | `src/modules/<name>/dto/` | Request payload definition and validation rules. | Use `class-validator` (`@IsString()`, `@IsNotEmpty()`, etc.) and `class-transformer`. |
| **Database Schemas** | `src/database/schema/` | Drizzle table definitions, relations, and types. | Use CUID2 for text primary keys, snake_case for DB columns, camelCase for TS properties. |
| **Security / Helpers** | `src/security/`, `src/common/utils/` | Reusable cross-cutting capabilities. | Pure utilities or specialized services (e.g., `PasswordService` for argon2id). |

> [!NOTE]
> Currently, data access queries are placed directly in the Service classes via Drizzle ORM (`this.db.select()`, `this.db.insert()`). There is no dedicated repository layer.

---

## 4. How to Add a New API Endpoint / Feature

Follow this checklist when adding a new module or endpoint:

### Step 1: Database Schema (if needed)
1. Create table in `src/database/schema/<name>.schema.ts`:
   ```ts
   import { pgTable, text, varchar, timestamp } from 'drizzle-orm/pg-core';
   import { createId } from '@paralleldrive/cuid2';

   export const items = pgTable('items', {
     id: text('id').primaryKey().$defaultFn(() => createId()),
     name: varchar('name', { length: 100 }).notNull(),
     createdAt: timestamp('created_at').defaultNow().notNull(),
   });
   ```
2. Re-export in [`src/database/schema/index.ts`](file:///home/ray/Projects/nest-template/src/database/schema/index.ts).
3. Update [`src/database/database.types.ts`](file:///home/ray/Projects/nest-template/src/database/database.types.ts) to include the new schema.
4. Run `npm run db:generate` to produce the migration.

### Step 2: DTOs
Create DTOs in `src/modules/<name>/dto/`:
```ts
import { IsNotEmpty, IsString, MaxLength } from 'class-validator';

export class CreateItemDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  name!: string;
}
```

### Step 3: Service Interface & DI Token
Create `src/modules/<name>/<name>.service.interface.ts`:
```ts
import type { CreateItemDto } from './dto/create-item.dto.js';

export interface IItemsService {
  create(data: CreateItemDto): Promise<unknown>;
  findById(id: string): Promise<unknown>;
}

export const ITEMS_SERVICE = 'ITEMS_SERVICE';
```

### Step 4: Service Implementation
Create `src/modules/<name>/<name>.service.ts`:
```ts
import { Inject, Injectable } from '@nestjs/common';
import { eq } from 'drizzle-orm';
import { DRIZZLE } from '../../database/database.module.js';
import type { Database } from '../../database/database.types.js';
import { items } from '../../database/schema/item.schema.js';
import type { IItemsService } from './items.service.interface.js';
import { CreateItemDto } from './dto/create-item.dto.js';

@Injectable()
export class ItemsService implements IItemsService {
  constructor(@Inject(DRIZZLE) private readonly db: Database) {}

  async create(data: CreateItemDto) {
    const result = await this.db.insert(items).values(data).returning();
    return result[0];
  }

  async findById(id: string) {
    const result = await this.db.select().from(items).where(eq(items.id, id));
    return result[0];
  }
}
```

### Step 5: Controller
Create `src/modules/<name>/<name>.controller.ts`:
```ts
import { Body, Controller, Get, Inject, Param, Post } from '@nestjs/common';
import { ITEMS_SERVICE, type IItemsService } from './items.service.interface.js';
import { CreateItemDto } from './dto/create-item.dto.js';

@Controller('items')
export class ItemsController {
  constructor(
    @Inject(ITEMS_SERVICE) private readonly itemsService: IItemsService,
  ) {}

  @Post()
  create(@Body() body: CreateItemDto) {
    return this.itemsService.create(body);
  }

  @Get(':id')
  findById(@Param('id') id: string) {
    return this.itemsService.findById(id);
  }
}
```

### Step 6: Module & Registration
Create `src/modules/<name>/<name>.module.ts`:
```ts
import { Module } from '@nestjs/common';
import { DatabaseModule } from '../../database/database.module.js';
import { ItemsController } from './items.controller.js';
import { ItemsService } from './items.service.js';
import { ITEMS_SERVICE } from './items.service.interface.js';

@Module({
  imports: [DatabaseModule],
  controllers: [ItemsController],
  providers: [
    {
      provide: ITEMS_SERVICE,
      useClass: ItemsService,
    },
  ],
  exports: [ITEMS_SERVICE],
})
export class ItemsModule {}
```
Register `ItemsModule` in `imports` of [`src/app.module.ts`](file:///home/ray/Projects/nest-template/src/app.module.ts).

### Mandatory Code Conventions
- **ESM Relative Imports**: Because `"type": "module"` and `nodenext` are enabled, all relative imports MUST include the `.js` extension (e.g. `import { foo } from './foo.js'`).
- **No Floating Promises**: Avoid unhandled promises; oxlint will fail on floating promises (`typescript/no-floating-promises: error`). Prefix background promises with `void` or `await` them.

---

## 5. Testing & Verification

### Running Tests
- **Unit Tests**: `npm run test` (Vitest with `vitest.config.ts`, searches `**/*.spec.ts`).
- **E2E Tests**: `npm run test:e2e` (Vitest with `vitest.config.e2e.ts`, searches `**/*.e2e-spec.ts`).
- **Linting**: `npm run lint` (`oxlint --type-aware src/ test/`).
- **Build / Typecheck**: `npm run build` (`nest build`).

### Writing Tests with Mock Dependencies
Because services and controllers use DI tokens, tests must provide mock implementations for those tokens:
```ts
import { Test, TestingModule } from '@nestjs/testing';
import { UsersController } from './users.controller.js';
import { USERS_SERVICE } from './users.service.interface.js';

describe('UsersController', () => {
  let controller: UsersController;
  const mockUsersService = {
    findAll: vi.fn(),
    findById: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
    delete: vi.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [UsersController],
      providers: [
        {
          provide: USERS_SERVICE,
          useValue: mockUsersService,
        },
      ],
    }).compile();

    controller = module.get<UsersController>(UsersController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
```

---

## 6. Discrepancies, Architectural Quirks & Uncertainties

The following issues were identified during codebase analysis and require caution:

### 1. Drizzle Migration Out of Sync with Schema (CRITICAL)
- **Verified Fact**: Migration [`drizzle/0000_numerous_lizard.sql`](file:///home/ray/Projects/nest-template/drizzle/0000_numerous_lizard.sql) defines `users` with `id serial`, `bio text`, no `role_id`, and no `password`.
- **Verified Fact**: Schema [`src/database/schema/user.schema.ts`](file:///home/ray/Projects/nest-template/src/database/schema/user.schema.ts) defines `users` with `id text` (CUID2), `roleId text references roles(id)`, and `password varchar(255)`.
- **Impact**: Running `npm run db:migrate` followed by `npm run db:seed` will fail because the columns expected by the seeder and code do not match the generated SQL migration. A fresh migration must be generated via `npm run db:generate`.

### 2. Incomplete Database Type Definition
- **Verified Fact**: [`src/database/database.types.ts`](file:///home/ray/Projects/nest-template/src/database/database.types.ts) imports only `user.schema.js`:
  ```ts
  import * as schema from './schema/user.schema.js';
  export type Database = ReturnType<typeof drizzle<typeof schema>>;
  ```
  It ignores `role.schema.js`.
- **Fix Needed**: Change import to `import * as schema from './schema/index.js';`.

### 3. Plaintext Password in `UsersService.create`
- **Verified Fact**: In [`src/modules/users/users.service.ts`](file:///home/ray/Projects/nest-template/src/modules/users/users.service.ts), `create(data: CreateUserDto)` inserts `data` directly into `users` without invoking `PasswordService.hash()`.
- **Verified Fact**: `UsersModule` imports `SecurityModule`, but `PasswordService` is never injected into `UsersService`.

### 4. Outdated Field in `UpdateUserDto`
- **Verified Fact**: [`src/modules/users/dto/update-user.dto.ts`](file:///home/ray/Projects/nest-template/src/modules/users/dto/update-user.dto.ts) includes `bio?: string`, which was removed from `user.schema.ts`. Sending `bio` causes a validation/Drizzle mismatch.

### 5. Non-Standard Route Naming in `UsersController`
- **Verified Fact**: [`src/modules/users/users.controller.ts`](file:///home/ray/Projects/nest-template/src/modules/users/users.controller.ts) uses suffix actions:
  - `@Get(':id/get')` instead of `@Get(':id')`
  - `@Post('create')` instead of `@Post()`
  - `@Put(':id/update')` instead of `@Put(':id')`
  - `@Delete(':id/delete')` instead of `@Delete(':id')`
- **Assumption / Uncertainty**: Unclear if this is an intentional project-wide RPC-style pattern or an accidental deviation from standard REST guidelines.

### 6. Unimplemented `AuthModule`
- **Verified Fact**: [`src/modules/auth/auth.service.ts`](file:///home/ray/Projects/nest-template/src/modules/auth/auth.service.ts) and [`src/modules/auth/auth.controller.ts`](file:///home/ray/Projects/nest-template/src/modules/auth/auth.controller.ts) are empty class skeletons.
- **Verified Fact**: JWT configuration exists in `src/config/jwt.config.ts`, but `@nestjs/jwt` or passport strategies are not installed or wired up.

### 7. Soft Delete Field Not Honored
- **Verified Fact**: Schema has `deletedAt`, but `UsersService.delete(id)` runs a hard SQL delete (`this.db.delete(users)`), and `findAll`/`findById` queries do not filter out soft-deleted records (`isNull(users.deletedAt)`).
