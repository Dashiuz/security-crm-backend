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
    // 1) Business validation: verify an existing active employee with same document
    // tenantId is handled by Prisma Extension
    const employee = await this.employeeRepository.findActiveByDocument(
      dto.document,
    );

    if (!employee) {
      throw new BadRequestException(
        'No active employee found with the provided document.',
      );
    }

    // 2) Check if user already exists
    const existingUser = await this.userRepository.findActiveByDocument(
      dto.document,
    );

    if (existingUser) {
      throw new BadRequestException('User already exists for this employee.');
    }

    // 3) Hash password
    const passwordHash = await this.hashPassword(dto.password);

    // 4) create user record - tenantId is handled by Prisma Extension
    const user = await this.userRepository.createUser({
      passwordHash,
      fullName: employee.fullName,
      document: dto.document,
      department: employee.departmentRef?.name || 'N/A',
      position: employee.positionRef?.name || 'N/A',
    } as any);

    return this.mapUserToResponse(user);
  }

  async changeUserPassword(
    document: string,
    oldPassword: string,
    newPassword: string,
  ): Promise<any> {
    const user = await this.userRepository.findActiveByDocument(document);

    if (!user) {
      throw new NotFoundException('User not found or inactive in this tenant.');
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
    tenantId: string,
  ): Promise<UserResponseDto | null> {
    const user = await this.userRepository.findActiveByDocument(document);
    return user ? this.mapUserToResponse(user) : null;
  }

  async findAll(): Promise<UserResponseDto[]> {
    const users = await this.userRepository.findAll();
    return users.map((u) => this.mapUserToResponse(u));
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
