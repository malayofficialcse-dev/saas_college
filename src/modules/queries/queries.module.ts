import { Module } from '@nestjs/common';
import { QueriesService } from './queries.service.js';
import { QueriesController } from './queries.controller.js';
import { OutboxRelayerService } from './outbox-relayer.service.js';
import { ConversationsModule } from '../conversations/conversations.module.js';

@Module({
  imports: [ConversationsModule],
  controllers: [QueriesController],
  providers: [QueriesService, OutboxRelayerService],
  exports: [QueriesService, OutboxRelayerService],
})
export class QueriesModule {}
