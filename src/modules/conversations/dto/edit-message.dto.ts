import { IsNotEmpty, IsString, MaxLength } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class EditMessageDto {
  @ApiProperty({ example: 'Corrected message content after edit.' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(10000)
  content: string;
}
