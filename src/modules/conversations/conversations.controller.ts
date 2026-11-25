// ==============================================================================
// CollegeQuery SaaS — Conversations Controller
// ==============================================================================

import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Param,
  Body,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation, ApiQuery } from '@nestjs/swagger';
import { ConversationsService } from './conversations.service.js';
import { SendMessageDto } from './dto/send-message.dto.js';
import { EditMessageDto } from './dto/edit-message.dto.js';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard.js';
import { TenantGuard } from '../../common/guards/tenant.guard.js';
import { CurrentUser } from '../../common/decorators/current-user.decorator.js';

@ApiTags('Conversations')
@ApiBearerAuth('access-token')
@UseGuards(JwtAuthGuard, TenantGuard)
@Controller('queries/:queryId/messages')
export class ConversationsController {
  constructor(private readonly conversationsService: ConversationsService) {}

  @Post()
  @ApiOperation({ summary: 'Send public message or staff internal note in query chat' })
  async postMessage(
    @CurrentUser('tenantId') tenantId: string,
    @CurrentUser() user: any,
    @Param('queryId') queryId: string,
    @Body() dto: SendMessageDto,
  ) {
    return this.conversationsService.postMessage(
      tenantId,
      queryId,
      {
        userId: user.id,
        fullName: `${user.firstName} ${user.lastName}`,
        roleCode: user.userType,
        avatarUrl: user.avatarUrl,
      },
      dto,
    );
  }

  @Get()
  @ApiOperation({ summary: 'Get paginated query conversation timeline' })
  @ApiQuery({ name: 'page', required: false, example: 1 })
  @ApiQuery({ name: 'limit', required: false, example: 50 })
  @ApiQuery({ name: 'before', required: false, description: 'Cursor: ObjectId for pagination before this message' })
  async getMessages(
    @CurrentUser('tenantId') tenantId: string,
    @CurrentUser('id') userId: string,
    @CurrentUser('userType') userType: string,
    @Param('queryId') queryId: string,
    @Query('page') page = '1',
    @Query('limit') limit = '50',
    @Query('before') before?: string,
  ) {
    const isStaff = userType !== 'STUDENT';
    return this.conversationsService.getMessages(
      tenantId,
      queryId,
      userId,
      isStaff,
      parseInt(page, 10),
      parseInt(limit, 10),
      before,
    );
  }

  @Patch(':messageId')
  @ApiOperation({ summary: 'Edit own message within 15-minute window' })
  async editMessage(
    @CurrentUser('tenantId') tenantId: string,
    @CurrentUser('id') userId: string,
    @Param('queryId') queryId: string,
    @Param('messageId') messageId: string,
    @Body() dto: EditMessageDto,
  ) {
    return this.conversationsService.editMessage(tenantId, queryId, messageId, userId, dto);
  }

  @Delete(':messageId')
  @ApiOperation({ summary: 'Soft-delete a message (sender or staff)' })
  async deleteMessage(
    @CurrentUser('tenantId') tenantId: string,
    @CurrentUser('id') userId: string,
    @CurrentUser('userType') userType: string,
    @Param('queryId') queryId: string,
    @Param('messageId') messageId: string,
  ) {
    const isStaff = userType !== 'STUDENT';
    return this.conversationsService.deleteMessage(tenantId, queryId, messageId, userId, isStaff);
  }

  @Patch('read')
  @ApiOperation({ summary: 'Acknowledge all unread messages in ticket' })
  async markRead(
    @CurrentUser('tenantId') tenantId: string,
    @CurrentUser('id') userId: string,
    @Param('queryId') queryId: string,
  ) {
    return this.conversationsService.markAsRead(tenantId, queryId, userId);
  }

  @Get('activity')
  @ApiOperation({ summary: 'Get query activity timeline (status changes, assignments, etc.)' })
  async getActivity(
    @CurrentUser('tenantId') tenantId: string,
    @Param('queryId') queryId: string,
  ) {
    return this.conversationsService.getActivityTimeline(tenantId, queryId);
  }
}
