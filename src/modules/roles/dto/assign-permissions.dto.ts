import { IsArray, IsNotEmpty, IsString } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class AssignPermissionsDto {
  @ApiProperty({ type: [String], example: ['query:view:department', 'query:assign'] })
  @IsArray()
  @IsString({ each: true })
  @IsNotEmpty()
  permissionCodes: string[];
}
