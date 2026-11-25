import 'reflect-metadata';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import { ArticleStatus, FaqStatus, FaqVisibility, QueryStatus } from '@prisma/client';
import { FaqsService } from '../src/modules/faqs/faqs.service.js';
import { KnowledgeBaseService } from '../src/modules/knowledge-base/knowledge-base.service.js';
import { FeedbackService } from '../src/modules/feedback/feedback.service.js';

describe('FAQs, Knowledge Base & Feedback Suite', () => {
  // ---------------------------------------------------------------------------
  // 1. FAQs Service
  // ---------------------------------------------------------------------------
  describe('FaqsService', () => {
    let faqsService: FaqsService;
    let mockPrisma: any;

    beforeEach(() => {
      mockPrisma = {
        queryCategory: { findFirst: vi.fn() },
        faq: {
          create: vi.fn(),
          findFirst: vi.fn(),
          findMany: vi.fn(),
          count: vi.fn(),
          update: vi.fn(),
        },
        auditLog: { create: vi.fn() },
        $transaction: vi.fn(async (cb) => cb(mockPrisma)),
      };
      faqsService = new FaqsService(mockPrisma);
    });

    it('should create a tenant-specific FAQ linked to a QueryCategory and record audit log', async () => {
      mockPrisma.queryCategory.findFirst.mockResolvedValue({ id: 'cat-fees', tenantId: 'tenant-1' });
      mockPrisma.faq.create.mockImplementation(({ data }: any) =>
        Promise.resolve({ id: 'faq-1', ...data }),
      );

      const faq = await faqsService.create('tenant-1', 'admin-1', {
        categoryId: 'cat-fees',
        question: 'How do I pay tuition fees online?',
        answer: 'Use the Accounts portal with UPI or net banking.',
        tags: ['fees', 'payment'],
        visibility: FaqVisibility.STUDENTS_ONLY,
        status: FaqStatus.PUBLISHED,
      });

      expect(faq.status).toBe(FaqStatus.PUBLISHED);
      expect(faq.visibility).toBe(FaqVisibility.STUDENTS_ONLY);
      expect(mockPrisma.auditLog.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ action: 'FAQ_CREATED', entityId: 'faq-1' }),
        }),
      );
    });

    it('should block students from viewing STAFF_ONLY or unpublished FAQs', async () => {
      mockPrisma.faq.findFirst.mockResolvedValue({
        id: 'faq-staff',
        tenantId: 'tenant-1',
        visibility: FaqVisibility.STAFF_ONLY,
        status: FaqStatus.PUBLISHED,
      });

      await expect(
        faqsService.findOne('tenant-1', 'faq-staff', 'STUDENT'),
      ).rejects.toThrow(ForbiddenException);

      mockPrisma.faq.findFirst.mockResolvedValue({
        id: 'faq-draft',
        tenantId: 'tenant-1',
        visibility: FaqVisibility.PUBLIC,
        status: FaqStatus.DRAFT,
      });

      await expect(
        faqsService.findOne('tenant-1', 'faq-draft', 'STUDENT'),
      ).rejects.toThrow(NotFoundException);
    });

    it('should publish and archive an FAQ with audit trail', async () => {
      mockPrisma.faq.findFirst.mockResolvedValue({
        id: 'faq-1',
        tenantId: 'tenant-1',
        status: FaqStatus.DRAFT,
      });
      mockPrisma.faq.update.mockResolvedValue({
        id: 'faq-1',
        status: FaqStatus.PUBLISHED,
      });

      const published = await faqsService.publish('tenant-1', 'faq-1', 'admin-1');
      expect(published.status).toBe(FaqStatus.PUBLISHED);

      mockPrisma.faq.findFirst.mockResolvedValue({
        id: 'faq-1',
        tenantId: 'tenant-1',
        status: FaqStatus.PUBLISHED,
      });
      mockPrisma.faq.update.mockResolvedValue({
        id: 'faq-1',
        status: FaqStatus.ARCHIVED,
      });

      const archived = await faqsService.archive('tenant-1', 'faq-1', 'admin-1');
      expect(archived.status).toBe(FaqStatus.ARCHIVED);
    });

    it('should rank relevant FAQ suggestions by category and keyword relevance', async () => {
      mockPrisma.faq.findMany.mockResolvedValue([
        {
          id: 'faq-hostel',
          categoryId: 'cat-hostel',
          question: 'How do I report hostel WiFi issues?',
          answer: 'Submit a ticket under Hostel Support.',
          tags: ['hostel', 'wifi'],
          helpfulCount: 3,
        },
        {
          id: 'faq-fees',
          categoryId: 'cat-fees',
          question: 'How to download fee receipt?',
          answer: 'Go to Accounts -> Receipts and click download PDF.',
          tags: ['fees', 'receipt'],
          helpfulCount: 8,
        },
      ]);

      const suggestions = await faqsService.suggest('tenant-1', 'STUDENT', {
        categoryId: 'cat-fees',
        query: 'fee receipt download',
        limit: 5,
      });

      expect(suggestions).toHaveLength(1);
      expect(suggestions[0].id).toBe('faq-fees');
      expect(suggestions[0].relevanceScore).toBeGreaterThan(10);
    });
  });

  // ---------------------------------------------------------------------------
  // 2. Knowledge Base Service
  // ---------------------------------------------------------------------------
  describe('KnowledgeBaseService', () => {
    let kbService: KnowledgeBaseService;
    let mockPrisma: any;

    beforeEach(() => {
      mockPrisma = {
        knowledgeArticle: {
          findFirst: vi.fn(),
          findMany: vi.fn(),
          count: vi.fn(),
          create: vi.fn(),
          update: vi.fn(),
        },
        knowledgeArticleVersion: {
          create: vi.fn(),
          findMany: vi.fn(),
        },
        knowledgeArticleFeedback: {
          upsert: vi.fn(),
          count: vi.fn(),
        },
        queryCategory: { findFirst: vi.fn(), findMany: vi.fn() },
        faq: { findFirst: vi.fn(), findMany: vi.fn() },
        auditLog: { create: vi.fn() },
        $transaction: vi.fn(async (cb) => cb(mockPrisma)),
      };
      kbService = new KnowledgeBaseService(mockPrisma);
    });

    it('should create a draft article with version 1 snapshot and enforce unique slug per tenant', async () => {
      mockPrisma.knowledgeArticle.findFirst.mockResolvedValueOnce(null);
      mockPrisma.queryCategory.findFirst.mockResolvedValue({ id: 'cat-1' });
      mockPrisma.knowledgeArticle.create.mockImplementation(({ data }: any) =>
        Promise.resolve({ id: 'art-1', ...data }),
      );

      const article = await kbService.create('tenant-1', 'staff-1', {
        categoryId: 'cat-1',
        slug: 'bonafide-guide',
        title: 'Bonafide Certificate Guide',
        content: 'Step 1: Apply online.',
        tags: ['bonafide', 'certificates'],
      });

      expect(article.version).toBe(1);
      expect(article.status).toBe(ArticleStatus.DRAFT);
      expect(mockPrisma.knowledgeArticleVersion.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ version: 1, articleId: 'art-1' }),
        }),
      );

      // Duplicate slug check
      mockPrisma.knowledgeArticle.findFirst.mockResolvedValueOnce({ id: 'art-1' });
      await expect(
        kbService.create('tenant-1', 'staff-1', {
          slug: 'bonafide-guide',
          title: 'Duplicate',
          content: '...',
        }),
      ).rejects.toThrow(ConflictException);
    });

    it('should increment version and store version history snapshot on update', async () => {
      mockPrisma.knowledgeArticle.findFirst.mockResolvedValue({
        id: 'art-1',
        tenantId: 'tenant-1',
        slug: 'bonafide-guide',
        version: 1,
      });
      mockPrisma.knowledgeArticle.update.mockResolvedValue({
        id: 'art-1',
        title: 'Updated Bonafide Guide',
        summary: 'Updated summary',
        content: 'Step 1 & 2',
        tags: ['bonafide'],
        version: 2,
      });

      const updated = await kbService.update('tenant-1', 'art-1', 'staff-1', {
        title: 'Updated Bonafide Guide',
        changeNote: 'Added step 2',
      });

      expect(updated.version).toBe(2);
      expect(mockPrisma.knowledgeArticleVersion.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            articleId: 'art-1',
            version: 2,
            changeNote: 'Added step 2',
          }),
        }),
      );
    });

    it('should record helpful/not-helpful feedback idempotently and recalculate counts', async () => {
      mockPrisma.knowledgeArticle.findFirst.mockResolvedValue({
        id: 'art-1',
        tenantId: 'tenant-1',
        status: ArticleStatus.PUBLISHED,
      });
      mockPrisma.knowledgeArticleFeedback.upsert.mockResolvedValue({
        id: 'fb-1',
        isHelpful: true,
      });
      mockPrisma.knowledgeArticleFeedback.count
        .mockResolvedValueOnce(12)
        .mockResolvedValueOnce(1);

      const res = await kbService.submitFeedback('tenant-1', 'art-1', 'student-1', {
        isHelpful: true,
        comment: 'Saved me from raising a ticket!',
      });

      expect(res.helpfulCount).toBe(12);
      expect(res.notHelpfulCount).toBe(1);
      expect(mockPrisma.knowledgeArticle.update).toHaveBeenCalledWith({
        where: { id: 'art-1' },
        data: { helpfulCount: 12, notHelpfulCount: 1 },
      });
    });

    it('should search published articles, FAQs, and categories for pre-query deflection', async () => {
      mockPrisma.knowledgeArticle.findMany.mockResolvedValue([
        { id: 'art-1', slug: 'exam-revaluation', title: 'Exam Revaluation Process' },
      ]);
      mockPrisma.faq.findMany.mockResolvedValue([
        { id: 'faq-1', question: 'What is the revaluation fee?' },
      ]);
      mockPrisma.queryCategory.findMany.mockResolvedValue([
        { id: 'cat-exam', name: 'Examination', slug: 'examination', description: 'Exam queries' },
      ]);

      const result = await kbService.search('tenant-1', 'revaluation');

      expect(result.articles).toHaveLength(1);
      expect(result.suggestedFaqs).toHaveLength(1);
      expect(result.deflectionArticles).toHaveLength(1);
    });
  });

  // ---------------------------------------------------------------------------
  // 3. Feedback Service
  // ---------------------------------------------------------------------------
  describe('FeedbackService', () => {
    let feedbackService: FeedbackService;
    let mockPrisma: any;

    beforeEach(() => {
      mockPrisma = {
        query: { findFirst: vi.fn(), update: vi.fn() },
        student: { findFirst: vi.fn() },
        queryFeedback: {
          create: vi.fn(),
          findFirst: vi.fn(),
          findMany: vi.fn(),
          count: vi.fn(),
        },
        queryStatusHistory: { create: vi.fn() },
        $transaction: vi.fn(async (cb) => cb(mockPrisma)),
      };
      feedbackService = new FeedbackService(mockPrisma);
    });

    it('should reject feedback on non-resolved queries and prevent duplicate submissions', async () => {
      mockPrisma.query.findFirst.mockResolvedValue({
        id: 'q-open',
        status: QueryStatus.OPEN,
        student: { userId: 'student-1' },
        feedback: null,
      });

      await expect(
        feedbackService.submit('tenant-1', 'student-1', 'q-open', { rating: 5 }),
      ).rejects.toThrow(BadRequestException);

      mockPrisma.query.findFirst.mockResolvedValue({
        id: 'q-dup',
        status: QueryStatus.CLOSED,
        student: { userId: 'student-1' },
        feedback: { id: 'existing-fb', rating: 4 },
      });

      await expect(
        feedbackService.submit('tenant-1', 'student-1', 'q-dup', { rating: 5 }),
      ).rejects.toThrow(ConflictException);
    });

    it('should submit multi-dimensional feedback and aggregate analytics', async () => {
      mockPrisma.query.findFirst.mockResolvedValue({
        id: 'q-1',
        studentId: 'stu-profile-1',
        status: QueryStatus.RESOLVED,
        student: { id: 'stu-profile-1', userId: 'student-1' },
        feedback: null,
      });
      mockPrisma.queryFeedback.create.mockImplementation(({ data }: any) =>
        Promise.resolve({ id: 'fb-1', ...data }),
      );

      const fb = await feedbackService.submit('tenant-1', 'student-1', 'q-1', {
        rating: 5,
        resolutionRating: 5,
        responseQualityRating: 4,
        wasIssueResolved: true,
        feedbackText: 'Great support!',
      });

      expect(fb.resolutionRating).toBe(5);
      expect(fb.responseQualityRating).toBe(4);
      expect(mockPrisma.query.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 'q-1' },
          data: expect.objectContaining({ status: QueryStatus.CLOSED }),
        }),
      );

      mockPrisma.queryFeedback.findMany.mockResolvedValue([
        { rating: 5, resolutionRating: 5, responseQualityRating: 5, wasIssueResolved: true },
        { rating: 4, resolutionRating: 4, responseQualityRating: 3, wasIssueResolved: true },
      ]);

      const analytics = await feedbackService.getAnalytics('tenant-1');
      expect(analytics.totalResponses).toBe(2);
      expect(analytics.averageRating).toBe(4.5);
      expect(analytics.averageResponseQualityRating).toBe(4);
      expect(analytics.issueResolutionRate).toBe(100);
    });
  });
});
