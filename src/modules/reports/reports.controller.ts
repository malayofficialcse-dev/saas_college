import {
  Controller,
  Post,
  Query,
  Res,
  UseGuards,
} from '@nestjs/common';
import {
  ApiTags,
  ApiBearerAuth,
  ApiOperation,
  ApiQuery,
} from '@nestjs/swagger';
import type { Response } from 'express';
import { ReportsService } from './reports.service.js';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard.js';
import { TenantGuard } from '../../common/guards/tenant.guard.js';
import { DynamicPermissionGuard } from '../../common/guards/dynamic-permission.guard.js';
import { RequirePermissions } from '../../common/decorators/require-permissions.decorator.js';
import { CurrentUser } from '../../common/decorators/current-user.decorator.js';

@ApiTags('Reports')
@ApiBearerAuth('access-token')
@UseGuards(JwtAuthGuard, TenantGuard, DynamicPermissionGuard)
@Controller('reports')
export class ReportsController {
  constructor(private readonly reportsService: ReportsService) {}

  @Post('export/tickets-csv')
  @RequirePermissions('reports:export')
  @ApiOperation({ summary: 'Export ticket compliance summary as CSV' })
  @ApiQuery({ name: 'startDate', required: false })
  @ApiQuery({ name: 'endDate', required: false })
  @ApiQuery({ name: 'departmentId', required: false })
  @ApiQuery({ name: 'status', required: false })
  async exportTicketsCsv(
    @CurrentUser('tenantId') tenantId: string,
    @Res() res: Response,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
    @Query('departmentId') departmentId?: string,
    @Query('status') status?: string,
  ) {
    const report = await this.reportsService.generateTicketSummaryCsv(tenantId, {
      startDate,
      endDate,
      departmentId,
      status,
    });
    res.setHeader('Content-Type', report.contentType);
    res.setHeader('Content-Disposition', `attachment; filename="${report.fileName}"`);
    return res.send(report.data);
  }

  @Post('export/sla-compliance-csv')
  @RequirePermissions('reports:export')
  @ApiOperation({ summary: 'Export SLA compliance and breach history as CSV' })
  @ApiQuery({ name: 'startDate', required: false })
  @ApiQuery({ name: 'endDate', required: false })
  async exportSlaCsv(
    @CurrentUser('tenantId') tenantId: string,
    @Res() res: Response,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
  ) {
    const report = await this.reportsService.generateSlaComplianceCsv(tenantId, {
      startDate,
      endDate,
    });
    res.setHeader('Content-Type', report.contentType);
    res.setHeader('Content-Disposition', `attachment; filename="${report.fileName}"`);
    return res.send(report.data);
  }

  @Post('export/faculty-workload-csv')
  @RequirePermissions('reports:export')
  @ApiOperation({ summary: 'Export faculty query workload distribution as CSV' })
  async exportFacultyWorkloadCsv(
    @CurrentUser('tenantId') tenantId: string,
    @Res() res: Response,
  ) {
    const report = await this.reportsService.generateFacultyWorkloadCsv(tenantId);
    res.setHeader('Content-Type', report.contentType);
    res.setHeader('Content-Disposition', `attachment; filename="${report.fileName}"`);
    return res.send(report.data);
  }

  @Post('export/student-activity-csv')
  @RequirePermissions('reports:export')
  @ApiOperation({ summary: 'Export student query submission and resolution activity as CSV' })
  @ApiQuery({ name: 'startDate', required: false })
  @ApiQuery({ name: 'endDate', required: false })
  async exportStudentActivityCsv(
    @CurrentUser('tenantId') tenantId: string,
    @Res() res: Response,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
  ) {
    const report = await this.reportsService.generateStudentActivityCsv(tenantId, {
      startDate,
      endDate,
    });
    res.setHeader('Content-Type', report.contentType);
    res.setHeader('Content-Disposition', `attachment; filename="${report.fileName}"`);
    return res.send(report.data);
  }

  @Post('export/billing-csv')
  @RequirePermissions('reports:export')
  @ApiOperation({ summary: 'Export college billing and invoice history as CSV' })
  async exportBillingCsv(
    @CurrentUser('tenantId') tenantId: string,
    @Res() res: Response,
  ) {
    const report = await this.reportsService.generateBillingHistoryCsv(tenantId);
    res.setHeader('Content-Type', report.contentType);
    res.setHeader('Content-Disposition', `attachment; filename="${report.fileName}"`);
    return res.send(report.data);
  }
}
