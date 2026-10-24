import type { RegisterDto } from './dto/register.dto.js';
import type { LoginDto } from './dto/login.dto.js';

export interface IAuthService {
  register(dto: RegisterDto): Promise<unknown>;
  login(dto: LoginDto): Promise<unknown>;
  getProfile(userId: string): Promise<unknown>;
}

export const AUTH_SERVICE = 'AUTH_SERVICE';
