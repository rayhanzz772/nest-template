import { Controller, Get, Param, Post, Body, Put, Delete, Query } from '@nestjs/common';
import { UsersService } from './users.service.js';
import { CreateUserDto } from './dto/create-user.dto.js';
import { UpdateUserDto } from './dto/update-user.dto.js';
import { PaginationQueryDto } from '../../common/dto/pagination-query.dto.js';

@Controller('users')
export class UsersController {
  constructor(private readonly usersService: UsersService) { }

  @Get()
  findAll(@Query() query: PaginationQueryDto) {
    return this.usersService.findAll(query);
  }

  @Get(':id/get')
  findById(@Param('id') id: string) {
    return this.usersService.findById(id);
  }

  @Post('create')
  create(@Body() body: CreateUserDto) {
    return this.usersService.create(body);
  }

  @Put(':id/update')
  update(@Param('id') id: string, @Body() body: UpdateUserDto) {
    return this.usersService.update(id, body);
  }

  @Delete(':id/delete')
  delete(@Param('id') id: string) {
    return this.usersService.delete(id);
  }
}
