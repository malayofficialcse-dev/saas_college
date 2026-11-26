'use client';

import React, { useState } from 'react';
import {
  HelpCircle,
  Search,
  ChevronDown,
  ChevronUp,
  ThumbsUp,
  Plus,
  MessageSquare,
  Sparkles,
} from 'lucide-react';
import { FaqItem } from '@/lib/types';
import { MOCK_FAQS } from '@/lib/mock-data';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Input } from '@/components/ui/Input';
import { Textarea } from '@/components/ui/Textarea';
import { Modal } from '@/components/ui/Modal';
import { useAuth } from '@/lib/auth-context';

export const FaqsView: React.FC = () => {
  const { role } = useAuth();
  const [faqs, setFaqs] = useState<FaqItem[]>(MOCK_FAQS);
  const [search, setSearch] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('ALL');
  const [expandedId, setExpandedId] = useState<string | null>(faqs[0]?.id || null);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);

  const [form, setForm] = useState({
    question: '',
    answer: '',
    category: 'Fees & Accounts',
  });

  const categories = ['ALL', ...Array.from(new Set(faqs.map((f) => f.category)))];

  const handleAddFaq = (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.question || !form.answer) return;

    const newFaq: FaqItem = {
      id: `faq-${Date.now()}`,
      question: form.question,
      answer: form.answer,
      category: form.category,
      helpfulCount: 0,
    };

    setFaqs((prev) => [newFaq, ...prev]);
    setIsAddModalOpen(false);
    setForm({ question: '', answer: '', category: 'Fees & Accounts' });
  };

  const handleUpvote = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setFaqs((prev) =>
      prev.map((f) => (f.id === id ? { ...f, helpfulCount: f.helpfulCount + 1 } : f))
    );
  };

  const toggleExpand = (id: string) => {
    setExpandedId((prev) => (prev === id ? null : id));
  };

  const filteredFaqs = faqs.filter((f) => {
    if (selectedCategory !== 'ALL' && f.category !== selectedCategory) return false;
    if (search) {
      const q = search.toLowerCase();
      const match =
        f.question.toLowerCase().includes(q) ||
        f.answer.toLowerCase().includes(q) ||
        f.category.toLowerCase().includes(q);
      if (!match) return false;
    }
    return true;
  });

  const canAdd = role !== 'STUDENT';

  return (
    <div className="space-y-6 w-full">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-[24px] font-semibold text-[#202938] tracking-tight">
            Frequently Asked Questions
          </h1>
          <p className="text-[13px] text-[#667085] mt-0.5">
            Quick answers to everyday student inquiries compiled by college administration.
          </p>
        </div>

        {canAdd && (
          <Button
            variant="primary"
            size="sm"
            icon={<Plus size={15} />}
            onClick={() => setIsAddModalOpen(true)}
          >
            Add FAQ
          </Button>
        )}
      </div>

      {/* Search Header Banner */}
      <Card className="bg-[#F9FAFB] border-[#E5E7EB]">
        <div className="max-w-xl mx-auto py-2 space-y-3">
          <div className="relative">
            <Search size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[#98A2B3]" />
            <input
              type="text"
              placeholder="Search across questions and answers..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              style={{ borderRadius: '4px' }}
              className="w-full h-[40px] pl-10 pr-3 text-[13px] bg-white border border-[#D0D5DD] placeholder-[#98A2B3] focus:border-[#4779B8] focus:outline-none"
            />
          </div>
        </div>
      </Card>

      {/* Category Pills */}
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
            {cat === 'ALL' ? 'All Categories' : cat}
          </button>
        ))}
      </div>

      {/* Accordion FAQ List */}
      <div className="space-y-3">
        {filteredFaqs.map((faq) => {
          const isExpanded = expandedId === faq.id;
          return (
            <div
              key={faq.id}
              className="border border-[#E5E7EB] bg-white transition-colors"
              style={{ borderRadius: '4px' }}
            >
              <div
                onClick={() => toggleExpand(faq.id)}
                className="p-4 flex items-center justify-between cursor-pointer hover:bg-[#F9FAFB]"
              >
                <div className="flex items-start gap-3 pr-4">
                  <div
                    style={{ borderRadius: '4px' }}
                    className="w-7 h-7 bg-[#EDF3FA] text-[#4779B8] flex items-center justify-center shrink-0 mt-0.5"
                  >
                    <HelpCircle size={15} />
                  </div>
                  <div>
                    <Badge variant="neutral" className="mb-1 text-[10px]">
                      {faq.category}
                    </Badge>
                    <h3 className="font-semibold text-[14px] text-[#202938]">
                      {faq.question}
                    </h3>
                  </div>
                </div>

                <div className="flex items-center gap-3 shrink-0">
                  <button
                    onClick={(e) => handleUpvote(faq.id, e)}
                    style={{ borderRadius: '4px' }}
                    className="flex items-center gap-1 px-2 py-1 text-xs text-[#667085] hover:text-[#12B76A] hover:bg-[#F2F4F7] transition-colors"
                    title="Mark helpful"
                  >
                    <ThumbsUp size={13} />
                    <span>{faq.helpfulCount}</span>
                  </button>

                  <div className="text-[#98A2B3]">
                    {isExpanded ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
                  </div>
                </div>
              </div>

              {isExpanded && (
                <div className="px-5 pb-5 pt-1 text-sm text-[#344054] leading-relaxed border-t border-[#F2F4F7] bg-[#FCFCFD]">
                  <p>{faq.answer}</p>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Modal: Add FAQ */}
      <Modal
        isOpen={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
        title="Create FAQ Entry"
        description="Add a common question and verified answer to the student knowledge portal."
        footer={
          <div className="flex justify-end gap-2">
            <Button variant="outline" size="sm" onClick={() => setIsAddModalOpen(false)}>
              Cancel
            </Button>
            <Button variant="primary" size="sm" onClick={handleAddFaq}>
              Save FAQ
            </Button>
          </div>
        }
      >
        <form onSubmit={handleAddFaq} className="space-y-4">
          <Input
            label="Category"
            placeholder="e.g. Fees & Accounts"
            value={form.category}
            onChange={(e) => setForm({ ...form, category: e.target.value })}
            required
          />
          <Input
            label="Question"
            placeholder="e.g. How do I request an official course syllabus copy?"
            value={form.question}
            onChange={(e) => setForm({ ...form, question: e.target.value })}
            required
          />
          <Textarea
            label="Verified Answer"
            placeholder="Clear, authoritative answer explaining the procedure..."
            rows={4}
            value={form.answer}
            onChange={(e) => setForm({ ...form, answer: e.target.value })}
            required
          />
        </form>
      </Modal>
    </div>
  );
};
