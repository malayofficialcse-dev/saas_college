import { IsEmail, IsNotEmpty, IsOptional, IsString } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CreateCollegeDto {
  @ApiProperty({ example: 'ENG-MAIN-01' })
  @IsString()
  @IsNotEmpty()
  code: string;

  @ApiProperty({ example: 'College of Engineering & Technology' })
  @IsString()
  @IsNotEmpty()
  name: string;

  @ApiProperty({ required: false, example: '42 Knowledge Park' })
  @IsOptional()
  @IsString()
  address?: string;

  @ApiProperty({ required: false, example: 'Bengaluru' })
  @IsOptional()
  @IsString()
  city?: string;

  @ApiProperty({ required: false, example: 'Karnataka' })
  @IsOptional()
  @IsString()
  state?: string;

  @ApiProperty({ required: false, example: 'contact@eng.college.edu' })
  @IsOptional()
  @IsEmail()
  email?: string;

  @ApiProperty({ required: false, example: '+918012345678' })
  @IsOptional()
  @IsString()
  phoneNumber?: string;
}
