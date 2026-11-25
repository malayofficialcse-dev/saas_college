import { Module } from '@nestjs/common';
import { FacultyService } from './faculty.service.js';
import { FacultyController } from './faculty.controller.js';

@Module({
  controllers: [FacultyController],
  providers: [FacultyService],
  exports: [FacultyService],
})
export class FacultyModule {}
