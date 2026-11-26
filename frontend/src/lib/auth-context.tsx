'use client';

import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { User, UserRole, Tenant, Ticket } from './types';
import { MOCK_USERS, MOCK_TENANT, MOCK_TICKETS } from './mock-data';
import { queriesApi, conversationsApi } from './api';
import { apiClient } from './api-client';

interface AuthContextType {
  user: User;
  tenant: Tenant;
  role: UserRole;
  switchRole: (role: UserRole) => void;
  activeView: string;
  setActiveView: (view: string) => void;
  tickets: Ticket[];
  isLoadingTickets: boolean;
  refreshTickets: () => Promise<void>;
  addTicket: (
    newTicket: Omit<Ticket, 'id' | 'ticketNumber' | 'createdAt' | 'updatedAt' | 'messages' | 'isBreached'>
  ) => Promise<void>;
  updateTicketStatus: (ticketId: string, status: Ticket['status']) => Promise<void>;
  addTicketMessage: (ticketId: string, content: string, isInternal: boolean) => Promise<void>;
  selectedTicket: Ticket | null;
  setSelectedTicket: (ticket: Ticket | null) => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

  export function AuthProvider({
    children,
    initialView = 'dashboard',
  }: {
    children: React.ReactNode;
    initialView?: string;
  }) {
    const [role, setRole] = useState<UserRole>('COLLEGE_ADMIN');
    const [user, setUser] = useState<User>(MOCK_USERS['COLLEGE_ADMIN']);
    const [tenant, setTenant] = useState<Tenant>(MOCK_TENANT);
    const [activeView, setActiveView] = useState<string>(initialView);
    const [tickets, setTickets] = useState<Ticket[]>(MOCK_TICKETS);
    const [selectedTicket, setSelectedTicket] = useState<Ticket | null>(null);
    const [isLoadingTickets, setIsLoadingTickets] = useState<boolean>(false);

    // Sync tenant and role with apiClient headers
    useEffect(() => {
      if (tenant?.id) {
        apiClient.setTenant(tenant.id, tenant.slug);
      }
    }, [tenant]);

    // Fetch real queries from backend on mount and role switch
    const refreshTickets = useCallback(async () => {
      setIsLoadingTickets(true);
      try {
        const data = await queriesApi.getAll();
        if (Array.isArray(data) && data.length > 0) {
          setTickets(data);
        }
      } catch (err) {
        console.warn('[AuthProvider] Backend queries unreachable, retaining current tickets.');
      } finally {
        setIsLoadingTickets(false);
      }
    }, []);

    useEffect(() => {
      refreshTickets();
    }, [refreshTickets, role]);

    const switchRole = (newRole: UserRole) => {
      setRole(newRole);
      setUser(MOCK_USERS[newRole] || MOCK_USERS['COLLEGE_ADMIN']);
      setActiveView('dashboard');
    };

      const addTicket = async (
        ticketData: Omit<Ticket, 'id' | 'ticketNumber' | 'createdAt' | 'updatedAt' | 'messages' | 'isBreached'>
      ) => {
        const tempId = `t-${Date.now()}`;
        const count = tickets.length + 101;
        const ticketNumber = `CQ-2026-00${count}`;
        const now = new Date().toISOString();

          const localTicket: Ticket = {
            ...ticketData,
            id: tempId,
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

    // Optimistic UI update
    setTickets((prev) => [localTicket, ...prev]);

    // Send to backend API
    try {
      const created = await queriesApi.create({
        subject: ticketData.title,
        description: ticketData.description,
        priority: ticketData.priority,
        categoryId: ticketData.category,
        departmentId: ticketData.department,
      });

      if (created && created.id) {
        setTickets((prev) =>
          prev.map((t) => (t.id === tempId ? { ...t, ...created } : t))
        );
      }
    } catch (err) {
      console.warn('[AuthProvider] Real query creation failed, saved locally.', err);
    }
  };

    const updateTicketStatus = async (ticketId: string, newStatus: Ticket['status']) => {
      // Optimistic UI update
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
        setSelectedTicket((prev) => (prev ? { ...prev, status: newStatus } : null));
      }

      // Call backend API
      try {
        await queriesApi.updateStatus(ticketId, newStatus);
      } catch (err) {
        console.warn('[AuthProvider] Remote ticket status update error:', err);
      }
    };

      const addTicketMessage = async (ticketId: string, content: string, isInternal: boolean) => {
        const newMessage = {
          id: `m-${Date.now()}`,
          senderId: user.id,
          senderName: `${user.firstName} ${user.lastName}`,
          senderRole: user.role,
          content,
          isInternal,
          createdAt: new Date().toISOString(),
        };

        // Optimistic UI update
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

// Call backend API
try {
  await conversationsApi.sendMessage(ticketId, { content, isInternal });
} catch (err) {
  console.warn('[AuthProvider] Remote message dispatch error:', err);
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
      isLoadingTickets,
      refreshTickets,
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
