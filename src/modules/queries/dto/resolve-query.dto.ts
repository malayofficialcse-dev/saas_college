import { IsNotEmpty, IsString } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class ResolveQueryDto {
  @ApiProperty({ example: 'Marks updated to A grade after physical verification of answer script.' })
  @IsString()
  @IsNotEmpty()
  resolutionSummary: string;
}
