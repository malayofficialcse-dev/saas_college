import {
  Injectable,
  ConflictException,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { QueryStatus } from '@prisma/client';
import { PrismaService } from '../../core/database/prisma.service.js';
import { CreateFeedbackDto } from './dto/create-feedback.dto.js';

@Injectable()
export class FeedbackService {
  constructor(private readonly prisma: PrismaService) {}

  async submit(tenantId: string, userId: string, queryId: string, dto: CreateFeedbackDto) {
    const query = await this.prisma.query.findFirst({
      where: { id: queryId, tenantId },
      include: { student: true, feedback: true },
    });

    if (!query) {
      throw new NotFoundException(`Query '${queryId}' not found.`);
    }

    if (query.student.userId !== userId) {
      throw new ConflictException('Only the student who submitted the ticket can provide feedback.');
    }

    if (query.status !== QueryStatus.RESOLVED && query.status !== QueryStatus.CLOSED) {
      throw new BadRequestException(
        `Feedback can only be submitted for RESOLVED or CLOSED queries (current status: ${query.status}).`,
      );
    }

    if (query.feedback) {
      throw new ConflictException('Feedback has already been recorded for this query.');
    }

    return this.prisma.$transaction(async (tx) => {
      const feedback = await tx.queryFeedback.create({
        data: {
          tenantId,
          queryId,
          studentId: query.studentId ?? query.student?.id ?? null,
          rating: dto.rating,
          resolutionRating: dto.resolutionRating ?? dto.rating,
          responseQualityRating: dto.responseQualityRating ?? dto.rating,
          wasIssueResolved: dto.wasIssueResolved ?? true,
          feedbackText: dto.feedbackText,
        },
      });

      // Automatically transition ticket to permanently CLOSED
      await tx.query.update({
        where: { id: queryId },
        data: {
          status: QueryStatus.CLOSED,
          closedAt: new Date(),
        },
      });

      await tx.queryStatusHistory.create({
        data: {
          tenantId,
          queryId,
          previousStatus: query.status,
          newStatus: QueryStatus.CLOSED,
          changedByUserId: userId,
          remarks: `Student submitted ${dto.rating}-star feedback. Ticket closed.`,
        },
      });

      return feedback;
    });
  }

  async getForQuery(tenantId: string, queryId: string) {
    const feedback = await this.prisma.queryFeedback.findFirst({
      where: { queryId, tenantId },
      include: {
        query: {
          select: { id: true, ticketNumber: true, title: true, status: true },
        },
      },
    });
    if (!feedback) {
      throw new NotFoundException(`Feedback for query '${queryId}' not found.`);
    }
    return feedback;
  }

  async getStudentHistory(tenantId: string, userId: string, page = 1, limit = 20) {
    const student = await this.prisma.student.findFirst({
      where: { tenantId, userId },
    });
    if (!student) {
      throw new NotFoundException('Student profile not found for this tenant.');
    }

    const skip = (page - 1) * limit;
    const where = {
      tenantId,
      query: { studentId: student.id },
    };

    const [total, items] = await Promise.all([
      this.prisma.queryFeedback.count({ where }),
      this.prisma.queryFeedback.findMany({
        where,
        skip,
        take: limit,
        include: {
          query: {
            select: {
              id: true,
              ticketNumber: true,
              title: true,
              status: true,
              resolvedAt: true,
              category: { select: { id: true, name: true } },
            },
          },
        },
        orderBy: { submittedAt: 'desc' },
      }),
    ]);

    return {
      items,
      meta: { total, page, limit, totalPages: Math.ceil(total / limit) },
    };
  }

  async getAnalytics(tenantId: string, departmentId?: string) {
    const where: any = { tenantId };
    if (departmentId) {
      where.query = { departmentId };
    }

    const feedbacks = await this.prisma.queryFeedback.findMany({
      where,
      select: {
        rating: true,
        resolutionRating: true,
        responseQualityRating: true,
        wasIssueResolved: true,
        submittedAt: true,
      },
    });

    const total = feedbacks.length;
    if (total === 0) {
      return {
        totalResponses: 0,
        averageRating: 0,
        averageResolutionRating: 0,
        averageResponseQualityRating: 0,
        issueResolutionRate: 0,
        distribution: { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 },
      };
    }

    let sumRating = 0;
    let sumResolution = 0;
    let sumQuality = 0;
    let resolvedConfirmed = 0;
    const distribution: Record<number, number> = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };

    for (const f of feedbacks) {
      sumRating += f.rating;
      sumResolution += f.resolutionRating ?? f.rating;
      sumQuality += f.responseQualityRating ?? f.rating;
      if (f.wasIssueResolved) resolvedConfirmed += 1;
      distribution[f.rating] = (distribution[f.rating] || 0) + 1;
    }

    return {
      totalResponses: total,
      averageRating: Number((sumRating / total).toFixed(2)),
      averageResolutionRating: Number((sumResolution / total).toFixed(2)),
      averageResponseQualityRating: Number((sumQuality / total).toFixed(2)),
      issueResolutionRate: Number(((resolvedConfirmed / total) * 100).toFixed(1)),
      distribution,
    };
  }
}
