import { Controller, Get, Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { AiModule } from './ai/ai.module';
import { AuthModule } from './auth/auth.module';
import { CreditsModule } from './credits/credits.module';
import { PrismaModule } from './prisma/prisma.module';
import { PresentationsModule } from './presentations/presentations.module';
import { PurchasesModule } from './purchases/purchases.module';
import { PrismaService } from './prisma/prisma.service';
import { QuestionsModule } from './questions/questions.module';
import { ResultsModule } from './results/results.module';

@Controller('health')
class HealthController {
  constructor(private readonly prisma: PrismaService) {}

  @Get()
  async check() {
    await this.prisma.$queryRaw`SELECT 1`;
    return { status: 'ok', db: 'ok', time: new Date().toISOString() };
  }
}

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    PrismaModule,
    CreditsModule,
    AuthModule,
    ResultsModule,
    QuestionsModule,
    AiModule,
    PurchasesModule,
    PresentationsModule,
  ],
  controllers: [HealthController],
})
export class AppModule {}
