import { Module } from '@nestjs/common';
import { CollegesService } from './colleges.service.js';
import { CollegesController } from './colleges.controller.js';

@Module({
  controllers: [CollegesController],
  providers: [CollegesService],
  exports: [CollegesService],
})
export class CollegesModule {}
