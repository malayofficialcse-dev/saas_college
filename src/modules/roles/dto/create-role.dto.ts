import { IsNotEmpty, IsOptional, IsString } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CreateRoleDto {
  @ApiProperty({ example: 'EXAM_COORDINATOR' })
  @IsString()
  @IsNotEmpty()
  code: string;

  @ApiProperty({ example: 'Examination Coordinator' })
  @IsString()
  @IsNotEmpty()
  name: string;

  @ApiProperty({ required: false, example: 'Coordinates departmental exams and hall tickets' })
  @IsOptional()
  @IsString()
  description?: string;
}
