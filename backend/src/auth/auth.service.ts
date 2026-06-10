import {
  Injectable,
  ConflictException,
  UnauthorizedException,
  Logger,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import * as bcrypt from 'bcrypt';
import { v4 as uuidv4 } from 'uuid';
import { User, UserRole } from './entities/user.entity';
import {
  RegisterDto,
  LoginDto,
  RefreshTokenDto,
  TokenResponseDto,
} from './dto/auth.dto';
import { JwtPayload } from './strategies/jwt.strategy';

const BCRYPT_ROUNDS = 12;

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);

  constructor(
    @InjectRepository(User)
    private readonly userRepo: Repository<User>,
    private readonly jwtService: JwtService,
    private readonly config: ConfigService,
  ) {}

  // ─── Register ──────────────────────────────────────

  async register(dto: RegisterDto): Promise<TokenResponseDto> {
    // Check for existing user
    const existing = await this.userRepo.findOne({
      where: { email: dto.email.toLowerCase().trim() },
    });

    if (existing) {
      throw new ConflictException('Email already registered');
    }

    const passwordHash = await bcrypt.hash(dto.password, BCRYPT_ROUNDS);

    const user = this.userRepo.create({
      email: dto.email.toLowerCase().trim(),
      passwordHash,
      displayName: dto.displayName || null,
      role: UserRole.FREE,
    });

    await this.userRepo.save(user);
    this.logger.log(`New user registered: ${user.email} (${user.id})`);

    return this.generateTokens(user);
  }

  // ─── Login ─────────────────────────────────────────

  async login(dto: LoginDto): Promise<TokenResponseDto> {
    const user = await this.userRepo.findOne({
      where: { email: dto.email.toLowerCase().trim() },
    });

    if (!user) {
      throw new UnauthorizedException('Invalid credentials');
    }

    if (!user.isActive) {
      throw new UnauthorizedException('Account is deactivated');
    }

    const passwordValid = await bcrypt.compare(dto.password, user.passwordHash);
    if (!passwordValid) {
      throw new UnauthorizedException('Invalid credentials');
    }

    this.logger.log(`User logged in: ${user.email}`);
    return this.generateTokens(user);
  }

  // ─── Refresh ───────────────────────────────────────

  async refresh(dto: RefreshTokenDto): Promise<TokenResponseDto> {
    let payload: JwtPayload;

    try {
      payload = this.jwtService.verify<JwtPayload>(dto.refreshToken, {
        secret: this.config.get<string>('app.jwtSecret'),
      });
    } catch {
      throw new UnauthorizedException('Invalid or expired refresh token');
    }

    const user = await this.userRepo.findOne({
      where: { id: payload.sub, isActive: true },
    });

    if (!user) {
      throw new UnauthorizedException('User not found or inactive');
    }

    // Verify stored refresh token hash matches
    if (user.refreshTokenHash) {
      const valid = await bcrypt.compare(
        dto.refreshToken,
        user.refreshTokenHash,
      );
      if (!valid) {
        // Possible token reuse → revoke all
        this.logger.warn(
          `Refresh token reuse detected for user ${user.id}. Revoking.`,
        );
        await this.userRepo.update(user.id, { refreshTokenHash: null as any });
        throw new UnauthorizedException(
          'Refresh token revoked. Please log in again.',
        );
      }
    }

    return this.generateTokens(user);
  }

  // ─── Logout (revoke refresh token) ────────────────

  async logout(userId: string): Promise<void> {
    await this.userRepo.update(userId, { refreshTokenHash: null as any });
    this.logger.log(`User logged out: ${userId}`);
  }

  // ─── Token Generation ─────────────────────────────

  private async generateTokens(user: User): Promise<TokenResponseDto> {
    const payload: JwtPayload = {
      sub: user.id,
      email: user.email,
      role: user.role,
    };

    const accessToken = this.jwtService.sign(
      { ...payload } as Record<string, unknown>,
      { expiresIn: (this.config.get<string>('app.jwtExpiration') || '15m') as any },
    );

    const refreshToken = this.jwtService.sign(
      { ...payload } as Record<string, unknown>,
      { expiresIn: (this.config.get<string>('app.jwtRefreshExpiration') || '7d') as any },
    );

    // Store hashed refresh token for rotation detection
    const refreshTokenHash = await bcrypt.hash(refreshToken, BCRYPT_ROUNDS);
    await this.userRepo.update(user.id, { refreshTokenHash });

    return {
      accessToken,
      refreshToken,
      expiresIn: this.config.get<string>('app.jwtExpiration') || '15m',
      user: {
        id: user.id,
        email: user.email,
        displayName: user.displayName,
        role: user.role,
      },
    };
  }
}
