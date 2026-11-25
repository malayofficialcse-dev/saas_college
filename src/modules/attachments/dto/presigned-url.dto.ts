import { IsInt, IsNotEmpty, IsString, Max } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class PresignedUrlDto {
  @ApiProperty({ example: 'grade_card_scan.pdf' })
  @IsString()
  @IsNotEmpty()
  fileName: string;

  @ApiProperty({ example: 'application/pdf' })
  @IsString()
  @IsNotEmpty()
  fileType: string;

  @ApiProperty({ example: 2048500, description: 'File size in bytes (max 10MB)' })
  @IsInt()
  @Max(10485760, { message: 'File size cannot exceed 10MB' })
  fileSizeBytes: number;
}
