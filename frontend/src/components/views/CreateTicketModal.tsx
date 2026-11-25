'use client';

import React, { useState } from 'react';
import { Modal } from '@/components/ui/Modal';
import { Input } from '@/components/ui/Input';
import { Textarea } from '@/components/ui/Textarea';
import { Select } from '@/components/ui/Select';
import { Button } from '@/components/ui/Button';
import { useAuth } from '@/lib/auth-context';
import { QueryPriority } from '@/lib/types';
import { AlertCircle, Upload, CheckCircle2 } from 'lucide-react';

export const CreateTicketModal: React.FC<{
  isOpen: boolean;
  onClose: () => void;
}> = ({ isOpen, onClose }) => {
  const { user, tenant, addTicket } = useAuth();
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState('Fees & Accounts');
  const [department, setDepartment] = useState('Finance & Accounts');
  const [departmentCode, setDepartmentCode] = useState('FIN');
  const [priority, setPriority] = useState<QueryPriority>('MEDIUM');
  const [fileName, setFileName] = useState<string | null>(null);

  // Category -> Department mapping
  const handleCategoryChange = (cat: string) => {
    setCategory(cat);
    if (cat === 'Fees & Accounts') {
      setDepartment('Finance & Accounts');
      setDepartmentCode('FIN');
    } else if (cat === 'Examination') {
      setDepartment('Controller of Examinations');
      setDepartmentCode('COE');
    } else if (cat === 'Academic Inquiries') {
      setDepartment('Computer Science & Engineering');
      setDepartmentCode('CSE');
    } else if (cat === 'Hostel & Facilities' || cat === 'Certificates & Documents') {
      setDepartment('Campus Administration');
      setDepartmentCode('ADM');
    } else if (cat === 'Technical Support') {
      setDepartment('IT & Infrastructure');
      setDepartmentCode('IT');
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !description.trim()) return;

    // Calculate SLA deadline: 48h from now
    const deadline = new Date();
    deadline.setHours(deadline.getHours() + 48);

    addTicket({
      title,
      description,
      category,
      department,
      departmentCode,
      studentName: `${user.firstName} ${user.lastName}`,
      studentEmail: user.email,
      studentEnrollment: user.enrollmentNumber || 'ENR-2025-042',
      priority,
      status: 'OPEN',
      slaDeadline: deadline.toISOString(),
    });

    setTitle('');
    setDescription('');
    setFileName(null);
    onClose();
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Create New Query Ticket"
      description="Submit a verified query directly to the responsible academic or administrative department."
      maxWidth="lg"
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Deflection suggestion */}
        <div
          style={{ borderRadius: '4px' }}
          className="p-3 bg-[#EDF3FA] border border-[#C5DAF0] flex items-start gap-2.5 text-[12px] text-[#202938]"
        >
          <AlertCircle size={16} className="text-[#4779B8] shrink-0 mt-0.5" />
          <div>
            <span className="font-semibold text-[#4779B8]">
              Automated Department Routing:
            </span>{' '}
            Selecting your category automatically assigns ticket ownership to the appropriate desk with a binding 48-hour SLA response deadline.
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <Select
            label="Query Category"
            value={category}
            onChange={(e) => handleCategoryChange(e.target.value)}
            options={[
              { value: 'Fees & Accounts', label: 'Fees & Accounts' },
              { value: 'Examination', label: 'Examination & Grades' },
              { value: 'Academic Inquiries', label: 'Academic & Course Inquiry' },
              { value: 'Certificates & Documents', label: 'Certificates & Bonafide' },
              { value: 'Hostel & Facilities', label: 'Hostel & Campus Facilities' },
              { value: 'Technical Support', label: 'IT & Wi-Fi Support' },
            ]}
          />

          <Select
            label="Priority Level"
            value={priority}
            onChange={(e) => setPriority(e.target.value as QueryPriority)}
            options={[
              { value: 'LOW', label: 'Low — General Question' },
              { value: 'MEDIUM', label: 'Medium — Normal Request' },
              { value: 'HIGH', label: 'High — Important Deadline' },
              { value: 'URGENT', label: 'Urgent — Blocking Academic Progress' },
            ]}
          />
        </div>

        <Input
          label="Subject / Ticket Title"
          placeholder="e.g., Missing receipt for Semester 4 fee transaction"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          required
        />

        <Textarea
          label="Detailed Description"
          placeholder="Describe your issue with relevant details (dates, transaction IDs, subject codes)..."
          rows={4}
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          required
        />

        {/* Attachment Upload Box */}
        <div>
          <label className="block text-[13px] font-medium text-[#202938] mb-1">
            Attachment (Optional)
          </label>
          <div
            style={{ borderRadius: '4px' }}
            className="border-2 border-dashed border-[#E5E7EB] hover:border-[#4779B8] p-4 text-center cursor-pointer transition-colors bg-[#F9FAFB]"
            onClick={() => setFileName(fileName ? null : 'proof_document.pdf')}
          >
            {fileName ? (
              <div className="flex items-center justify-center gap-2 text-[#26966A] text-[13px] font-medium">
                <CheckCircle2 size={16} />
                <span>{fileName} attached (Click to remove)</span>
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center text-[12px] text-[#667085]">
                <Upload size={18} className="text-[#98A2B3] mb-1" />
                <span>Click or drag PDF, JPG, PNG up to 20MB</span>
              </div>
            )}
          </div>
        </div>

        {/* Modal actions */}
        <div className="flex items-center justify-end gap-2 pt-3 border-t border-[#E5E7EB]">
          <Button variant="outline" type="button" onClick={onClose}>
            Cancel
          </Button>
          <Button variant="primary" type="submit">
            Submit Query
          </Button>
        </div>
      </form>
    </Modal>
  );
};
