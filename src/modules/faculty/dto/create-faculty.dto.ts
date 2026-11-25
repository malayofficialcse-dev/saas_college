import { IsNotEmpty, IsString, IsEmail, MinLength, IsOptional, IsUUID, IsInt, Min } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateFacultyDto {
  @ApiProperty({ example: 'prof.anita@campus.edu' })
  @IsEmail()
  email!: string;

  @ApiProperty({ example: 'FacultyPass123!' })
  @IsString()
  @MinLength(8)
  password!: string;

  @ApiProperty({ example: 'Dr. Anita' })
  @IsString()
  @IsNotEmpty()
  firstName!: string;

  @ApiProperty({ example: 'Deshmukh' })
  @IsString()
  @IsNotEmpty()
  lastName!: string;

  @ApiPropertyOptional({ example: '+919876543210' })
  @IsString()
  @IsOptional()
  phoneNumber?: string;

  @ApiProperty({ example: 'dept-uuid' })
  @IsUUID()
  @IsNotEmpty()
  departmentId!: string;

  @ApiProperty({ example: 'FAC-CSE-007' })
  @IsString()
  @IsNotEmpty()
  employeeCode!: string;

  @ApiProperty({ example: 'Associate Professor' })
  @IsString()
  @IsNotEmpty()
  designation!: string;

  @ApiPropertyOptional({ example: 'Machine Learning & Cloud Systems' })
  @IsString()
  @IsOptional()
  specialization?: string;

  @ApiPropertyOptional({ example: 15, default: 15 })
  @IsInt()
  @Min(1)
  @IsOptional()
  maxActiveQueries?: number;
}

export class UpdateFacultyDto {
  @ApiPropertyOptional({ example: 'Dr. Anita' })
  @IsString()
  @IsOptional()
  firstName?: string;

  @ApiPropertyOptional({ example: 'Deshmukh' })
  @IsString()
  @IsOptional()
  lastName?: string;

  @ApiPropertyOptional({ example: '+919876543210' })
  @IsString()
  @IsOptional()
  phoneNumber?: string;

  @ApiPropertyOptional({ example: 'Professor' })
  @IsString()
  @IsOptional()
  designation?: string;

  @ApiPropertyOptional({ example: 'Distributed Computing & AI' })
  @IsString()
  @IsOptional()
  specialization?: string;

  @ApiPropertyOptional({ example: 20 })
  @IsInt()
  @Min(1)
  @IsOptional()
  maxActiveQueries?: number;

  @ApiPropertyOptional({ example: 'dept-uuid' })
  @IsUUID()
  @IsOptional()
  departmentId?: string;
}
