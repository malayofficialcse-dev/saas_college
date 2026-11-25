import { Module } from '@nestjs/common';
import { SlaService } from './sla.service.js';
import { SlaController } from './sla.controller.js';
import { SlaMonitorService } from './sla-monitor.service.js';

@Module({
  controllers: [SlaController],
  providers: [SlaService, SlaMonitorService],
  exports: [SlaService, SlaMonitorService],
})
export class SlaModule {}
