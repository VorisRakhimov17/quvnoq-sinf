import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
  createParamDecorator,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';

type AuthedRequest = { headers: Record<string, string | undefined>; teacherId?: number };

/** Faqat tizimga kirgan o'qituvchilarni o'tkazadi. */
@Injectable()
export class JwtAuthGuard implements CanActivate {
  constructor(private readonly jwt: JwtService) {}

  async canActivate(ctx: ExecutionContext): Promise<boolean> {
    const req = ctx.switchToHttp().getRequest<AuthedRequest>();
    const header = req.headers['authorization'];
    if (!header?.startsWith('Bearer ')) throw new UnauthorizedException('Avval tizimga kiring');
    try {
      const payload = await this.jwt.verifyAsync<{ sub: number }>(header.slice(7));
      req.teacherId = payload.sub;
      return true;
    } catch {
      throw new UnauthorizedException('Sessiya tugagan, qaytadan kiring');
    }
  }
}

/** Kirgan o'qituvchining id raqami. */
export const TeacherId = createParamDecorator(
  (_: unknown, ctx: ExecutionContext) => ctx.switchToHttp().getRequest<AuthedRequest>().teacherId,
);
