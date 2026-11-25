// ==============================================================================
// CollegeQuery SaaS — Attachments Service (Full Implementation)
// S3/MinIO provider abstraction, file type validation, size limits,
// signed upload/download URLs, tenant isolation.
// ==============================================================================

import {
  Injectable,
  BadRequestException,
  NotFoundException,
  ForbiddenException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  S3Client,
  PutObjectCommand,
  GetObjectCommand,
  DeleteObjectCommand,
  HeadObjectCommand,
} from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { v4 as uuidv4 } from 'uuid';
import { PrismaService } from '../../core/database/prisma.service.js';
import { PresignedUrlDto } from './dto/presigned-url.dto.js';

// ---------------------------------------------------------------------------
// Storage Provider Abstraction Interface
// ---------------------------------------------------------------------------

interface StorageProvider {
  generateUploadUrl(key: string, mimeType: string, sizeBytes: number): Promise<string>;
  generateDownloadUrl(key: string, fileName: string): Promise<string>;
  deleteObject(key: string): Promise<void>;
}

// ---------------------------------------------------------------------------
// S3/MinIO Storage Provider
// ---------------------------------------------------------------------------

class S3StorageProvider implements StorageProvider {
  private readonly client: S3Client;
  private readonly bucket: string;

  constructor(configService: ConfigService) {
    this.client = new S3Client({
      region: configService.get<string>('aws.region', 'us-east-1'),
      credentials: {
        accessKeyId: configService.get<string>('aws.accessKeyId', 'minioadmin'),
        secretAccessKey: configService.get<string>('aws.secretAccessKey', 'minioadmin'),
      },
      endpoint: configService.get<string>('aws.endpoint') || undefined,
      forcePathStyle: configService.get<boolean>('aws.forcePathStyle', true),
    });
    this.bucket = configService.get<string>('aws.bucket', 'collegequery-attachments');
  }

  async generateUploadUrl(key: string, mimeType: string, sizeBytes: number): Promise<string> {
    const command = new PutObjectCommand({
      Bucket: this.bucket,
      Key: key,
      ContentType: mimeType,
      ContentLength: sizeBytes,
    });
    return getSignedUrl(this.client, command, { expiresIn: 900 }); // 15 mins
  }

  async generateDownloadUrl(key: string, fileName: string): Promise<string> {
    const command = new GetObjectCommand({
      Bucket: this.bucket,
      Key: key,
      ResponseContentDisposition: `attachment; filename="${encodeURIComponent(fileName)}"`,
    });
    return getSignedUrl(this.client, command, { expiresIn: 900 });
  }

  async deleteObject(key: string): Promise<void> {
    await this.client.send(new DeleteObjectCommand({ Bucket: this.bucket, Key: key }));
  }
}

// ---------------------------------------------------------------------------
// Allowed File Types and Size Limits
// ---------------------------------------------------------------------------

const ALLOWED_MIME_TYPES: Record<string, string[]> = {
  'image/jpeg': ['.jpg', '.jpeg'],
  'image/png': ['.png'],
  'image/webp': ['.webp'],
  'image/gif': ['.gif'],
  'application/pdf': ['.pdf'],
  'text/plain': ['.txt'],
  'application/msword': ['.doc'],
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document': ['.docx'],
  'application/vnd.ms-excel': ['.xls'],
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': ['.xlsx'],
  'application/zip': ['.zip'],
};

const MAX_FILE_SIZE_BYTES = 20 * 1024 * 1024; // 20MB

@Injectable()
export class AttachmentsService {
  private readonly storageProvider: StorageProvider;

  constructor(
    private readonly prisma: PrismaService,
    private readonly configService: ConfigService,
  ) {
    this.storageProvider = new S3StorageProvider(configService);
  }

  // ---------------------------------------------------------------------------
  // Pre-signed Upload URL (PUT)
  // ---------------------------------------------------------------------------

  async generatePresignedPutUrl(tenantId: string, userId: string, dto: PresignedUrlDto) {
    if (!ALLOWED_MIME_TYPES[dto.fileType]) {
      throw new BadRequestException(
        `Unsupported file type: ${dto.fileType}. Allowed: ${Object.keys(ALLOWED_MIME_TYPES).join(', ')}.`,
      );
    }

    if (dto.fileSizeBytes > MAX_FILE_SIZE_BYTES) {
      throw new BadRequestException(
        `File size ${dto.fileSizeBytes} exceeds the maximum allowed size of 20MB.`,
      );
    }

    const fileId = uuidv4();
    const sanitizedFileName = dto.fileName
      .replace(/[^a-zA-Z0-9.\-_]/g, '_')
      .substring(0, 200);

    const fileKey = `tenants/${tenantId}/attachments/${fileId}/${sanitizedFileName}`;

    const uploadUrl = await this.storageProvider.generateUploadUrl(
      fileKey,
      dto.fileType,
      dto.fileSizeBytes,
    );

    // Create preliminary attachment record (linked once upload completes)
    const attachment = await this.prisma.attachment.create({
      data: {
        id: fileId,
        tenantId,
        fileName: sanitizedFileName,
        fileKey,
        fileType: dto.fileType,
        fileSizeBytes: dto.fileSizeBytes,
        uploadedByUserId: userId,
      },
    });

    return {
      attachmentId: attachment.id,
      uploadUrl,
      fileKey,
      fileName: sanitizedFileName,
      expiresIn: 900,
    };
  }

