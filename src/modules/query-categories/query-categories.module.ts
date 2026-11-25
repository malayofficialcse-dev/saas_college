import { Module } from '@nestjs/common';
import { QueryCategoriesService } from './query-categories.service.js';
import { QueryCategoriesController } from './query-categories.controller.js';

@Module({
  controllers: [QueryCategoriesController],
  providers: [QueryCategoriesService],
  exports: [QueryCategoriesService],
})
export class QueryCategoriesModule {}
