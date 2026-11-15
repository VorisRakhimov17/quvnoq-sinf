import { ConflictException, Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import bcrypt from 'bcryptjs';
import { CreditsService, WELCOME_CREDITS } from '../credits/credits.module';
import { PrismaService } from '../prisma/prisma.service';
import { LoginDto, RegisterDto } from './auth.dto';

type TeacherRow = { id: number; name: string; email: string; credits: number };

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwt: JwtService,
    private readonly credits: CreditsService,
  ) {}

  async register(dto: RegisterDto) {
    const exists = await this.prisma.teacher.findUnique({ where: { email: dto.email } });
    if (exists) throw new ConflictException("Bu email bilan akkaunt allaqachon bor");
    const passwordHash = await bcrypt.hash(dto.password, 10);
    const teacher = await this.prisma.teacher.create({
      data: {
        name: dto.name,
        email: dto.email,
        passwordHash,
        credits: WELCOME_CREDITS,
        creditTxs: { create: { amount: WELCOME_CREDITS, reason: 'welcome', note: 'Xush kelibsiz sovg‘asi' } },
      },
    });
    return this.session(teacher);
  }

  async login(dto: LoginDto) {
    const teacher = await this.prisma.teacher.findUnique({ where: { email: dto.email } });
    if (!teacher || !(await bcrypt.compare(dto.password, teacher.passwordHash))) {
      throw new UnauthorizedException("Email yoki parol noto'g'ri");
    }
    return this.session(teacher);
  }

  async me(teacherId: number) {
    const t = await this.prisma.teacher.findUnique({ where: { id: teacherId } });
    if (!t) throw new UnauthorizedException('Akkaunt topilmadi');
    return this.publicTeacher(t);
  }

  private async session(t: TeacherRow) {
    const token = await this.jwt.signAsync({ sub: t.id });
    return { token, teacher: this.publicTeacher(t) };
  }

  private publicTeacher(t: TeacherRow) {
    return { id: t.id, name: t.name, email: t.email, credits: t.credits, isAdmin: this.credits.isAdminEmail(t.email) };
  }
}
