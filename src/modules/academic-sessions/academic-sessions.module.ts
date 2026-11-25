import { Module } from '@nestjs/common';
import { AcademicSessionsService } from './academic-sessions.service.js';
import { AcademicSessionsController } from './academic-sessions.controller.js';

@Module({
  controllers: [AcademicSessionsController],
  providers: [AcademicSessionsService],
  exports: [AcademicSessionsService],
})
export class AcademicSessionsModule {}
