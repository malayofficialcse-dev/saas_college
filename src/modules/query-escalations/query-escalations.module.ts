import { Module } from '@nestjs/common';
import { QueryEscalationsService } from './query-escalations.service.js';
import { QueryEscalationsController } from './query-escalations.controller.js';

@Module({
  controllers: [QueryEscalationsController],
  providers: [QueryEscalationsService],
  exports: [QueryEscalationsService],
})
export class QueryEscalationsModule {}
