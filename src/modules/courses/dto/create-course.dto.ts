import { IsNotEmpty, IsString, IsOptional, IsUUID, IsInt, Min, Max, IsBoolean } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateCourseDto {
  @ApiProperty({ example: 'dept-uuid-here' })
  @IsUUID()
  @IsNotEmpty()
  departmentId!: string;

  @ApiProperty({ example: 'BTECH-CSE' })
  @IsString()
  @IsNotEmpty()
  code!: string;

  @ApiProperty({ example: 'Bachelor of Technology in Computer Science' })
  @IsString()
  @IsNotEmpty()
  name!: string;

  @ApiPropertyOptional({ example: 8, default: 8 })
  @IsInt()
  @Min(1)
  @Max(12)
  @IsOptional()
  durationSemesters?: number;

  @ApiPropertyOptional({ example: 'Undergraduate', default: 'Undergraduate' })
  @IsString()
  @IsOptional()
  degreeLevel?: string;

  @ApiPropertyOptional({ example: true, default: true })
  @IsBoolean()
  @IsOptional()
  isActive?: boolean;
}

export class UpdateCourseDto {
  @ApiPropertyOptional({ example: 'Bachelor of Technology in Computer Science & AI' })
  @IsString()
  @IsOptional()
  name?: string;

  @ApiPropertyOptional({ example: 8 })
  @IsInt()
  @Min(1)
  @Max(12)
  @IsOptional()
  durationSemesters?: number;

  @ApiPropertyOptional({ example: 'Undergraduate' })
  @IsString()
  @IsOptional()
  degreeLevel?: string;

  @ApiPropertyOptional({ example: true })
  @IsBoolean()
  @IsOptional()
  isActive?: boolean;
}