  // ---------------------------------------------------------------------------
  // Pre-signed Download URL (GET) — Tenant-scoped Authorization
  // ---------------------------------------------------------------------------

  async getDownloadUrl(tenantId: string, id: string, requestingUserId: string) {
    const attachment = await this.prisma.attachment.findFirst({
      where: { id, tenantId },
    });
    if (!attachment) {
      throw new NotFoundException(`Attachment '${id}' not found.`);
    }

    // Authorization: uploader always has access; also check if attached to a query
    if (attachment.queryId) {
      const query = await this.prisma.query.findFirst({
        where: { id: attachment.queryId, tenantId },
        include: { student: true, assignments: { where: { unassignedAt: null } } },
      });
      if (!query) throw new ForbiddenException('Access to this attachment is not permitted.');

      const isStudent = query.student.userId === requestingUserId;
      const isAssignedStaff = query.assignments.some(
        (a) => a.assignedToUserId === requestingUserId,
      );
      const isUploader = attachment.uploadedByUserId === requestingUserId;

      if (!isStudent && !isAssignedStaff && !isUploader) {
        throw new ForbiddenException('You are not authorized to access this attachment.');
      }
    }

    const downloadUrl = await this.storageProvider.generateDownloadUrl(
      attachment.fileKey,
      attachment.fileName,
    );

    return {
      downloadUrl,
      fileName: attachment.fileName,
      fileType: attachment.fileType,
      fileSizeBytes: attachment.fileSizeBytes,
      expiresIn: 900,
    };
  }

  // ---------------------------------------------------------------------------
  // List Attachments for a Query
  // ---------------------------------------------------------------------------

  async findByQuery(tenantId: string, queryId: string) {
    // Verify query belongs to tenant
    const query = await this.prisma.query.findFirst({
      where: { id: queryId, tenantId },
    });
    if (!query) throw new NotFoundException(`Query '${queryId}' not found.`);

    return this.prisma.attachment.findMany({
      where: { tenantId, queryId },
      orderBy: { createdAt: 'desc' },
      include: {
        uploadedByUser: {
          select: { id: true, firstName: true, lastName: true, email: true },
        },
      },
    });
  }

  // ---------------------------------------------------------------------------
  // Delete Attachment (uploader or admin)
  // ---------------------------------------------------------------------------

  async delete(tenantId: string, id: string, requestingUserId: string, isAdmin: boolean) {
    const attachment = await this.prisma.attachment.findFirst({
      where: { id, tenantId },
    });
    if (!attachment) throw new NotFoundException(`Attachment '${id}' not found.`);

    if (!isAdmin && attachment.uploadedByUserId !== requestingUserId) {
      throw new ForbiddenException('You can only delete attachments you uploaded.');
    }

    // Delete from storage
    try {
      await this.storageProvider.deleteObject(attachment.fileKey);
    } catch {
      // Log but don't fail — record should still be cleaned up
    }

    await this.prisma.attachment.delete({ where: { id } });

    return { success: true, id };
  }

  // ---------------------------------------------------------------------------
  // Link Attachment to Query (after upload confirmation)
  // ---------------------------------------------------------------------------

  async linkToQuery(tenantId: string, attachmentId: string, queryId: string) {
    const attachment = await this.prisma.attachment.findFirst({
      where: { id: attachmentId, tenantId, queryId: null },
    });
    if (!attachment) throw new NotFoundException('Attachment not found or already linked.');

    return this.prisma.attachment.update({
      where: { id: attachmentId },
      data: { queryId },
    });
  }

  // ---------------------------------------------------------------------------
  // Find by ID (tenant-scoped)
  // ---------------------------------------------------------------------------

  async findById(tenantId: string, id: string) {
    const attachment = await this.prisma.attachment.findFirst({
      where: { id, tenantId },
    });
    if (!attachment) throw new NotFoundException(`Attachment '${id}' not found.`);
    return attachment;
  }
}
