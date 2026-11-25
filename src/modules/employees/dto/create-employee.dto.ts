import { IsNotEmpty, IsString, IsEmail, MinLength, IsOptional, IsUUID, IsEnum } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { StaffCategory } from '@prisma/client';

export class CreateEmployeeDto {
  @ApiProperty({ example: 'staff.accounts@campus.edu' })
  @IsEmail()
  email!: string;

  @ApiProperty({ example: 'StaffPass123!' })
  @IsString()
  @MinLength(8)
  password!: string;

  @ApiProperty({ example: 'Vikram' })
  @IsString()
  @IsNotEmpty()
  firstName!: string;

  @ApiProperty({ example: 'Kulkarni' })
  @IsString()
  @IsNotEmpty()
  lastName!: string;

  @ApiPropertyOptional({ example: '+919876543210' })
  @IsString()
  @IsOptional()
  phoneNumber?: string;

  @ApiProperty({ example: 'EMP-ACC-012' })
  @IsString()
  @IsNotEmpty()
  employeeCode!: string;

  @ApiProperty({ enum: StaffCategory, example: StaffCategory.ACCOUNTS })
  @IsEnum(StaffCategory)
  staffCategory!: StaffCategory;

  @ApiProperty({ example: 'Senior Accounts Officer' })
  @IsString()
  @IsNotEmpty()
  designation!: string;

  @ApiPropertyOptional({ example: 'dept-uuid' })
  @IsUUID()
  @IsOptional()
  departmentId?: string;
}

export class UpdateEmployeeDto {
  @ApiPropertyOptional({ example: 'Vikram' })
  @IsString()
  @IsOptional()
  firstName?: string;

  @ApiPropertyOptional({ example: 'Kulkarni' })
  @IsString()
  @IsOptional()
  lastName?: string;

  @ApiPropertyOptional({ example: '+919876543210' })
  @IsString()
  @IsOptional()
  phoneNumber?: string;

  @ApiPropertyOptional({ enum: StaffCategory })
  @IsEnum(StaffCategory)
  @IsOptional()
  staffCategory?: StaffCategory;

  @ApiPropertyOptional({ example: 'Chief Financial Accountant' })
  @IsString()
  @IsOptional()
  designation?: string;

  @ApiPropertyOptional({ example: 'dept-uuid' })
  @IsUUID()
  @IsOptional()
  departmentId?: string;
}
