import { Module } from '@nestjs/common';
import { TenantConfigService } from './tenant-config.service.js';
import { TenantConfigController } from './tenant-config.controller.js';

@Module({
  controllers: [TenantConfigController],
  providers: [TenantConfigService],
  exports: [TenantConfigService],
})
export class TenantConfigModule {}
