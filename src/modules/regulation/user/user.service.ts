import { Injectable } from '@nestjs/common';
import * as argon2 from 'argon2';
import {
  UserRepositoryService,
  EmployeeRepositoryService,
} from '../../../common/repository/index';
import { CreateUserDto } from './dtos/index';

@Injectable()
export class UserService {
  constructor(
    private readonly userRepository: UserRepositoryService,
    private readonly employeeRepository: EmployeeRepositoryService,
  ) {}

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
    const tenant = await this.userRepository.checkTenantActive(dto.tenantId);

    if (!tenant) {
      throw new Error('Tenant not found or inactive.');
    }

    // 2) verify an existing active employee with same document
    const existingEmployee = await this.employeeRepository.findActiveByDocument(
      dto.document,
      dto.tenantId,
    );

    if (!existingEmployee) {
      throw new Error(
        'This user document is not registered as an active employee.',
      );
    }

    // 3) hash password
    const passwordHash = await this.hashPassword(dto.password);

    // 4) create user record
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

  async changeUserPassword(
    document: string,
    oldPassword: string,
    newPassword: string,
  ) {
    const user = await this.userRepository.findActiveByDocument(document);

    if (!user) {
      throw new Error('User not found or inactive.');
    }

    const tenant = await this.userRepository.checkTenantActive(user.tenantId);

    if (!tenant) {
      throw new Error('Tenant not found or inactive.');
    }

    const isPasswordValid = await argon2.verify(user.passwordHash, oldPassword);

    if (!isPasswordValid) {
      throw new Error('Invalid current password.');
    }

    const newPasswordHash = await this.hashPassword(newPassword);

    return await this.userRepository.updateUserPassword(
      user.id,
      newPasswordHash,
    );
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
