import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  Get,
  Injectable,
  Module,
  NotFoundException,
  Param,
  ParseIntPipe,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { Subject } from '@prisma/client';
import { Type } from 'class-transformer';
import {
  ArrayMaxSize,
  ArrayMinSize,
  IsArray,
  IsIn,
  IsInt,
  IsOptional,
  IsString,
  Length,
  ValidateNested,
  Max,
  MaxLength,
  Min,
} from 'class-validator';
import { JwtAuthGuard, TeacherId } from '../auth/jwt.guard';
import { PrismaService } from '../prisma/prisma.service';

const SUBJECTS = ['math', 'lang', 'nature'] as const;

export class CreateQuestionDto {
  @IsIn(SUBJECTS) subject: Subject;
  @IsInt() @Min(1) @Max(4) grade: number;
  @IsString() @Length(1, 300) prompt: string;
  @IsOptional() @IsString() @MaxLength(16) emoji?: string;
  @IsArray()
  @ArrayMinSize(2, { message: "Kamida 2 ta javob varianti bo'lsin" })
  @ArrayMaxSize(4, { message: "Ko'pi bilan 4 ta javob varianti" })
  @IsString({ each: true })
  @Length(1, 60, { each: true })
  options: string[];
  @IsString() @Length(1, 60) answer: string;
  @IsOptional() @IsString() @MaxLength(300) explain?: string;
  @IsOptional() @IsString() @MaxLength(200) topic?: string;
}

export class BulkQuestionsDto {
  @IsArray()
  @ArrayMinSize(1)
  @ArrayMaxSize(30)
  @ValidateNested({ each: true })
  @Type(() => CreateQuestionDto)
  questions: CreateQuestionDto[];
}

export class ListQuestionsQuery {
  @IsOptional() @IsIn(SUBJECTS) subject?: Subject;
  @IsOptional() @Type(() => Number) @IsInt() @Min(1) @Max(4) grade?: number;
  @IsOptional() @IsString() @MaxLength(200) topic?: string;
}

@Injectable()
export class QuestionsService {
  constructor(private readonly prisma: PrismaService) {}

  list(teacherId: number, q: ListQuestionsQuery) {
    return this.prisma.question.findMany({
      where: { teacherId, subject: q.subject, grade: q.grade, topic: q.topic },
      orderBy: { createdAt: 'desc' },
    });
  }

  private prepare(teacherId: number, dto: CreateQuestionDto, n?: number) {
    const at = n === undefined ? '' : `${n}-savol: `;
    const options = dto.options.map((o) => o.trim());
    const answer = dto.answer.trim();
    if (new Set(options).size !== options.length) {
      throw new BadRequestException(at + 'Javob variantlari takrorlanmasin');
    }
    if (!options.includes(answer)) {
      throw new BadRequestException(at + "To'g'ri javob variantlar ichida bo'lishi kerak");
    }
    const topic = dto.topic?.trim() || undefined;
    return { ...dto, prompt: dto.prompt.trim(), options, answer, topic, teacherId };
  }

  create(teacherId: number, dto: CreateQuestionDto) {
    return this.prisma.question.create({ data: this.prepare(teacherId, dto) });
  }

  async createMany(teacherId: number, dto: BulkQuestionsDto) {
    const data = dto.questions.map((q, i) => this.prepare(teacherId, q, i + 1));
    const { count } = await this.prisma.question.createMany({ data });
    return { created: count };
  }

  async remove(teacherId: number, id: number) {
    const { count } = await this.prisma.question.deleteMany({ where: { id, teacherId } });
    if (count === 0) throw new NotFoundException('Savol topilmadi');
    return { deleted: true };
  }
}

@Controller('questions')
@UseGuards(JwtAuthGuard)
export class QuestionsController {
  constructor(private readonly questions: QuestionsService) {}

  @Get()
  list(@TeacherId() teacherId: number, @Query() q: ListQuestionsQuery) {
    return this.questions.list(teacherId, q);
  }

  @Post('bulk')
  createMany(@TeacherId() teacherId: number, @Body() dto: BulkQuestionsDto) {
    return this.questions.createMany(teacherId, dto);
  }

  @Post()
  create(@TeacherId() teacherId: number, @Body() dto: CreateQuestionDto) {
    return this.questions.create(teacherId, dto);
  }

  @Delete(':id')
  remove(@TeacherId() teacherId: number, @Param('id', ParseIntPipe) id: number) {
    return this.questions.remove(teacherId, id);
  }
}

@Module({
  controllers: [QuestionsController],
  providers: [QuestionsService],
})
export class QuestionsModule {}
