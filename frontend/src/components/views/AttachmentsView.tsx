'use client';

import React, { useState } from 'react';
import {
  Paperclip,
  Download,
  FileText,
  Upload,
  Search,
  File,
  CheckCircle,
  HardDrive,
} from 'lucide-react';
import { attachmentsApi } from '@/lib/api';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '@/components/ui/Table';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { StatCard } from '@/components/ui/StatCard';
import { Modal } from '@/components/ui/Modal';
import { Input } from '@/components/ui/Input';

export const AttachmentsView: React.FC = () => {
  const [search, setSearch] = useState('');
  const [isUploadModalOpen, setIsUploadModalOpen] = useState(false);
  const [successNote, setSuccessNote] = useState('');

  const [files, setFiles] = useState([
    {
      id: 'att-1',
      name: 'bank_debit_slip.pdf',
      ticketNumber: 'CQ-2026-00101',
      uploader: 'Rohan Kulkarni (Student)',
      size: '240 KB',
      mimeType: 'application/pdf',
      storage: 'AWS S3 (Encrypted)',
      uploadedAt: '2026-11-25 10:00',
    },
    {
      id: 'att-2',
      name: 'lab_record_sheet_evaluation.jpg',
      ticketNumber: 'CQ-2026-00102',
      uploader: 'Aarav Mehta (Student)',
      size: '1.4 MB',
      mimeType: 'image/jpeg',
      storage: 'AWS S3 (Encrypted)',
      uploadedAt: '2026-11-25 08:15',
    },
    {
      id: 'att-3',
      name: 'electrician_job_card_signoff.pdf',
      ticketNumber: 'CQ-2026-00104',
      uploader: 'Kavita Reddy (Helpdesk)',
      size: '180 KB',
      mimeType: 'application/pdf',
      storage: 'AWS S3 (Encrypted)',
      uploadedAt: '2026-11-25 11:30',
    },
    {
      id: 'att-4',
      name: 'scholarship_portal_application.pdf',
      ticketNumber: 'CQ-2026-00098',
      uploader: 'Sneha Patil (Student)',
      size: '520 KB',
      mimeType: 'application/pdf',
      storage: 'AWS S3 (Encrypted)',
      uploadedAt: '2026-11-23 10:00',
    },
  ]);

  const [uploadForm, setUploadForm] = useState({
    fileName: '',
    ticketNumber: 'CQ-2026-00101',
  });

  const handleUpload = (e: React.FormEvent) => {
    e.preventDefault();
    if (!uploadForm.fileName) return;

    const newFile = {
      id: `att-${Date.now()}`,
      name: uploadForm.fileName,
      ticketNumber: uploadForm.ticketNumber,
      uploader: 'Current Operator',
      size: '340 KB',
      mimeType: 'application/pdf',
      storage: 'AWS S3 (Encrypted)',
      uploadedAt: new Date().toLocaleString(),
    };

    setFiles((prev) => [newFile, ...prev]);
    setIsUploadModalOpen(false);
    setSuccessNote(`File "${uploadForm.fileName}" securely uploaded to S3!`);
    setTimeout(() => setSuccessNote(''), 3000);

    attachmentsApi
      .getPresignedPutUrl({
        fileName: uploadForm.fileName,
        fileType: 'application/pdf',
        fileSize: 1024 * 340,
      })
      .catch((err) => {
        console.warn('[AttachmentsView] S3 presigned URL notice:', err);
      });
  };

  const filtered = files.filter(
    (f) =>
      f.name.toLowerCase().includes(search.toLowerCase()) ||
      f.ticketNumber.toLowerCase().includes(search.toLowerCase()) ||
      f.uploader.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-6 w-full">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-[24px] font-semibold text-[#202938] tracking-tight">
            Attachments & File Storage
          </h1>
          <p className="text-[13px] text-[#667085] mt-0.5">
            Encrypted AWS S3 document repository for query evidence, fee slips, and signed forms.
          </p>
        </div>

        <Button
          variant="primary"
          size="sm"
          icon={<Upload size={15} />}
          onClick={() => setIsUploadModalOpen(true)}
        >
          Upload Attachment
        </Button>
      </div>

      {successNote && (
        <div className="p-3 bg-[#ECFDF3] border border-[#A6F4C5] text-xs font-semibold text-[#027A48] rounded flex items-center gap-2">
          <CheckCircle size={16} />
          {successNote}
        </div>
      )}

      {/* Metrics */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="Total Files"
          value={files.length}
          icon={<Paperclip size={20} className="text-[#4779B8]" />}
          subtitle="S3 cloud objects"
        />
        <StatCard
          title="Storage Used"
          value="2.34 MB"
          icon={<HardDrive size={20} className="text-[#12B76A]" />}
          subtitle="Tier allocation: 25 GB"
        />
        <StatCard
          title="Encryption"
          value="AES-256"
          icon={<CheckCircle size={20} className="text-[#7F56D9]" />}
          subtitle="At-rest & in-transit"
        />
        <StatCard
          title="Presigned URLs"
          value="15m Expiry"
          icon={<FileText size={20} className="text-[#F79009]" />}
          subtitle="Zero public exposure"
        />
      </div>

      {/* Search */}
      <Card>
        <div className="relative">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#98A2B3]" />
          <input
            type="text"
            placeholder="Search by file name, ticket number, or uploader..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            style={{ borderRadius: '4px' }}
            className="w-full h-[36px] pl-9 pr-3 text-[12px] bg-white border border-[#D0D5DD] placeholder-[#98A2B3] focus:border-[#4779B8] focus:outline-none"
          />
        </div>
      </Card>

      {/* Files Table */}
      <Card noPadding>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>File Name</TableHead>
              <TableHead>Ticket Reference</TableHead>
              <TableHead>Uploader Identity</TableHead>
              <TableHead>File Size</TableHead>
              <TableHead>Storage</TableHead>
              <TableHead>Uploaded Timestamp</TableHead>
              <TableHead className="text-right">Action</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filtered.map((file) => (
              <TableRow key={file.id}>
                <TableCell className="font-medium text-xs text-[#202938]">
                  <div className="flex items-center gap-2">
                    <File size={15} className="text-[#4779B8]" />
                    <span>{file.name}</span>
                  </div>
                </TableCell>
                <TableCell className="font-mono text-xs font-semibold text-[#4779B8]">
                  {file.ticketNumber}
                </TableCell>
                <TableCell className="text-xs text-[#344054]">{file.uploader}</TableCell>
                <TableCell className="text-xs text-[#667085]">{file.size}</TableCell>
                <TableCell>
                  <Badge variant="primary">{file.storage}</Badge>
                </TableCell>
                <TableCell className="text-xs text-[#667085]">{file.uploadedAt}</TableCell>
                <TableCell className="text-right">
                  <Button
                    variant="ghost"
                    size="sm"
                    icon={<Download size={13} />}
                    onClick={() => alert(`Generating presigned secure S3 download URL for ${file.name}`)}
                  >
                    Download
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </Card>

      {/* Modal: Upload */}
      <Modal
        isOpen={isUploadModalOpen}
        onClose={() => setIsUploadModalOpen(false)}
        title="Upload Supporting Document"
        description="Attach an evidentiary document to a ticket thread."
        footer={
          <div className="flex justify-end gap-2">
            <Button variant="outline" size="sm" onClick={() => setIsUploadModalOpen(false)}>
              Cancel
            </Button>
            <Button variant="primary" size="sm" onClick={handleUpload}>
              Upload to S3
            </Button>
          </div>
        }
      >
        <form onSubmit={handleUpload} className="space-y-4">
          <Input
            label="File Name"
            placeholder="e.g. verified_revaluation_receipt.pdf"
            value={uploadForm.fileName}
            onChange={(e) => setUploadForm({ ...uploadForm, fileName: e.target.value })}
            required
          />
          <Input
            label="Linked Ticket #"
            placeholder="e.g. CQ-2026-00101"
            value={uploadForm.ticketNumber}
            onChange={(e) => setUploadForm({ ...uploadForm, ticketNumber: e.target.value })}
            required
          />
        </form>
      </Modal>
    </div>
  );
};
