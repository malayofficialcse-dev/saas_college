'use client';

import React, { createContext, useContext, useState, useEffect } from 'react';
import { User, UserRole, Tenant, Ticket } from './types';
import { MOCK_USERS, MOCK_TENANT, MOCK_TICKETS } from './mock-data';

interface AuthContextType {
  user: User;
  tenant: Tenant;
  role: UserRole;
  switchRole: (role: UserRole) => void;
  activeView: string;
  setActiveView: (view: string) => void;
  tickets: Ticket[];
  addTicket: (newTicket: Omit<Ticket, 'id' | 'ticketNumber' | 'createdAt' | 'updatedAt' | 'messages' | 'isBreached'>) => void;
  updateTicketStatus: (ticketId: string, status: Ticket['status']) => void;
  addTicketMessage: (ticketId: string, content: string, isInternal: boolean) => void;
  selectedTicket: Ticket | null;
  setSelectedTicket: (ticket: Ticket | null) => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [role, setRole] = useState<UserRole>('COLLEGE_ADMIN');
  const [user, setUser] = useState<User>(MOCK_USERS['COLLEGE_ADMIN']);
  const [tenant] = useState<Tenant>(MOCK_TENANT);
  const [activeView, setActiveView] = useState<string>('dashboard');
  const [tickets, setTickets] = useState<Ticket[]>(MOCK_TICKETS);
  const [selectedTicket, setSelectedTicket] = useState<Ticket | null>(null);

  const switchRole = (newRole: UserRole) => {
    setRole(newRole);
    setUser(MOCK_USERS[newRole] || MOCK_USERS['COLLEGE_ADMIN']);
    setActiveView('dashboard');
  };

  const addTicket = (ticketData: Omit<Ticket, 'id' | 'ticketNumber' | 'createdAt' | 'updatedAt' | 'messages' | 'isBreached'>) => {
    const id = `t-${Date.now()}`;
    const count = tickets.length + 101;
    const ticketNumber = `CQ-2026-00${count}`;
    const now = new Date().toISOString();

    const createdTicket: Ticket = {
      ...ticketData,
      id,
      ticketNumber,
      isBreached: false,
      createdAt: now,
      updatedAt: now,
      messages: [
        {
          id: `m-${Date.now()}`,
          senderId: user.id,
          senderName: `${user.firstName} ${user.lastName}`,
          senderRole: user.role,
          content: ticketData.description,
          isInternal: false,
          createdAt: now,
        },
      ],
    };

    setTickets((prev) => [createdTicket, ...prev]);
  };

  const updateTicketStatus = (ticketId: string, newStatus: Ticket['status']) => {
    setTickets((prev) =>
      prev.map((t) => {
        if (t.id === ticketId) {
          return {
            ...t,
            status: newStatus,
            updatedAt: new Date().toISOString(),
            resolvedAt: newStatus === 'RESOLVED' ? new Date().toISOString() : t.resolvedAt,
          };
        }
        return t;
      })
    );

    if (selectedTicket && selectedTicket.id === ticketId) {
      setSelectedTicket((prev) => prev ? { ...prev, status: newStatus } : null);
    }
  };

  const addTicketMessage = (ticketId: string, content: string, isInternal: boolean) => {
    const newMessage = {
      id: `m-${Date.now()}`,
      senderId: user.id,
      senderName: `${user.firstName} ${user.lastName}`,
      senderRole: user.role,
      content,
      isInternal,
      createdAt: new Date().toISOString(),
    };

    setTickets((prev) =>
      prev.map((t) => {
        if (t.id === ticketId) {
          return {
            ...t,
            updatedAt: new Date().toISOString(),
            messages: [...t.messages, newMessage],
          };
        }
        return t;
      })
    );

    if (selectedTicket && selectedTicket.id === ticketId) {
      setSelectedTicket((prev) =>
        prev
          ? {
              ...prev,
              updatedAt: new Date().toISOString(),
              messages: [...prev.messages, newMessage],
            }
          : null
      );
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        tenant,
        role,
        switchRole,
        activeView,
        setActiveView,
        tickets,
        addTicket,
        updateTicketStatus,
        addTicketMessage,
        selectedTicket,
        setSelectedTicket,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
