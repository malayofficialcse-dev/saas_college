import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { SystemAdminService } from './system-admin.service.js';
import { SystemAdminController } from './system-admin.controller.js';

@Module({
  imports: [JwtModule.register({})],
  controllers: [SystemAdminController],
  providers: [SystemAdminService],
  exports: [SystemAdminService],
})
export class SystemAdminModule {}
