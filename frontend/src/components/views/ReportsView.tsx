'use client';

import React, { useState } from 'react';
import {
  FileSpreadsheet,
  Download,
  Calendar,
  Filter,
  CheckCircle,
  FileText,
  Clock,
  Building,
} from 'lucide-react';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '@/components/ui/Table';
import { MOCK_DEPARTMENTS, MOCK_TICKETS } from '@/lib/mock-data';
import { reportsApi } from '@/lib/api';

export const ReportsView: React.FC = () => {
  const [reportType, setReportType] = useState('ALL_QUERIES');
  const [department, setDepartment] = useState('ALL');
  const [dateRange, setDateRange] = useState('CURRENT_TERM');
  const [format, setFormat] = useState<'CSV' | 'XLSX' | 'PDF'>('CSV');
  const [isExporting, setIsExporting] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');

  const [exportHistory, setExportHistory] = useState([
    {
      id: 'exp-1',
      title: 'Complete Inquiries Log — November 2026',
      format: 'CSV',
      rows: 1420,
      size: '280 KB',
      generatedAt: '2026-11-25 14:30',
    },
    {
      id: 'exp-2',
      title: 'SLA Breach Incident Audit Report',
      format: 'PDF',
      rows: 18,
      size: '1.2 MB',
      generatedAt: '2026-11-24 10:15',
    },
    {
      id: 'exp-3',
      title: 'Department Benchmark & Staff Turnaround',
      format: 'XLSX',
      rows: 85,
      size: '95 KB',
      generatedAt: '2026-11-20 16:40',
    },
  ]);

  const handleGenerateReport = () => {
    setIsExporting(true);
    setSuccessMessage('');

    reportsApi
      .exportCsv({
        departmentId: department !== 'ALL' ? department : undefined,
      })
      .catch((err) => {
        console.warn('[ReportsView] Backend CSV notice:', err);
      });

    setTimeout(() => {
      // Build realistic CSV payload
      const headers = ['Ticket Number', 'Title', 'Category', 'Department', 'Student', 'Priority', 'Status', 'SLA Breached', 'Created At'];
      const rows = MOCK_TICKETS.map((t) => [
        t.ticketNumber,
        `"${t.title.replace(/"/g, '""')}"`,
        t.category,
        t.departmentCode,
        `"${t.studentName}"`,
        t.priority,
        t.status,
        t.isBreached ? 'YES' : 'NO',
        t.createdAt,
      ]);

      const csvContent = [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `CollegeQuery_Report_${reportType}_${Date.now()}.csv`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      const newHistoryItem = {
        id: `exp-${Date.now()}`,
        title: `${reportType.replace('_', ' ')} Export`,
        format,
        rows: MOCK_TICKETS.length,
        size: '14 KB',
        generatedAt: new Date().toLocaleString(),
      };

      setExportHistory((prev) => [newHistoryItem, ...prev]);
      setIsExporting(false);
      setSuccessMessage('Report generated and download initiated successfully!');
    }, 600);
  };

  return (
    <div className="space-y-6 w-full">
      {/* Header */}
      <div>
        <h1 className="text-[24px] font-semibold text-[#202938] tracking-tight">
          Export Reports & Data Auditing
        </h1>
        <p className="text-[13px] text-[#667085] mt-0.5">
          Generate structured CSV and Excel datasets for accreditation, regulatory audits, and campus management.
        </p>
      </div>

      {/* Generator Configuration Card */}
      <Card>
        <div className="space-y-5">
          <div className="pb-3 border-b border-[#E5E7EB]">
            <h3 className="font-semibold text-[15px] text-[#202938]">
              Configure New Export
            </h3>
            <p className="text-xs text-[#667085] mt-0.5">
              Select criteria, departments, and output format for your custom export.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div>
              <label className="text-xs font-semibold text-[#344054] block mb-1.5">
                Report Template
              </label>
              <select
                value={reportType}
                onChange={(e) => setReportType(e.target.value)}
                style={{ borderRadius: '4px' }}
                className="w-full h-[36px] px-3 text-xs bg-white border border-[#D0D5DD] text-[#202938] focus:border-[#4779B8] focus:outline-none"
              >
                <option value="ALL_QUERIES">All Inquiries & Tickets</option>
                <option value="SLA_BREACHES">SLA Breaches & Escalations</option>
                <option value="DEPT_METRICS">Department CSAT & Compliance</option>
                <option value="STUDENT_ACTIVITY">Student Support Engagement</option>
              </select>
            </div>

            <div>
              <label className="text-xs font-semibold text-[#344054] block mb-1.5">
                Department Filter
              </label>
              <select
                value={department}
                onChange={(e) => setDepartment(e.target.value)}
                style={{ borderRadius: '4px' }}
                className="w-full h-[36px] px-3 text-xs bg-white border border-[#D0D5DD] text-[#202938] focus:border-[#4779B8] focus:outline-none"
              >
                <option value="ALL">Entire Campus (All Depts)</option>
                {MOCK_DEPARTMENTS.map((d) => (
                  <option key={d.id} value={d.code}>
                    {d.code} — {d.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="text-xs font-semibold text-[#344054] block mb-1.5">
                Date Range
              </label>
              <select
                value={dateRange}
                onChange={(e) => setDateRange(e.target.value)}
                style={{ borderRadius: '4px' }}
                className="w-full h-[36px] px-3 text-xs bg-white border border-[#D0D5DD] text-[#202938] focus:border-[#4779B8] focus:outline-none"
              >
                <option value="CURRENT_TERM">Academic Year 2025-26 (Even)</option>
                <option value="LAST_30_DAYS">Last 30 Days</option>
                <option value="LAST_TERM">AY 2025-26 (Odd Semester)</option>
                <option value="ALL_TIME">All Historical Records</option>
              </select>
            </div>

            <div>
              <label className="text-xs font-semibold text-[#344054] block mb-1.5">
                Format
              </label>
              <div className="flex gap-2">
                {(['CSV', 'XLSX', 'PDF'] as const).map((fmt) => (
                  <button
                    key={fmt}
                    type="button"
                    onClick={() => setFormat(fmt)}
                    style={{ borderRadius: '4px' }}
                    className={`flex-1 h-[36px] text-xs font-semibold border cursor-pointer transition-colors ${
                      format === fmt
                        ? 'bg-[#4779B8] border-[#4779B8] text-white'
                        : 'bg-white border-[#D0D5DD] text-[#344054] hover:bg-[#F9FAFB]'
                    }`}
                  >
                    {fmt}
                  </button>
                ))}
              </div>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 pt-2">
            {successMessage && (
              <span className="text-xs text-[#12B76A] font-medium flex items-center gap-1.5">
                <CheckCircle size={15} />
                {successMessage}
              </span>
            )}
            {!successMessage && <div />}

            <Button
              variant="primary"
              size="md"
              icon={<Download size={16} />}
              disabled={isExporting}
              onClick={handleGenerateReport}
            >
              {isExporting ? 'Generating Report...' : 'Download Export File'}
            </Button>
          </div>
        </div>
      </Card>

      {/* Export History */}
      <Card noPadding>
        <div className="p-4 border-b border-[#E5E7EB]">
          <h3 className="font-semibold text-[15px] text-[#202938]">
            Previously Generated Exports
          </h3>
          <p className="text-xs text-[#667085] mt-0.5">
            Archived data exports available for institutional download.
          </p>
        </div>

        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Export Title</TableHead>
              <TableHead>Format</TableHead>
              <TableHead>Row Count</TableHead>
              <TableHead>File Size</TableHead>
              <TableHead>Generated At</TableHead>
              <TableHead className="text-right">Action</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {exportHistory.map((item) => (
              <TableRow key={item.id}>
                <TableCell className="font-medium text-[#202938]">
                  <div className="flex items-center gap-2">
                    <FileSpreadsheet size={16} className="text-[#4779B8]" />
                    <span>{item.title}</span>
                  </div>
                </TableCell>
                <TableCell>
                  <Badge variant={item.format === 'PDF' ? 'danger' : 'primary'}>
                    {item.format}
                  </Badge>
                </TableCell>
                <TableCell className="text-[#344054]">{item.rows} rows</TableCell>
                <TableCell className="text-[#667085]">{item.size}</TableCell>
                <TableCell className="text-[#667085] text-xs">{item.generatedAt}</TableCell>
                <TableCell className="text-right">
                  <Button
                    variant="ghost"
                    size="sm"
                    icon={<Download size={13} />}
                    onClick={handleGenerateReport}
                  >
                    Download
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </Card>
    </div>
  );
};
