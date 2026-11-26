'use client';

import React, { useState } from 'react';
import {
  BookOpen,
  Search,
  ThumbsUp,
  ThumbsDown,
  Eye,
  Plus,
  ArrowLeft,
  Calendar,
  Share2,
  CheckCircle,
} from 'lucide-react';
import { KnowledgeArticle } from '@/lib/types';
import { MOCK_KB_ARTICLES } from '@/lib/mock-data';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Input } from '@/components/ui/Input';
import { Textarea } from '@/components/ui/Textarea';
import { Modal } from '@/components/ui/Modal';
import { useAuth } from '@/lib/auth-context';

export const KnowledgeBaseView: React.FC = () => {
  const { role } = useAuth();
  const [articles, setArticles] = useState<KnowledgeArticle[]>(MOCK_KB_ARTICLES);
  const [search, setSearch] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('ALL');
  const [readingArticle, setReadingArticle] = useState<KnowledgeArticle | null>(null);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);

  const [form, setForm] = useState({
    title: '',
    category: 'Fees & Accounts',
    excerpt: '',
    content: '',
  });

  const categories = ['ALL', ...Array.from(new Set(articles.map((a) => a.category)))];

  const handleCreateArticle = (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.title || !form.content) return;

    const newArt: KnowledgeArticle = {
      id: `kb-${Date.now()}`,
      title: form.title,
      slug: form.title.toLowerCase().replace(/[^a-z0-9]+/g, '-'),
      category: form.category,
      excerpt: form.excerpt || form.content.slice(0, 100),
      content: form.content,
      viewCount: 1,
      helpfulCount: 0,
      notHelpfulCount: 0,
      publishedAt: new Date().toISOString(),
      version: 1,
    };

    setArticles((prev) => [newArt, ...prev]);
    setIsCreateModalOpen(false);
    setForm({ title: '', category: 'Fees & Accounts', excerpt: '', content: '' });
  };

  const handleVote = (articleId: string, isHelpful: boolean) => {
    setArticles((prev) =>
      prev.map((a) => {
        if (a.id === articleId) {
          return {
            ...a,
            helpfulCount: isHelpful ? a.helpfulCount + 1 : a.helpfulCount,
            notHelpfulCount: !isHelpful ? a.notHelpfulCount + 1 : a.notHelpfulCount,
          };
        }
        return a;
      })
    );

    if (readingArticle && readingArticle.id === articleId) {
      setReadingArticle((prev) =>
        prev
          ? {
              ...prev,
              helpfulCount: isHelpful ? prev.helpfulCount + 1 : prev.helpfulCount,
              notHelpfulCount: !isHelpful ? prev.notHelpfulCount + 1 : prev.notHelpfulCount,
            }
          : null
      );
    }
  };

  const filteredArticles = articles.filter((a) => {
    if (selectedCategory !== 'ALL' && a.category !== selectedCategory) return false;
    if (search) {
      const q = search.toLowerCase();
      const match =
        a.title.toLowerCase().includes(q) ||
        a.excerpt.toLowerCase().includes(q) ||
        a.category.toLowerCase().includes(q);
      if (!match) return false;
    }
    return true;
  });

  const canAuthor = role !== 'STUDENT';

  return (
    <div className="space-y-6 w-full">
      {/* If reading an article */}
      {readingArticle ? (
        <div className="space-y-4">
          <Button
            variant="ghost"
            size="sm"
            icon={<ArrowLeft size={16} />}
            onClick={() => setReadingArticle(null)}
          >
            Back to Knowledge Base
          </Button>

          <Card>
            <div className="space-y-4">
              <div className="flex flex-wrap items-center justify-between gap-2 pb-4 border-b border-[#E5E7EB]">
                <div>
                  <Badge variant="primary">{readingArticle.category}</Badge>
                  <h1 className="text-[22px] font-bold text-[#202938] mt-2">
                    {readingArticle.title}
                  </h1>
                  <div className="flex items-center gap-4 text-xs text-[#667085] mt-1.5">
                    <span className="flex items-center gap-1">
                      <Calendar size={13} />
                      {new Date(readingArticle.publishedAt).toLocaleDateString()}
                    </span>
                    <span className="flex items-center gap-1">
                      <Eye size={13} />
                      {readingArticle.viewCount} views
                    </span>
                    <span>Version {readingArticle.version}.0</span>
                  </div>
                </div>
              </div>

              {/* Content Body */}
              <div className="prose max-w-none text-sm text-[#344054] leading-relaxed whitespace-pre-wrap py-2">
                {readingArticle.content}
              </div>

              {/* Feedback Section */}
              <div className="pt-6 border-t border-[#E5E7EB] flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                <span className="text-xs font-semibold text-[#667085]">
                  Was this answer helpful?
                </span>
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    icon={<ThumbsUp size={14} className="text-[#12B76A]" />}
                    onClick={() => handleVote(readingArticle.id, true)}
                  >
                    Yes ({readingArticle.helpfulCount})
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    icon={<ThumbsDown size={14} className="text-[#B42318]" />}
                    onClick={() => handleVote(readingArticle.id, false)}
                  >
                    No ({readingArticle.notHelpfulCount})
                  </Button>
                </div>
              </div>
            </div>
          </Card>
        </div>
      ) : (
        <>
          {/* Header */}
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <h1 className="text-[24px] font-semibold text-[#202938] tracking-tight">
                Knowledge Base
              </h1>
              <p className="text-[13px] text-[#667085] mt-0.5">
                Official institutional guidelines, SOP documents, and verified answers for students and staff.
              </p>
            </div>

            {canAuthor && (
              <Button
                variant="primary"
                size="sm"
                icon={<Plus size={15} />}
                onClick={() => setIsCreateModalOpen(true)}
              >
                Publish Article
              </Button>
            )}
          </div>

          {/* Search Bar */}
          <Card className="bg-[#EDF3FA] border-[#D0D5DD]">
            <div className="max-w-xl mx-auto py-2 text-center space-y-3">
              <h2 className="text-[17px] font-semibold text-[#202938]">
                Find solutions before opening a ticket
              </h2>
              <div className="relative">
                <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[#98A2B3]" />
                <input
                  type="text"
                  placeholder="Search fees, WiFi credentials, grade revaluation..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  style={{ borderRadius: '4px' }}
                  className="w-full h-[40px] pl-10 pr-3 text-[13px] bg-white border border-[#D0D5DD] placeholder-[#98A2B3] focus:border-[#4779B8] focus:outline-none shadow-sm"
                />
              </div>
            </div>
          </Card>

          {/* Category Filter Pills */}
          <div className="flex items-center gap-2 overflow-x-auto pb-1">
            {categories.map((cat) => (
              <button
                key={cat}
                onClick={() => setSelectedCategory(cat)}
                style={{ borderRadius: '4px' }}
                className={`px-3 py-1.5 text-xs font-medium transition-colors whitespace-nowrap cursor-pointer ${
                  selectedCategory === cat
                    ? 'bg-[#4779B8] text-white'
                    : 'bg-white border border-[#D0D5DD] text-[#344054] hover:bg-[#F9FAFB]'
                }`}
              >
                {cat === 'ALL' ? 'All Topics' : cat}
              </button>
            ))}
          </div>

          {/* Articles Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredArticles.map((article) => (
              <Card
                key={article.id}
                className="hover:border-[#4779B8] transition-colors cursor-pointer flex flex-col justify-between"
                onClick={() => {
                  setReadingArticle(article);
                  setArticles((prev) =>
                    prev.map((a) => (a.id === article.id ? { ...a, viewCount: a.viewCount + 1 } : a))
                  );
                }}
              >
                <div>
                  <div className="flex items-center justify-between">
                    <Badge variant="primary">{article.category}</Badge>
                    <span className="text-[11px] text-[#667085] flex items-center gap-1">
                      <Eye size={12} /> {article.viewCount}
                    </span>
                  </div>
                  <h3 className="font-semibold text-[#202938] text-[15px] mt-2.5 leading-snug">
                    {article.title}
                  </h3>
                  <p className="text-xs text-[#667085] mt-2 line-clamp-2">{article.excerpt}</p>
                </div>

                <div className="mt-4 pt-3 border-t border-[#E5E7EB] flex items-center justify-between text-xs text-[#667085]">
                  <span className="text-[#12B76A] font-medium flex items-center gap-1">
                    <ThumbsUp size={12} /> {article.helpfulCount} helpful
                  </span>
                  <span className="text-[#4779B8] font-medium hover:underline">Read Article →</span>
                </div>
              </Card>
            ))}
          </div>
        </>
      )}

      {/* Modal: Publish Article */}
      <Modal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        title="Publish Knowledge Article"
        description="Share institutional SOPs, guidelines, or troubleshooting steps."
        footer={
          <div className="flex justify-end gap-2">
            <Button variant="outline" size="sm" onClick={() => setIsCreateModalOpen(false)}>
              Cancel
            </Button>
            <Button variant="primary" size="sm" onClick={handleCreateArticle}>
              Publish Now
            </Button>
          </div>
        }
      >
        <form onSubmit={handleCreateArticle} className="space-y-4">
          <Input
            label="Article Title"
            placeholder="e.g. How to Submit Exam Backlog Registration"
            value={form.title}
            onChange={(e) => setForm({ ...form, title: e.target.value })}
            required
          />
          <Input
            label="Category"
            placeholder="e.g. Examination"
            value={form.category}
            onChange={(e) => setForm({ ...form, category: e.target.value })}
            required
          />
          <Input
            label="Brief Summary / Excerpt"
            placeholder="Short description shown on preview card..."
            value={form.excerpt}
            onChange={(e) => setForm({ ...form, excerpt: e.target.value })}
          />
          <Textarea
            label="Full Article Content (Markdown formatted)"
            placeholder="Write steps, requirements, policies..."
            rows={6}
            value={form.content}
            onChange={(e) => setForm({ ...form, content: e.target.value })}
            required
          />
        </form>
      </Modal>
    </div>
  );
};
