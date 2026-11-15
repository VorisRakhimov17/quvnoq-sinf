import { Body, Controller, Get, Injectable, Module, Post, UseGuards } from '@nestjs/common';
import { IsBoolean, IsInt, IsOptional, IsString, Max, MaxLength, Min } from 'class-validator';
import { JwtAuthGuard, TeacherId } from '../auth/jwt.guard';
import { PrismaService } from '../prisma/prisma.service';

export class CreateResultDto {
  @IsString() @MaxLength(40) gameId: string;
  @IsInt() @Min(1) @Max(4) grade: number;
  @IsBoolean() teams: boolean;
  @IsInt() @Min(1) @Max(50) total: number;
  @IsInt() @Min(0) @Max(50) score: number;
  @IsOptional() @IsInt() @Min(0) team1?: number;
  @IsOptional() @IsInt() @Min(0) team2?: number;
}

@Injectable()
export class ResultsService {
  constructor(private readonly prisma: PrismaService) {}

  create(teacherId: number, dto: CreateResultDto) {
    return this.prisma.gameResult.create({ data: { ...dto, teacherId } });
  }

  list(teacherId: number) {
    return this.prisma.gameResult.findMany({
      where: { teacherId },
      orderBy: { createdAt: 'desc' },
      take: 100,
    });
  }
}

@Controller('results')
@UseGuards(JwtAuthGuard)
export class ResultsController {
  constructor(private readonly results: ResultsService) {}

  @Post()
  create(@TeacherId() teacherId: number, @Body() dto: CreateResultDto) {
    return this.results.create(teacherId, dto);
  }

  @Get()
  list(@TeacherId() teacherId: number) {
    return this.results.list(teacherId);
  }
}

@Module({
  controllers: [ResultsController],
  providers: [ResultsService],
})
export class ResultsModule {}
