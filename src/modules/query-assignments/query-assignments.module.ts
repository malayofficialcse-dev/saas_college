import { Module } from '@nestjs/common';
import { QueryAssignmentsService } from './query-assignments.service.js';
import { QueryAssignmentsController } from './query-assignments.controller.js';

@Module({
  controllers: [QueryAssignmentsController],
  providers: [QueryAssignmentsService],
  exports: [QueryAssignmentsService],
})
export class QueryAssignmentsModule {}
