import {
  Injectable,
  BadRequestException,
  NotFoundException,
} from '@nestjs/common';
import * as argon2 from 'argon2';
import {
  UserRepositoryService,
  EmployeeRepositoryService,
} from '../../../common/repository/index';
import { CreateUserDto, UserResponseDto } from './dtos/index';

@Injectable()
export class UserService {
  constructor(
    private readonly userRepository: UserRepositoryService,
    private readonly employeeRepository: EmployeeRepositoryService,
  ) {}

  private mapUserToResponse(row: any): UserResponseDto {
    return {
      id: row.id,
      fullName: row.fullName,
      document: row.document,
      department: row.department,
      position: row.position,
      tenantId: row.tenantId,
      isActive: row.isActive,
      isFirstLogin: row.isFirstLogin ?? false,
    };
  }

  private async hashPassword(password: string): Promise<string> {
    // Optional: basic validation
    if (!password || password.length < 8) {
      throw new BadRequestException('Password must be at least 8 characters.');
    }

    const hash = await argon2.hash(password, {
      type: argon2.argon2id, // Recommended variant
      memoryCost: 19456, // ~19 MB (tune for your server)
      timeCost: 2, // iterations
      parallelism: 1, // threads
    });

    return hash; // store this in DB as passwordHash
  }

  async createUser(dto: CreateUserDto): Promise<UserResponseDto> {
    // 1) verify tenant exists and is active
    const tenant = await this.userRepository.checkTenantActive(dto.tenantId);

    if (!tenant) {
      throw new NotFoundException('Tenant not found or inactive.');
    }

    // 2) verify an existing active employee with same document
    const existingEmployee = await this.employeeRepository.findActiveByDocument(
      dto.document,
      dto.tenantId,
    );

    if (!existingEmployee) {
      throw new BadRequestException(
        'This user document is not registered as an active employee.',
      );
    }

    // 3) hash password
    const passwordHash = await this.hashPassword(dto.password);

    // 4) create user record
    const user = await this.userRepository.createUser({
      tenant: { connect: { id: dto.tenantId } },
      passwordHash,
      fullName: dto.fullName,
      document: dto.document,
      department: dto.department,
      position: dto.position,
      isActive: dto.isActive,
    });

    return this.mapUserToResponse(user);
  }

  async changeUserPassword(
    document: string,
    oldPassword: string,
    newPassword: string,
  ): Promise<any> {
    const user = await this.userRepository.findActiveByDocument(document);

    if (!user) {
      throw new NotFoundException('User not found or inactive.');
    }

    const tenant = await this.userRepository.checkTenantActive(user.tenantId);

    if (!tenant) {
      throw new NotFoundException('Tenant not found or inactive.');
    }

    const isPasswordValid = await argon2.verify(user.passwordHash, oldPassword);

    if (!isPasswordValid) {
      throw new BadRequestException('Invalid current password.');
    }

    const newPasswordHash = await this.hashPassword(newPassword);

    await this.userRepository.updateUserPassword(user.id, newPasswordHash);

    return { message: 'Password changed successfully' };
  }

  async findActiveByDocument(
    document: string,
  ): Promise<UserResponseDto | null> {
    const user = await this.userRepository.findActiveByDocument(document);
    return user ? this.mapUserToResponse(user) : null;
  }

  async getUserPermissions(userId: string): Promise<string[]> {
    return await this.userRepository.getUserPermissions(userId);
  }

  async getMe(userId: string): Promise<UserResponseDto> {
    const user = await this.userRepository.getMe(userId);
    if (!user) throw new NotFoundException('User not found');
    return this.mapUserToResponse(user);
  }
}
