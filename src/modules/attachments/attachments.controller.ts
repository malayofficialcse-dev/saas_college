import {
  Controller,
  Post,
  Get,
  Delete,
  Param,
  Body,
  UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { AttachmentsService } from './attachments.service.js';
import { PresignedUrlDto } from './dto/presigned-url.dto.js';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard.js';
import { TenantGuard } from '../../common/guards/tenant.guard.js';
import { CurrentUser } from '../../common/decorators/current-user.decorator.js';

@ApiTags('Attachments')
@ApiBearerAuth('access-token')
@UseGuards(JwtAuthGuard, TenantGuard)
@Controller('attachments')
export class AttachmentsController {
  constructor(private readonly attachmentsService: AttachmentsService) {}

  @Post('presigned-url')
  @ApiOperation({ summary: 'Request signed S3 PUT URL for direct client file upload' })
  async getPresignedUrl(
    @CurrentUser('tenantId') tenantId: string,
    @CurrentUser('id') userId: string,
    @Body() dto: PresignedUrlDto,
  ) {
    return this.attachmentsService.generatePresignedPutUrl(tenantId, userId, dto);
  }

  @Get(':id/download-url')
  @ApiOperation({ summary: 'Get signed S3 GET URL for secure attachment download' })
  async getDownloadUrl(
    @CurrentUser('tenantId') tenantId: string,
    @CurrentUser('id') userId: string,
    @Param('id') id: string,
  ) {
    return this.attachmentsService.getDownloadUrl(tenantId, id, userId);
  }

  @Get('query/:queryId')
  @ApiOperation({ summary: 'List all attachments for a query ticket' })
  async listForQuery(
    @CurrentUser('tenantId') tenantId: string,
    @Param('queryId') queryId: string,
  ) {
    return this.attachmentsService.findByQuery(tenantId, queryId);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete attachment (uploader or admin only)' })
  async deleteAttachment(
    @CurrentUser('tenantId') tenantId: string,
    @CurrentUser('id') userId: string,
    @CurrentUser('userType') userType: string,
    @Param('id') id: string,
  ) {
    const isAdmin = ['SAAS_SUPER_ADMIN', 'COLLEGE_ADMIN'].includes(userType);
    return this.attachmentsService.delete(tenantId, id, userId, isAdmin);
  }
}
