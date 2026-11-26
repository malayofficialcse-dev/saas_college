'use client';

import React, { useState } from 'react';
import {
  GraduationCap,
  Search,
  Filter,
  Plus,
  Mail,
  Phone,
  Ticket,
  ChevronRight,
  UserCheck,
  Building,
} from 'lucide-react';
import { StudentProfile } from '@/lib/types';
import { MOCK_STUDENTS, MOCK_DEPARTMENTS, MOCK_COURSES } from '@/lib/mock-data';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '@/components/ui/Table';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { Modal } from '@/components/ui/Modal';
import { StatCard } from '@/components/ui/StatCard';

export const StudentsView: React.FC = () => {
  const [students, setStudents] = useState<StudentProfile[]>(MOCK_STUDENTS);
  const [search, setSearch] = useState('');
  const [deptFilter, setDeptFilter] = useState('ALL');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [selectedStudent, setSelectedStudent] = useState<StudentProfile | null>(null);
  const [isEnrollModalOpen, setIsEnrollModalOpen] = useState(false);

  const [form, setForm] = useState({
    enrollmentNumber: '',
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
    departmentCode: 'CSE',
    courseCode: 'BTECH-CSE',
    currentSemester: 1,
    admissionYear: 2025,
  });

  const handleEnrollStudent = (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.enrollmentNumber || !form.firstName || !form.lastName || !form.email) return;

    const newStudent: StudentProfile = {
      id: `stu-${Date.now()}`,
      enrollmentNumber: form.enrollmentNumber.toUpperCase(),
      firstName: form.firstName,
      lastName: form.lastName,
      email: form.email,
      phone: form.phone || '+91 90000 00000',
      departmentCode: form.departmentCode,
      courseCode: form.courseCode,
      currentSemester: Number(form.currentSemester),
      admissionYear: Number(form.admissionYear),
      status: 'ACTIVE',
      totalQueries: 0,
      openQueries: 0,
    };

    setStudents((prev) => [newStudent, ...prev]);
    setIsEnrollModalOpen(false);
    setForm({
      enrollmentNumber: '',
      firstName: '',
      lastName: '',
      email: '',
      phone: '',
      departmentCode: 'CSE',
      courseCode: 'BTECH-CSE',
      currentSemester: 1,
      admissionYear: 2025,
    });
  };

  const filteredStudents = students.filter((s) => {
    if (deptFilter !== 'ALL' && s.departmentCode !== deptFilter) return false;
    if (statusFilter !== 'ALL' && s.status !== statusFilter) return false;
    if (search) {
      const q = search.toLowerCase();
      const match =
        s.enrollmentNumber.toLowerCase().includes(q) ||
        `${s.firstName} ${s.lastName}`.toLowerCase().includes(q) ||
        s.email.toLowerCase().includes(q) ||
        s.courseCode.toLowerCase().includes(q);
      if (!match) return false;
    }
    return true;
  });

  return (
    <div className="space-y-6 w-full">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-[24px] font-semibold text-[#202938] tracking-tight">
            Students Directory
          </h1>
          <p className="text-[13px] text-[#667085] mt-0.5">
            Institutional student roster, enrollment verification, and individual query history.
          </p>
        </div>

        <Button
          variant="primary"
          size="sm"
          icon={<Plus size={15} />}
          onClick={() => setIsEnrollModalOpen(true)}
        >
          Enroll Student
        </Button>
      </div>

      {/* Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="Total Enrolled"
          value={students.length}
          icon={<GraduationCap size={20} className="text-[#4779B8]" />}
          subtitle="Verified campus accounts"
        />
        <StatCard
          title="Active Students"
          value={students.filter((s) => s.status === 'ACTIVE').length}
          icon={<UserCheck size={20} className="text-[#12B76A]" />}
          subtitle="Full portal privileges"
        />
        <StatCard
          title="Students with Open Queries"
          value={students.filter((s) => s.openQueries > 0).length}
          icon={<Ticket size={20} className="text-[#F79009]" />}
          subtitle="Awaiting staff action"
        />
        <StatCard
          title="Departments Represented"
          value={new Set(students.map((s) => s.departmentCode)).size}
          icon={<Building size={20} className="text-[#7F56D9]" />}
          subtitle="Undergraduate & Postgraduate"
        />
      </div>

      {/* Filters & Search */}
      <Card>
        <div className="flex flex-col md:flex-row md:items-center gap-3">
          <div className="relative flex-1">
            <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#98A2B3]" />
            <input
              type="text"
              placeholder="Search by student name, enrollment number, or email..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              style={{ borderRadius: '4px' }}
              className="w-full h-[36px] pl-9 pr-3 text-[13px] bg-white border border-[#D0D5DD] placeholder-[#98A2B3] focus:border-[#4779B8] focus:outline-none"
            />
          </div>

          <div className="flex items-center gap-2">
            <select
              value={deptFilter}
              onChange={(e) => setDeptFilter(e.target.value)}
              style={{ borderRadius: '4px' }}
              className="h-[36px] px-3 text-[12px] bg-white border border-[#D0D5DD] text-[#344054] focus:outline-none focus:border-[#4779B8]"
            >
              <option value="ALL">All Departments</option>
              {MOCK_DEPARTMENTS.map((d) => (
                <option key={d.id} value={d.code}>
                  {d.code}
                </option>
              ))}
            </select>

            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              style={{ borderRadius: '4px' }}
              className="h-[36px] px-3 text-[12px] bg-white border border-[#D0D5DD] text-[#344054] focus:outline-none focus:border-[#4779B8]"
            >
              <option value="ALL">All Status</option>
              <option value="ACTIVE">Active</option>
              <option value="GRADUATED">Graduated</option>
              <option value="SUSPENDED">Suspended</option>
            </select>
          </div>
        </div>
      </Card>

      {/* Students Table */}
      <Card noPadding>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Enrollment No.</TableHead>
              <TableHead>Student Name</TableHead>
              <TableHead>Department & Program</TableHead>
              <TableHead>Semester</TableHead>
              <TableHead>Contact Info</TableHead>
              <TableHead>Active Queries</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">Action</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredStudents.map((stu) => (
              <TableRow key={stu.id}>
                <TableCell className="font-mono font-semibold text-[#4779B8]">
                  {stu.enrollmentNumber}
                </TableCell>
                <TableCell>
                  <div className="flex items-center gap-2.5">
                    <div
                      style={{ borderRadius: '4px' }}
                      className="w-8 h-8 bg-[#EDF3FA] text-[#4779B8] font-bold text-xs flex items-center justify-center shrink-0"
                    >
                      {stu.firstName[0]}
                      {stu.lastName[0]}
                    </div>
                    <div>
                      <div className="font-medium text-[#202938]">
                        {stu.firstName} {stu.lastName}
                      </div>
                      <div className="text-[11px] text-[#667085]">Adm: {stu.admissionYear}</div>
                    </div>
                  </div>
                </TableCell>
                <TableCell>
                  <div className="text-[#344054] font-medium">{stu.courseCode}</div>
                  <div className="text-[11px] text-[#667085]">{stu.departmentCode}</div>
                </TableCell>
                <TableCell className="text-[#344054]">Sem {stu.currentSemester}</TableCell>
                <TableCell>
                  <div className="text-xs text-[#344054] flex items-center gap-1">
                    <Mail size={12} className="text-[#98A2B3]" />
                    <span>{stu.email}</span>
                  </div>
                  <div className="text-xs text-[#667085] flex items-center gap-1 mt-0.5">
                    <Phone size={12} className="text-[#98A2B3]" />
                    <span>{stu.phone}</span>
                  </div>
                </TableCell>
                <TableCell>
                  <Badge variant={stu.openQueries > 0 ? 'warning' : 'neutral'}>
                    {stu.openQueries} Open / {stu.totalQueries} Total
                  </Badge>
                </TableCell>
                <TableCell>
                  <Badge variant={stu.status === 'ACTIVE' ? 'success' : 'danger'}>
                    {stu.status}
                  </Badge>
                </TableCell>
                <TableCell className="text-right">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setSelectedStudent(stu)}
                  >
                    View Record
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </Card>

      {/* Modal: Student Detail Record */}
      {selectedStudent && (
        <Modal
          isOpen={!!selectedStudent}
          onClose={() => setSelectedStudent(null)}
          title={`Student Profile — ${selectedStudent.enrollmentNumber}`}
          description="Detailed academic record and support engagement overview."
          footer={
            <Button variant="outline" size="sm" onClick={() => setSelectedStudent(null)}>
              Close
            </Button>
          }
        >
          <div className="space-y-4">
            <div className="flex items-center gap-3 p-3 bg-[#F9FAFB] border border-[#E5E7EB]">
              <div
                style={{ borderRadius: '4px' }}
                className="w-12 h-12 bg-[#4779B8] text-white font-bold text-lg flex items-center justify-center shrink-0"
              >
                {selectedStudent.firstName[0]}
                {selectedStudent.lastName[0]}
              </div>
              <div>
                <h3 className="font-semibold text-[#202938] text-[15px]">
                  {selectedStudent.firstName} {selectedStudent.lastName}
                </h3>
                <p className="text-xs text-[#667085] font-mono">{selectedStudent.email}</p>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3 text-xs">
              <div className="p-2.5 border border-[#E5E7EB] bg-white">
                <span className="text-[#667085] block">Program:</span>
                <span className="font-semibold text-[#202938]">{selectedStudent.courseCode}</span>
              </div>
              <div className="p-2.5 border border-[#E5E7EB] bg-white">
                <span className="text-[#667085] block">Department:</span>
                <span className="font-semibold text-[#202938]">{selectedStudent.departmentCode}</span>
              </div>
              <div className="p-2.5 border border-[#E5E7EB] bg-white">
                <span className="text-[#667085] block">Semester:</span>
                <span className="font-semibold text-[#202938]">Semester {selectedStudent.currentSemester}</span>
              </div>
              <div className="p-2.5 border border-[#E5E7EB] bg-white">
                <span className="text-[#667085] block">Phone Contact:</span>
                <span className="font-semibold text-[#202938]">{selectedStudent.phone}</span>
              </div>
            </div>

            <div className="p-3 border border-[#E5E7EB] bg-[#EDF3FA]">
              <span className="text-xs font-semibold text-[#4779B8] block">Ticket Activity</span>
              <p className="text-xs text-[#344054] mt-1">
                Student has raised {selectedStudent.totalQueries} inquiries with {selectedStudent.openQueries} pending resolution.
              </p>
            </div>
          </div>
        </Modal>
      )}

      {/* Modal: Enroll Student */}
      <Modal
        isOpen={isEnrollModalOpen}
        onClose={() => setIsEnrollModalOpen(false)}
        title="Enroll New Student"
        description="Register an institutional student into CollegeQuery with portal access."
        footer={
          <div className="flex justify-end gap-2">
            <Button variant="outline" size="sm" onClick={() => setIsEnrollModalOpen(false)}>
              Cancel
            </Button>
            <Button variant="primary" size="sm" onClick={handleEnrollStudent}>
              Enroll Student
            </Button>
          </div>
        }
      >
        <form onSubmit={handleEnrollStudent} className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <Input
              label="First Name"
              placeholder="e.g. Rahul"
              value={form.firstName}
              onChange={(e) => setForm({ ...form, firstName: e.target.value })}
              required
            />
            <Input
              label="Last Name"
              placeholder="e.g. Sen"
              value={form.lastName}
              onChange={(e) => setForm({ ...form, lastName: e.target.value })}
              required
            />
          </div>

          <Input
            label="Enrollment / Roll Number"
            placeholder="e.g. ENR-2026-105"
            value={form.enrollmentNumber}
            onChange={(e) => setForm({ ...form, enrollmentNumber: e.target.value })}
            required
          />

          <div className="grid grid-cols-2 gap-3">
            <Input
              label="Institutional Email"
              type="email"
              placeholder="e.g. rahul.sen@student.apexinst.edu"
              value={form.email}
              onChange={(e) => setForm({ ...form, email: e.target.value })}
              required
            />
            <Input
              label="Mobile Number"
              placeholder="+91 98765 00000"
              value={form.phone}
              onChange={(e) => setForm({ ...form, phone: e.target.value })}
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <Select
              label="Department"
              options={MOCK_DEPARTMENTS.map((d) => ({ value: d.code, label: d.name }))}
              value={form.departmentCode}
              onChange={(e) => setForm({ ...form, departmentCode: e.target.value })}
            />
            <Select
              label="Degree Course"
              options={MOCK_COURSES.map((c) => ({ value: c.code, label: c.name }))}
              value={form.courseCode}
              onChange={(e) => setForm({ ...form, courseCode: e.target.value })}
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <Input
              label="Semester"
              type="number"
              value={String(form.currentSemester)}
              onChange={(e) => setForm({ ...form, currentSemester: Number(e.target.value) })}
            />
            <Input
              label="Admission Year"
              type="number"
              value={String(form.admissionYear)}
              onChange={(e) => setForm({ ...form, admissionYear: Number(e.target.value) })}
            />
          </div>
        </form>
      </Modal>
    </div>
  );
};
