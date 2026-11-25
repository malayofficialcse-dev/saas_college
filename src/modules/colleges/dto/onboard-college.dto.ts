import { IsNotEmpty, IsString, IsEmail, MinLength, IsOptional } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class OnboardCollegeDto {
  @ApiProperty({ example: 'stjude-engineering' })
  @IsString()
  @IsNotEmpty()
  slug!: string;

  @ApiProperty({ example: 'St. Jude College of Engineering' })
  @IsString()
  @IsNotEmpty()
  name!: string;

  @ApiProperty({ example: 'CAMPUS-01' })
  @IsString()
  @IsNotEmpty()
  collegeCode!: string;

  @ApiProperty({ example: 'admin@stjude.edu' })
  @IsEmail()
  adminEmail!: string;

  @ApiProperty({ example: 'CollegeAdminSecurePass2026!' })
  @IsString()
  @MinLength(8)
  adminPassword!: string;

  @ApiProperty({ example: 'Sister' })
  @IsString()
  @IsNotEmpty()
  adminFirstName!: string;

  @ApiProperty({ example: 'Mary' })
  @IsString()
  @IsNotEmpty()
  adminLastName!: string;

  @ApiPropertyOptional({ example: '+919876543210' })
  @IsString()
  @IsOptional()
  phoneNumber?: string;

  @ApiPropertyOptional({ example: 'Chennai' })
  @IsString()
  @IsOptional()
  city?: string;

  @ApiPropertyOptional({ example: 'Tamil Nadu' })
  @IsString()
  @IsOptional()
  state?: string;
}
