import {
  Injectable,
  ConflictException,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../../core/database/prisma.service.js';
import {
  CreateAcademicSessionDto,
  UpdateAcademicSessionDto,
} from './dto/create-academic-session.dto.js';

@Injectable()
export class AcademicSessionsService {
  constructor(private readonly prisma: PrismaService) {}

  async create(tenantId: string, dto: CreateAcademicSessionDto, actorId?: string) {
    const existing = await this.prisma.academicSession.findFirst({
      where: { tenantId, name: dto.name },
    });
    if (existing) {
      throw new ConflictException(`Academic session '${dto.name}' already exists.`);
    }

    const startDate = new Date(dto.startDate);
    const endDate = new Date(dto.endDate);
    if (endDate <= startDate) {
      throw new BadRequestException('Session end date must be after start date.');
    }

    return this.prisma.$transaction(async (tx) => {
      // If marked active, deactivate any currently active session
      if (dto.isActive) {
        await tx.academicSession.updateMany({
          where: { tenantId, isActive: true },
          data: { isActive: false },
        });
      }

      const session = await tx.academicSession.create({
        data: {
          tenantId,
          name: dto.name,
          startDate,
          endDate,
          isActive: dto.isActive ?? false,
        },
      });

      await tx.auditLog.create({
        data: {
          tenantId,
          userId: actorId || null,
          action: 'ACADEMIC_SESSION_CREATED',
          entityName: 'AcademicSession',
          entityId: session.id,
          newValues: { name: session.name, startDate, endDate, isActive: session.isActive },
        },
      });

      return session;
    });
  }

  async findAll(tenantId: string) {
    return this.prisma.academicSession.findMany({
      where: { tenantId },
      include: {
        _count: { select: { students: true } },
      },
      orderBy: { startDate: 'desc' },
    });
  }

  async findActiveSession(tenantId: string) {
    const active = await this.prisma.academicSession.findFirst({
      where: { tenantId, isActive: true },
      include: {
        _count: { select: { students: true } },
      },
    });
    if (!active) {
      throw new NotFoundException('No active academic session found for this college.');
    }
    return active;
  }

  async findOne(tenantId: string, id: string) {
    const session = await this.prisma.academicSession.findFirst({
      where: { id, tenantId },
      include: {
        _count: { select: { students: true } },
      },
    });
    if (!session) {
      throw new NotFoundException(`Academic session '${id}' not found.`);
    }
    return session;
  }

  async update(tenantId: string, id: string, dto: UpdateAcademicSessionDto, actorId?: string) {
    const session = await this.prisma.academicSession.findFirst({
      where: { id, tenantId },
    });
    if (!session) {
      throw new NotFoundException(`Academic session '${id}' not found.`);
    }

    return this.prisma.$transaction(async (tx) => {
      // If marking active, deactivate all other sessions
      if (dto.isActive) {
        await tx.academicSession.updateMany({
          where: { tenantId, id: { not: id }, isActive: true },
          data: { isActive: false },
        });
      }

      const updateData: any = {};
      if (dto.name) updateData.name = dto.name;
      if (dto.startDate) updateData.startDate = new Date(dto.startDate);
      if (dto.endDate) updateData.endDate = new Date(dto.endDate);
      if (typeof dto.isActive === 'boolean') updateData.isActive = dto.isActive;

      const updated = await tx.academicSession.update({
        where: { id },
        data: updateData,
      });

      await tx.auditLog.create({
        data: {
          tenantId,
          userId: actorId || null,
          action: 'ACADEMIC_SESSION_UPDATED',
          entityName: 'AcademicSession',
          entityId: id,
          oldValues: { name: session.name, isActive: session.isActive },
          newValues: updateData,
        },
      });

      return updated;
    });
  }

  /**
   * Transition to Next Academic Session
   * Atomically switches active session and promotes students' semester
   */
  async transition(
    tenantId: string,
    targetSessionId: string,
    promoteStudents = true,
    actorId?: string,
  ) {
    const nextSession = await this.prisma.academicSession.findFirst({
      where: { id: targetSessionId, tenantId },
    });
    if (!nextSession) {
      throw new NotFoundException(`Target academic session '${targetSessionId}' not found.`);
    }

    return this.prisma.$transaction(async (tx) => {
      // Deactivate all sessions
      await tx.academicSession.updateMany({
        where: { tenantId, isActive: true },
        data: { isActive: false },
      });

      // Activate target session
      const activated = await tx.academicSession.update({
        where: { id: targetSessionId },
        data: { isActive: true },
      });

      let promotedCount = 0;
      if (promoteStudents) {
        // Increment currentSemester by 1 for all active students up to max duration
        const updateResult = await tx.student.updateMany({
          where: { tenantId },
          data: {
            currentSemester: { increment: 1 },
            academicSessionId: targetSessionId,
          },
        });
        promotedCount = updateResult.count;
      }

      await tx.auditLog.create({
        data: {
          tenantId,
          userId: actorId || null,
          action: 'ACADEMIC_SESSION_TRANSITIONED',
          entityName: 'AcademicSession',
          entityId: targetSessionId,
          newValues: {
            activatedSession: nextSession.name,
            promotedStudentsCount: promotedCount,
          },
        },
      });

      return {
        success: true,
        message: `Successfully transitioned to academic session '${nextSession.name}'.`,
        activatedSession: activated,
        promotedStudentsCount: promotedCount,
      };
    });
  }
}
