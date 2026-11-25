// ==============================================================================
// CollegeQuery SaaS — Socket.IO Messaging Gateway (Enhanced)
// Authenticated connections, tenant isolation, participant-authorized rooms,
// delivery events, typing indicators, read receipts, reconnection support.
// ==============================================================================

import {
  WebSocketGateway,
  WebSocketServer,
  SubscribeMessage,
  OnGatewayConnection,
  OnGatewayDisconnect,
  OnGatewayInit,
  ConnectedSocket,
  MessageBody,
  WsException,
} from '@nestjs/websockets';
import { Logger, Injectable } from '@nestjs/common';
import { Server, Socket } from 'socket.io';
import { OnEvent } from '@nestjs/event-emitter';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../../core/database/prisma.service.js';

interface AuthenticatedSocket extends Socket {
  data: {
    user: {
      sub: string;
      tenantId: string;
      email: string;
      userType: string;
      firstName: string;
      lastName: string;
    };
  };
}

@Injectable()
@WebSocketGateway({
  cors: {
    origin: '*',
    credentials: true,
  },
  namespace: '/socket.io',
  transports: ['websocket', 'polling'],
  pingTimeout: 60000,
  pingInterval: 25000,
})
export class MessagingGateway
  implements OnGatewayInit, OnGatewayConnection, OnGatewayDisconnect
{
  @WebSocketServer()
  server!: Server;

  private readonly logger = new Logger(MessagingGateway.name);
  private readonly tenantSocketCount = new Map<string, number>();

  constructor(
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
    private readonly prisma: PrismaService,
  ) {}

  afterInit(_server: Server) {
    this.logger.log('Socket.IO Gateway initialized — ready for connections.');
  }

  // ---------------------------------------------------------------------------
  // Connection Lifecycle
  // ---------------------------------------------------------------------------

  async handleConnection(client: AuthenticatedSocket) {
    try {
      const authHeader =
        client.handshake.auth?.token || client.handshake.headers?.authorization;
      if (!authHeader) {
        client.emit('error', { code: 'AUTH_REQUIRED', message: 'Authentication token is required.' });
        client.disconnect();
        return;
      }

      const token = authHeader.replace(/^Bearer\s+/i, '');
      const secret = this.configService.get<string>('jwt.accessSecret', 'dev_jwt_access_secret');
      const payload = this.jwtService.verify(token, { secret });

      client.data.user = payload;
      const tenantId = payload.tenantId;
      const userId = payload.sub;

      if (!tenantId) {
        client.emit('error', { code: 'INVALID_TENANT', message: 'Tenant context required.' });
        client.disconnect();
        return;
      }

      client.join(`tenant:${tenantId}`);
      client.join(`user:${userId}`);

      const count = (this.tenantSocketCount.get(tenantId) || 0) + 1;
      this.tenantSocketCount.set(tenantId, count);

      client.emit('connected', {
        socketId: client.id,
        userId,
        tenantId,
        userType: payload.userType,
      });

      this.logger.log(
        `Socket connected: ${client.id} | User: ${userId} | Tenant: ${tenantId} | Total in tenant: ${count}`,
      );
    } catch (err: any) {
      this.logger.warn(`Unauthorized socket connection: ${err.message}`);
      client.emit('error', { code: 'UNAUTHORIZED', message: 'Invalid or expired token.' });
      client.disconnect();
    }
  }

  handleDisconnect(client: AuthenticatedSocket) {
    const user = client.data?.user;
    if (user?.tenantId) {
      const count = Math.max(0, (this.tenantSocketCount.get(user.tenantId) || 1) - 1);
      this.tenantSocketCount.set(user.tenantId, count);
    }
    this.logger.log(`Socket disconnected: ${client.id}`);
  }

  // ---------------------------------------------------------------------------
  // Room Management — Tenant & Participant Authorized Ticket Rooms
  // ---------------------------------------------------------------------------

  @SubscribeMessage('join_ticket_room')
  async handleJoinTicket(
    @ConnectedSocket() client: AuthenticatedSocket,
    @MessageBody() data: { queryId: string },
  ) {
    const user = client.data?.user;
    if (!user || !data?.queryId) {
      throw new WsException('Missing user context or queryId.');
    }

    // Verify query exists within user's tenant
    const query = await this.prisma.query.findFirst({
      where: { id: data.queryId, tenantId: user.tenantId },
      include: { student: true },
    });

    if (!query) {
      throw new WsException('Query not found or access denied for this tenant.');
    }

    // Students may only join their own ticket room
    const isStaff = user.userType !== 'STUDENT';
    if (!isStaff && query.student.userId !== user.sub) {
      throw new WsException('Forbidden: You are not a participant of this conversation.');
    }

    const room = `query:${data.queryId}`;
    client.join(room);

    // Staff also join a staff-only room so INTERNAL_NOTE messages never leak to students
    if (isStaff) {
      client.join(`query:${data.queryId}:staff`);
    }

    client.to(room).emit('user_joined', {
      queryId: data.queryId,
      userId: user.sub,
      userName: `${user.firstName} ${user.lastName}`,
      userType: user.userType,
      joinedAt: new Date().toISOString(),
    });

    this.logger.log(`Client ${client.id} joined ${room}`);
    return { success: true, room };
  }

  @SubscribeMessage('leave_ticket_room')
  handleLeaveTicket(
    @ConnectedSocket() client: AuthenticatedSocket,
    @MessageBody() data: { queryId: string },
  ) {
    const room = `query:${data.queryId}`;
    client.leave(room);
    client.leave(`query:${data.queryId}:staff`);

    client.to(room).emit('user_left', {
      queryId: data.queryId,
      userId: client.data?.user?.sub,
      leftAt: new Date().toISOString(),
    });

    return { success: true };
  }

  // ---------------------------------------------------------------------------
  // Typing Indicators
  // ---------------------------------------------------------------------------

  @SubscribeMessage('typing')
  handleTyping(
    @ConnectedSocket() client: AuthenticatedSocket,
    @MessageBody() data: { queryId: string; isTyping: boolean },
  ) {
    const user = client.data?.user;
    if (!user || !data?.queryId) return;

    client.to(`query:${data.queryId}`).emit('user_typing', {
      queryId: data.queryId,
      userId: user.sub,
      userName: `${user.firstName} ${user.lastName}`,
      userType: user.userType,
      isTyping: data.isTyping,
    });
  }

  // ---------------------------------------------------------------------------
  // Message Delivery Acknowledgements
  // ---------------------------------------------------------------------------

  @SubscribeMessage('message_delivered')
  handleDeliveryAck(
    @ConnectedSocket() client: AuthenticatedSocket,
    @MessageBody() data: { messageId: string; queryId: string },
  ) {
    const user = client.data?.user;
    if (!user || !data?.queryId) return;

    client.to(`query:${data.queryId}`).emit('delivery_confirmed', {
      messageId: data.messageId,
      queryId: data.queryId,
      deliveredBy: user.sub,
      deliveredAt: new Date().toISOString(),
    });
  }

  // ---------------------------------------------------------------------------
  // Event Listeners — Domain Events → WebSocket Broadcasts
  // ---------------------------------------------------------------------------

  @OnEvent('chat.message_sent')
  handleBroadcastMessage(payload: {
    tenantId: string;
    queryId: string;
    conversationId: string;
    message: any;
  }) {
    // Route INTERNAL_NOTE strictly to the staff-only room
    const targetRoom =
      payload.message?.messageType === 'INTERNAL_NOTE'
        ? `query:${payload.queryId}:staff`
        : `query:${payload.queryId}`;

    this.server.to(targetRoom).emit('new_message', {
      ...payload.message,
      queryId: payload.queryId,
    });
  }

  @OnEvent('chat.message_edited')
  handleBroadcastEdit(payload: {
    tenantId: string;
    queryId: string;
    messageId: string;
    newContent: string;
  }) {
    this.server.to(`query:${payload.queryId}`).emit('message_edited', payload);
  }

  @OnEvent('chat.message_deleted')
  handleBroadcastDeletion(payload: { tenantId: string; queryId: string; messageId: string }) {
    this.server.to(`query:${payload.queryId}`).emit('message_deleted', payload);
  }

  @OnEvent('chat.read_receipt')
  handleBroadcastReadReceipt(payload: {
    tenantId: string;
    queryId: string;
    userId: string;
    readAt: Date;
  }) {
    this.server.to(`query:${payload.queryId}`).emit('read_receipt', payload);
  }

  @OnEvent('chat.message_delivered')
  handleBroadcastDelivered(_payload: { tenantId: string; messageId: string; userId: string }) {
    // Delivery ack handled directly via WebSocket event
  }

  @OnEvent('query.assigned')
  handleBroadcastAssignment(payload: {
    tenantId: string;
    queryId: string;
    assignedToUserId: string;
    ticketNumber: string;
  }) {
    this.server.to(`user:${payload.assignedToUserId}`).emit('query_assigned', payload);
  }

  @OnEvent('query.status_changed')
  handleBroadcastStatusChange(payload: {
    tenantId: string;
    queryId: string;
    oldStatus: string;
    newStatus: string;
    ticketNumber: string;
  }) {
    this.server.to(`query:${payload.queryId}`).emit('status_changed', payload);
  }

  @OnEvent('query.resolved')
  handleBroadcastResolution(payload: {
    tenantId: string;
    queryId: string;
    studentUserId: string;
  }) {
    this.server.to(`query:${payload.queryId}`).emit('query_resolved', payload);
    this.server.to(`user:${payload.studentUserId}`).emit('your_query_resolved', payload);
  }

  @OnEvent('notification.created')
  handlePushNotification(payload: {
    tenantId: string;
    userId: string;
    notification: any;
  }) {
    this.server.to(`user:${payload.userId}`).emit('notification', payload.notification);
  }

  // ---------------------------------------------------------------------------
  // Utility
  // ---------------------------------------------------------------------------

  broadcastToTenant(tenantId: string, event: string, data: any) {
    this.server.to(`tenant:${tenantId}`).emit(event, data);
  }

  broadcastToRoom(room: string, event: string, data: any) {
    this.server.to(room).emit(event, data);
  }

  getTenantConnectionCount(tenantId: string): number {
    return this.tenantSocketCount.get(tenantId) || 0;
  }
}
