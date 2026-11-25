import { IsArray, IsBoolean, IsOptional, IsString } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class UpdateTenantConfigDto {
  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  logoUrl?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  primaryColor?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  accentColor?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  supportEmail?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  supportPhone?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  timezone?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsBoolean()
  enableAutoAssign?: boolean;

  @ApiProperty({ required: false, type: [Number] })
  @IsOptional()
  @IsArray()
  workingDays?: number[];

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  workHoursStart?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  workHoursEnd?: string;
}
