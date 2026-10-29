import { Controller, Get, Param, Post, Body, Patch, Delete, Query, Inject } from '@nestjs/common';
import { CreateUserDto } from './dto/create-user.dto.js';
import { UpdateUserDto } from './dto/update-user.dto.js';
import { PaginationQueryDto } from '../../common/dto/pagination-query.dto.js';
import { RequirePermissions } from '../../common/decorators/permissions.decorator.js';
import { USERS_SERVICE } from './users.service.interface.js';
import type { IUsersService } from './users.service.interface.js';

@Controller('users')
export class UsersController {
  constructor(
    @Inject(USERS_SERVICE)
    private readonly usersService: IUsersService,
  ) { }

  @Get()
  @RequirePermissions('users:read')
  findAll(@Query() query: PaginationQueryDto) {
    return this.usersService.findAll(query);
  }

  @Get(':id')
  @RequirePermissions('users:read')
  findById(@Param('id') id: string) {
    return this.usersService.findById(id);
  }

  @Post()
  @RequirePermissions('users:create')
  create(@Body() body: CreateUserDto) {
    return this.usersService.create(body);
  }

  @Patch(':id')
  @RequirePermissions('users:update')
  update(@Param('id') id: string, @Body() body: UpdateUserDto) {
    return this.usersService.update(id, body);
  }

  @Delete(':id')
  @RequirePermissions('users:delete')
  delete(@Param('id') id: string) {
    return this.usersService.delete(id);
  }
}
