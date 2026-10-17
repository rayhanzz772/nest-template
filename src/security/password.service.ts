import { Injectable } from '@nestjs/common';
import * as argon2 from 'argon2';

@Injectable()
export class PasswordService {
  static async hash(password: string): Promise<string> {
    return argon2.hash(password, {
      type: argon2.argon2id,
    });
  }

  static async verify(
    hash: string,
    password: string,
  ): Promise<boolean> {
    try {
      return await argon2.verify(hash, password);
    } catch {
      return false;
    }
  }

  async hash(password: string): Promise<string> {
    return PasswordService.hash(password);
  }

  async verify(
    hash: string,
    password: string,
  ): Promise<boolean> {
    return PasswordService.verify(hash, password);
  }
}