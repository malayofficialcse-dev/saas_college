import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { MessagingGateway } from './messaging.gateway.js';

@Module({
  imports: [
    JwtModule.registerAsync({
      imports: [ConfigModule],
      useFactory: (configService: ConfigService) => ({
        secret: configService.get<string>('jwt.accessSecret', 'dev_jwt_access_secret'),
      }),
      inject: [ConfigService],
    }),
  ],
  providers: [MessagingGateway],
  exports: [MessagingGateway],
})
export class MessagingModule {}
