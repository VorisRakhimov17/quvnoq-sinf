import { Transform } from 'class-transformer';
import { IsEmail, IsString, Length, MinLength } from 'class-validator';

const trimLower = ({ value }: { value: unknown }) =>
  typeof value === 'string' ? value.trim().toLowerCase() : value;

export class RegisterDto {
  @IsString()
  @Length(2, 80, { message: "Ism 2–80 belgidan iborat bo'lsin" })
  @Transform(({ value }) => (typeof value === 'string' ? value.trim() : value))
  name: string;

  @IsEmail({}, { message: "Email manzili noto'g'ri" })
  @Transform(trimLower)
  email: string;

  @IsString()
  @MinLength(8, { message: "Parol kamida 8 belgidan iborat bo'lsin" })
  password: string;
}

export class LoginDto {
  @IsEmail({}, { message: "Email manzili noto'g'ri" })
  @Transform(trimLower)
  email: string;

  @IsString()
  password: string;
}
