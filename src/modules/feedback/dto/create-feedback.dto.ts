import { IsBoolean, IsInt, IsOptional, IsString, Max, Min } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CreateFeedbackDto {
  @ApiProperty({ example: 5, description: 'Overall CSAT rating between 1 and 5 stars' })
  @IsInt()
  @Min(1)
  @Max(5)
  rating: number;

  @ApiProperty({ required: false, example: 5, description: 'Query resolution rating between 1 and 5' })
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(5)
  resolutionRating?: number;

  @ApiProperty({ required: false, example: 5, description: 'Staff response quality rating between 1 and 5' })
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(5)
  responseQualityRating?: number;

  @ApiProperty({ required: false, default: true, description: 'Whether the student confirms the issue was resolved' })
  @IsOptional()
  @IsBoolean()
  wasIssueResolved?: boolean;

  @ApiProperty({ required: false, example: 'Query was resolved swiftly by the faculty. Thank you!' })
  @IsOptional()
  @IsString()
  feedbackText?: string;
}
