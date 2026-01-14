import { Injectable } from '@nestjs/common';
import * as argon2 from 'argon2';
import { UserRepositoryService } from '../../../common/repository/index';
import { CreateUserDto, UpdateUserDto } from './dtos/index';

@Injectable()
export class UserService {
  constructor(private readonly userRepository: UserRepositoryService) {}

  private async hashPassword(password: string): Promise<string> {
    // Optional: basic validation
    if (!password || password.length < 8) {
      throw new Error('Password must be at least 8 characters.');
    }

    const hash = await argon2.hash(password, {
      type: argon2.argon2id, // Recommended variant
      memoryCost: 19456, // ~19 MB (tune for your server)
      timeCost: 2, // iterations
      parallelism: 1, // threads
    });

    return hash; // store this in DB as passwordHash
  }

  async createUser(dto: CreateUserDto) {
    // 1) verify tenant exists and is active
    // TODO: mover la función de checkTeanantActive al servicio de Auth, De esta forma se puede reutilizar en el servicio de User y Employee sin que sea tan enredado

    // hash password
    const passwordHash = await this.hashPassword(dto.password);

    return await this.userRepository.createUser({
      tenant: { connect: { id: dto.tenantId } },
      passwordHash,
      fullName: dto.fullName,
      document: dto.document,
      department: dto.department,
      position: dto.position,
      isActive: dto.isActive,
    });
  }

  async findActiveByDocument(document: string) {
    return await this.userRepository.findActiveByDocument(document);
  }

  async getUserPermissions(userId: string): Promise<string[]> {
    return await this.userRepository.getUserPermissions(userId);
  }

  async getMe(userId: string) {
    return await this.userRepository.getMe(userId);
  }
}
