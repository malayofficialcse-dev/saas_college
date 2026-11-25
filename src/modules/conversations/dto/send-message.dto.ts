import { IsArray, IsEnum, IsNotEmpty, IsOptional, IsString } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class SendMessageDto {
  @ApiProperty({
    enum: ['PUBLIC_REPLY', 'INTERNAL_NOTE', 'SYSTEM_ANNOUNCEMENT'],
    default: 'PUBLIC_REPLY',
  })
  @IsEnum(['PUBLIC_REPLY', 'INTERNAL_NOTE', 'SYSTEM_ANNOUNCEMENT'])
  messageType: string;

  @ApiProperty({ example: 'Please find attached the revised marks verification certificate.' })
  @IsString()
  @IsNotEmpty()
  content: string;

  @ApiProperty({ required: false, type: [String], description: 'Optional attachment IDs from attachments table' })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  attachmentIds?: string[];
}
