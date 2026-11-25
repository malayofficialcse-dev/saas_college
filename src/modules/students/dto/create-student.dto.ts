import { IsNotEmpty, IsString, IsEmail, MinLength, IsOptional, IsUUID, IsInt, Min, Max } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateStudentDto {
  @ApiProperty({ example: 'student.rahul@campus.edu' })
  @IsEmail()
  email!: string;

  @ApiProperty({ example: 'StudentPass123!' })
  @IsString()
  @MinLength(8)
  password!: string;

  @ApiProperty({ example: 'Rahul' })
  @IsString()
  @IsNotEmpty()
  firstName!: string;

  @ApiProperty({ example: 'Verma' })
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

  @ApiProperty({ example: 'course-uuid' })
  @IsUUID()
  @IsNotEmpty()
  courseId!: string;

  @ApiProperty({ example: 'session-uuid' })
  @IsUUID()
  @IsNotEmpty()
  academicSessionId!: string;

  @ApiProperty({ example: 'ENR-2026-CSE-001' })
  @IsString()
  @IsNotEmpty()
  enrollmentNumber!: string;

  @ApiProperty({ example: 'ROLL-26-001' })
  @IsString()
  @IsNotEmpty()
  rollNumber!: string;

  @ApiPropertyOptional({ example: 1, default: 1 })
  @IsInt()
  @Min(1)
  @Max(12)
  @IsOptional()
  currentSemester?: number;

  @ApiProperty({ example: 2026 })
  @IsInt()
  @Min(2000)
  admissionYear!: number;
}

export class UpdateStudentDto {
  @ApiPropertyOptional({ example: 'Rahul' })
  @IsString()
  @IsOptional()
  firstName?: string;

  @ApiPropertyOptional({ example: 'Verma' })
  @IsString()
  @IsOptional()
  lastName?: string;

  @ApiPropertyOptional({ example: '+919876543210' })
  @IsString()
  @IsOptional()
  phoneNumber?: string;

  @ApiPropertyOptional({ example: 'ROLL-26-001' })
  @IsString()
  @IsOptional()
  rollNumber?: string;

  @ApiPropertyOptional({ example: 2 })
  @IsInt()
  @Min(1)
  @Max(12)
  @IsOptional()
  currentSemester?: number;

  @ApiPropertyOptional({ example: 'dept-uuid' })
  @IsUUID()
  @IsOptional()
  departmentId?: string;

  @ApiPropertyOptional({ example: 'course-uuid' })
  @IsUUID()
  @IsOptional()
  courseId?: string;
}
