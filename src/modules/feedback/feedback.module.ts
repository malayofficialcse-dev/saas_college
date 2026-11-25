import { Module } from '@nestjs/common';
import { FeedbackService } from './feedback.service.js';
import { FeedbackController, FeedbackSummaryController } from './feedback.controller.js';

@Module({
  controllers: [FeedbackController, FeedbackSummaryController],
  providers: [FeedbackService],
  exports: [FeedbackService],
})
export class FeedbackModule {}
