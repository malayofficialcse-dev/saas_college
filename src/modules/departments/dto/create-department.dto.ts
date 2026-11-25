import { IsNotEmpty, IsString, IsOptional, IsUUID } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateDepartmentDto {
  @ApiProperty({ example: 'campus-uuid-here' })
  @IsUUID()
  @IsNotEmpty()
  collegeId!: string;

  @ApiProperty({ example: 'CSE' })
  @IsString()
  @IsNotEmpty()
  code!: string;

  @ApiProperty({ example: 'Computer Science & Engineering' })
  @IsString()
  @IsNotEmpty()
  name!: string;

  @ApiPropertyOptional({ example: 'Department of Computer Science and Engineering' })
  @IsString()
  @IsOptional()
  description?: string;

  @ApiPropertyOptional({ example: 'user-uuid-hod' })
  @IsUUID()
  @IsOptional()
  hodUserId?: string;
}

export class UpdateDepartmentDto {
  @ApiPropertyOptional({ example: 'Computer Science & Engineering' })
  @IsString()
  @IsOptional()
  name?: string;

  @ApiPropertyOptional({ example: 'Updated department description' })
  @IsString()
  @IsOptional()
  description?: string;

  @ApiPropertyOptional({ example: 'user-uuid-hod' })
  @IsUUID()
  @IsOptional()
  hodUserId?: string;
}
