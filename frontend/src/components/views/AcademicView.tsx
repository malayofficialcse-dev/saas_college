'use client';

import React, { useState } from 'react';
import {
  GraduationCap,
  Building,
  Calendar,
  BookOpen,
  Plus,
  Search,
  CheckCircle,
  Clock,
  Layers,
  Users,
} from 'lucide-react';
import { Department, Course, AcademicSession } from '@/lib/types';
import { MOCK_DEPARTMENTS, MOCK_COURSES, MOCK_ACADEMIC_SESSIONS } from '@/lib/mock-data';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '@/components/ui/Table';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { Modal } from '@/components/ui/Modal';
import { Tabs } from '@/components/ui/Tabs';
import { StatCard } from '@/components/ui/StatCard';

export const AcademicView: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'departments' | 'courses' | 'sessions'>('departments');
  const [search, setSearch] = useState('');

  // Department State
  const [departments, setDepartments] = useState<Department[]>(MOCK_DEPARTMENTS);
  const [isDeptModalOpen, setIsDeptModalOpen] = useState(false);
  const [deptForm, setDeptForm] = useState({ name: '', code: '', hodName: '' });

  // Course State
  const [courses, setCourses] = useState<Course[]>(MOCK_COURSES);
  const [isCourseModalOpen, setIsCourseModalOpen] = useState(false);
  const [courseForm, setCourseForm] = useState({
    name: '',
    code: '',
    departmentCode: 'CSE',
    degreeType: 'UNDERGRADUATE',
    durationSemesters: 8,
  });

  // Academic Sessions State
  const [sessions, setSessions] = useState<AcademicSession[]>(MOCK_ACADEMIC_SESSIONS);
  const [isSessionModalOpen, setIsSessionModalOpen] = useState(false);
  const [sessionForm, setSessionForm] = useState({
    name: '',
    code: '',
    startDate: '',
    endDate: '',
  });

  const handleAddDepartment = (e: React.FormEvent) => {
    e.preventDefault();
    if (!deptForm.name || !deptForm.code) return;
    const newDept: Department = {
      id: `dept-${Date.now()}`,
      name: deptForm.name,
      code: deptForm.code.toUpperCase(),
      hodName: deptForm.hodName || 'Pending Assignment',
      facultyCount: 0,
      studentCount: 0,
      openQueriesCount: 0,
      slaCompliance: 100,
    };
    setDepartments((prev) => [...prev, newDept]);
    setDeptForm({ name: '', code: '', hodName: '' });
    setIsDeptModalOpen(false);
  };

  const handleAddCourse = (e: React.FormEvent) => {
    e.preventDefault();
    if (!courseForm.name || !courseForm.code) return;
    const newCourse: Course = {
      id: `crs-${Date.now()}`,
      name: courseForm.name,
      code: courseForm.code.toUpperCase(),
      departmentCode: courseForm.departmentCode,
      degreeType: courseForm.degreeType,
      durationSemesters: Number(courseForm.durationSemesters),
      studentCount: 0,
    };
    setCourses((prev) => [...prev, newCourse]);
    setCourseForm({
      name: '',
      code: '',
      departmentCode: 'CSE',
      degreeType: 'UNDERGRADUATE',
      durationSemesters: 8,
    });
    setIsCourseModalOpen(false);
  };

  const handleAddSession = (e: React.FormEvent) => {
    e.preventDefault();
    if (!sessionForm.name || !sessionForm.code) return;
    const newSession: AcademicSession = {
      id: `sess-${Date.now()}`,
      name: sessionForm.name,
      code: sessionForm.code.toUpperCase(),
      startDate: sessionForm.startDate || '2026-07-01',
      endDate: sessionForm.endDate || '2026-12-31',
      isCurrent: false,
      status: 'UPCOMING',
    };
    setSessions((prev) => [...prev, newSession]);
    setSessionForm({ name: '', code: '', startDate: '', endDate: '' });
    setIsSessionModalOpen(false);
  };

  // Filtered lists
  const filteredDepartments = departments.filter(
    (d) =>
      d.name.toLowerCase().includes(search.toLowerCase()) ||
      d.code.toLowerCase().includes(search.toLowerCase()) ||
      d.hodName.toLowerCase().includes(search.toLowerCase())
  );

  const filteredCourses = courses.filter(
    (c) =>
      c.name.toLowerCase().includes(search.toLowerCase()) ||
      c.code.toLowerCase().includes(search.toLowerCase()) ||
      c.departmentCode.toLowerCase().includes(search.toLowerCase())
  );

  const filteredSessions = sessions.filter(
    (s) =>
      s.name.toLowerCase().includes(search.toLowerCase()) ||
      s.code.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-6 w-full">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-[24px] font-semibold text-[#202938] tracking-tight">
            Academic Configuration
          </h1>
          <p className="text-[13px] text-[#667085] mt-0.5">
            Manage institutional departments, degree programs, and academic calendar sessions.
          </p>
        </div>

        <div className="flex items-center gap-2">
          {activeTab === 'departments' && (
            <Button
              variant="primary"
              size="sm"
              icon={<Plus size={15} />}
              onClick={() => setIsDeptModalOpen(true)}
            >
              Add Department
            </Button>
          )}
          {activeTab === 'courses' && (
            <Button
              variant="primary"
              size="sm"
              icon={<Plus size={15} />}
              onClick={() => setIsCourseModalOpen(true)}
            >
              Add Program / Course
            </Button>
          )}
          {activeTab === 'sessions' && (
            <Button
              variant="primary"
              size="sm"
              icon={<Plus size={15} />}
              onClick={() => setIsSessionModalOpen(true)}
            >
              Add Academic Session
            </Button>
          )}
        </div>
      </div>

      {/* Quick Metrics */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="Departments"
          value={departments.length}
          icon={<Building size={20} className="text-[#4779B8]" />}
          subtitle="Active faculty units"
        />
        <StatCard
          title="Degree Programs"
          value={courses.length}
          icon={<BookOpen size={20} className="text-[#2E90FA]" />}
          subtitle="UG & PG offerings"
        />
        <StatCard
          title="Current Term"
          value={sessions.find((s) => s.isCurrent)?.code || 'AY25-26'}
          icon={<Calendar size={20} className="text-[#12B76A]" />}
          subtitle="In session until June"
        />
        <StatCard
          title="Avg SLA Compliance"
          value="97.2%"
          icon={<CheckCircle size={20} className="text-[#12B76A]" />}
          change={{ value: '+1.4% from last term', type: 'positive' }}
        />
      </div>

      {/* Tabs & Search */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 border-b border-[#E5E7EB] pb-3">
        <Tabs
          tabs={[
            { id: 'departments', label: `Departments (${departments.length})` },
            { id: 'courses', label: `Courses & Programs (${courses.length})` },
            { id: 'sessions', label: `Academic Calendar (${sessions.length})` },
          ]}
          activeTab={activeTab}
          onChange={(id) => setActiveTab(id as any)}
        />

        <div className="relative w-full sm:w-64">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#98A2B3]" />
          <input
            type="text"
            placeholder="Filter list..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            style={{ borderRadius: '4px' }}
            className="w-full h-[34px] pl-9 pr-3 text-[12px] bg-white border border-[#D0D5DD] placeholder-[#98A2B3] focus:border-[#4779B8] focus:outline-none"
          />
        </div>
      </div>

      {/* Tab 1: Departments */}
      {activeTab === 'departments' && (
        <Card noPadding>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Department Name</TableHead>
                <TableHead>Code</TableHead>
                <TableHead>Head of Department (HOD)</TableHead>
                <TableHead>Faculty</TableHead>
                <TableHead>Students</TableHead>
                <TableHead>Open Queries</TableHead>
                <TableHead>SLA Compliance</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredDepartments.map((dept) => (
                <TableRow key={dept.id}>
                  <TableCell className="font-medium text-[#202938]">
                    <div className="flex items-center gap-2">
                      <div
                        style={{ borderRadius: '4px' }}
                        className="w-7 h-7 bg-[#EDF3FA] text-[#4779B8] font-bold text-xs flex items-center justify-center shrink-0"
                      >
                        {dept.code.slice(0, 2)}
                      </div>
                      <span>{dept.name}</span>
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge variant="neutral">{dept.code}</Badge>
                  </TableCell>
                  <TableCell className="text-[#344054]">{dept.hodName}</TableCell>
                  <TableCell className="text-[#667085]">{dept.facultyCount} faculty</TableCell>
                  <TableCell className="text-[#667085]">{dept.studentCount} enrolled</TableCell>
                  <TableCell>
                    <Badge variant={dept.openQueriesCount > 5 ? 'warning' : 'info'}>
                      {dept.openQueriesCount} open
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <div className="w-16 bg-[#F2F4F7] h-2 rounded-full overflow-hidden">
                        <div
                          className="bg-[#12B76A] h-full"
                          style={{ width: `${dept.slaCompliance}%` }}
                        />
                      </div>
                      <span className="text-[12px] font-semibold text-[#12B76A]">
                        {dept.slaCompliance}%
                      </span>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </Card>
      )}

      {/* Tab 2: Courses */}
      {activeTab === 'courses' && (
        <Card noPadding>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Program Name</TableHead>
                <TableHead>Course Code</TableHead>
                <TableHead>Department</TableHead>
                <TableHead>Degree Level</TableHead>
                <TableHead>Duration</TableHead>
                <TableHead>Enrolled Students</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredCourses.map((crs) => (
                <TableRow key={crs.id}>
                  <TableCell className="font-medium text-[#202938]">
                    {crs.name}
                  </TableCell>
                  <TableCell>
                    <Badge variant="primary">{crs.code}</Badge>
                  </TableCell>
                  <TableCell>
                    <span className="text-[#344054] font-medium">{crs.departmentCode}</span>
                  </TableCell>
                  <TableCell>
                    <Badge variant={crs.degreeType === 'POSTGRADUATE' ? 'warning' : 'neutral'}>
                      {crs.degreeType}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-[#667085]">{crs.durationSemesters} Semesters</TableCell>
                  <TableCell className="text-[#344054] font-semibold">{crs.studentCount}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </Card>
      )}

      {/* Tab 3: Academic Sessions */}
      {activeTab === 'sessions' && (
        <Card noPadding>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Session Name</TableHead>
                <TableHead>Code</TableHead>
                <TableHead>Start Date</TableHead>
                <TableHead>End Date</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Current Active</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredSessions.map((sess) => (
                <TableRow key={sess.id}>
                  <TableCell className="font-medium text-[#202938]">
                    {sess.name}
                  </TableCell>
                  <TableCell>
                    <Badge variant="neutral">{sess.code}</Badge>
                  </TableCell>
                  <TableCell className="text-[#667085]">{sess.startDate}</TableCell>
                  <TableCell className="text-[#667085]">{sess.endDate}</TableCell>
                  <TableCell>
                    <Badge
                      variant={
                        sess.status === 'ACTIVE'
                          ? 'success'
                          : sess.status === 'UPCOMING'
                          ? 'info'
                          : 'neutral'
                      }
                    >
                      {sess.status}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    {sess.isCurrent ? (
                      <Badge variant="success">Current Term</Badge>
                    ) : (
                      <span className="text-xs text-[#98A2B3]">Inactive</span>
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </Card>
      )}

      {/* Modal: Add Department */}
      <Modal
        isOpen={isDeptModalOpen}
        onClose={() => setIsDeptModalOpen(false)}
        title="Add Academic Department"
        description="Create an institutional department for faculty assignment and ticket routing."
        footer={
          <div className="flex justify-end gap-2">
            <Button variant="outline" size="sm" onClick={() => setIsDeptModalOpen(false)}>
              Cancel
            </Button>
            <Button variant="primary" size="sm" onClick={handleAddDepartment}>
              Create Department
            </Button>
          </div>
        }
      >
        <form onSubmit={handleAddDepartment} className="space-y-4">
          <Input
            label="Department Name"
            placeholder="e.g. Electrical & Electronics Engineering"
            value={deptForm.name}
            onChange={(e) => setDeptForm({ ...deptForm, name: e.target.value })}
            required
          />
          <Input
            label="Department Code"
            placeholder="e.g. EEE"
            value={deptForm.code}
            onChange={(e) => setDeptForm({ ...deptForm, code: e.target.value })}
            required
          />
          <Input
            label="Head of Department (HOD) Name"
            placeholder="e.g. Prof. Rajesh Kulkarni"
            value={deptForm.hodName}
            onChange={(e) => setDeptForm({ ...deptForm, hodName: e.target.value })}
          />
        </form>
      </Modal>

      {/* Modal: Add Course */}
      <Modal
        isOpen={isCourseModalOpen}
        onClose={() => setIsCourseModalOpen(false)}
        title="Add Program / Degree Course"
        description="Configure a new degree program under an existing department."
        footer={
          <div className="flex justify-end gap-2">
            <Button variant="outline" size="sm" onClick={() => setIsCourseModalOpen(false)}>
              Cancel
            </Button>
            <Button variant="primary" size="sm" onClick={handleAddCourse}>
              Save Program
            </Button>
          </div>
        }
      >
        <form onSubmit={handleAddCourse} className="space-y-4">
          <Input
            label="Program Title"
            placeholder="e.g. B.Tech in Information Technology"
            value={courseForm.name}
            onChange={(e) => setCourseForm({ ...courseForm, name: e.target.value })}
            required
          />
          <Input
            label="Program Code"
            placeholder="e.g. BTECH-IT"
            value={courseForm.code}
            onChange={(e) => setCourseForm({ ...courseForm, code: e.target.value })}
            required
          />
          <Select
            label="Parent Department"
            options={departments.map((d) => ({ value: d.code, label: `${d.code} — ${d.name}` }))}
            value={courseForm.departmentCode}
            onChange={(e) => setCourseForm({ ...courseForm, departmentCode: e.target.value })}
          />
          <div className="grid grid-cols-2 gap-3">
            <Select
              label="Level"
              options={[
                { value: 'UNDERGRADUATE', label: 'Undergraduate' },
                { value: 'POSTGRADUATE', label: 'Postgraduate' },
                { value: 'DOCTORAL', label: 'Doctoral (Ph.D)' },
              ]}
              value={courseForm.degreeType}
              onChange={(e) => setCourseForm({ ...courseForm, degreeType: e.target.value })}
            />
            <Input
              label="Duration (Semesters)"
              type="number"
              value={String(courseForm.durationSemesters)}
              onChange={(e) =>
                setCourseForm({ ...courseForm, durationSemesters: Number(e.target.value) })
              }
            />
          </div>
        </form>
      </Modal>

      {/* Modal: Add Session */}
      <Modal
        isOpen={isSessionModalOpen}
        onClose={() => setIsSessionModalOpen(false)}
        title="Add Academic Calendar Session"
        description="Define term dates for semester queries and SLA calendar calculations."
        footer={
          <div className="flex justify-end gap-2">
            <Button variant="outline" size="sm" onClick={() => setIsSessionModalOpen(false)}>
              Cancel
            </Button>
            <Button variant="primary" size="sm" onClick={handleAddSession}>
              Save Session
            </Button>
          </div>
        }
      >
        <form onSubmit={handleAddSession} className="space-y-4">
          <Input
            label="Session Name"
            placeholder="e.g. AY 2026-2027 (Even Semester)"
            value={sessionForm.name}
            onChange={(e) => setSessionForm({ ...sessionForm, name: e.target.value })}
            required
          />
          <Input
            label="Session Code"
            placeholder="e.g. AY26-27-EVEN"
            value={sessionForm.code}
            onChange={(e) => setSessionForm({ ...sessionForm, code: e.target.value })}
            required
          />
          <div className="grid grid-cols-2 gap-3">
            <Input
              label="Term Start Date"
              type="date"
              value={sessionForm.startDate}
              onChange={(e) => setSessionForm({ ...sessionForm, startDate: e.target.value })}
            />
            <Input
              label="Term End Date"
              type="date"
              value={sessionForm.endDate}
              onChange={(e) => setSessionForm({ ...sessionForm, endDate: e.target.value })}
            />
          </div>
        </form>
      </Modal>
    </div>
  );
};
