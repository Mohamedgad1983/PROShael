/**
 * SettingsTable Storybook Stories
 */

import type { Meta, StoryObj } from '@storybook/react';
import { SettingsTable } from './SettingsTable';
import { StatusBadge } from './StatusBadge';
import { SettingsButton } from './SettingsButton';
import { PencilIcon, TrashIcon } from '@heroicons/react/24/outline';

interface User {
  id: string;
  name: string;
  email: string;
  role: string;
  status: 'active' | 'inactive' | 'suspended';
}

const meta: Meta<typeof SettingsTable> = {
  title: 'Settings/SettingsTable',
  component: SettingsTable,
  tags: ['autodocs']
};

export default meta;
type Story = StoryObj<typeof SettingsTable<User>>;

const sampleUsers: User[] = [
  { id: '1', name: 'أحمد محمد', email: 'ahmed@example.com', role: 'admin', status: 'active' },
  { id: '2', name: 'فاطمة علي', email: 'fatima@example.com', role: 'user', status: 'active' },
  { id: '3', name: 'محمد خالد', email: 'mohamed@example.com', role: 'moderator', status: 'inactive' },
  { id: '4', name: 'سارة أحمد', email: 'sara@example.com', role: 'user', status: 'suspended' },
  { id: '5', name: 'عبدالله عمر', email: 'abdullah@example.com', role: 'user', status: 'active' }
];

// Basic Table
export const BasicTable: Story = {
  args: {
    columns: [
      { key: 'name', label: 'الاسم' },
      { key: 'email', label: 'البريد الإلكتروني' },
      { key: 'role', label: 'الدور' }
    ],
    data: sampleUsers,
    keyExtractor: (user) => user.id
  }
};

// With Custom Render
export const WithCustomRender: Story = {
  args: {
    columns: [
      { key: 'name', label: 'الاسم' },
      { key: 'email', label: 'البريد الإلكتروني' },
      {
        key: 'role',
        label: 'الدور',
        render: (user) => (
          <span style={{ fontWeight: '600', color: user.role === 'admin' ? '#667eea' : '#6B7280' }}>
            {user.role === 'admin' ? 'مسؤول' : user.role === 'moderator' ? 'مشرف' : 'مستخدم'}
          </span>
        )
      }
    ],
    data: sampleUsers,
    keyExtractor: (user) => user.id
  }
};

// With Status Badges
export const WithStatusBadges: Story = {
  args: {
    columns: [
      { key: 'name', label: 'الاسم', width: '30%' },
      { key: 'email', label: 'البريد الإلكتروني', width: '35%' },
      {
        key: 'status',
        label: 'الحالة',
        width: '20%',
        render: (user) => {
          const statusMap = {
            active: { type: 'success' as const, label: 'نشط' },
            inactive: { type: 'error' as const, label: 'غير نشط' },
            suspended: { type: 'warning' as const, label: 'معلق' }
          };
          const status = statusMap[user.status];
          return <StatusBadge type={status.type}>{status.label}</StatusBadge>;
        }
      }
    ],
    data: sampleUsers,
    keyExtractor: (user) => user.id
  }
};

// With Actions Column
export const WithActions: Story = {
  args: {
    columns: [
      { key: 'name', label: 'الاسم', width: '25%' },
      { key: 'email', label: 'البريد الإلكتروني', width: '30%' },
      {
        key: 'role',
        label: 'الدور',
        width: '20%',
        render: (user) => user.role === 'admin' ? 'مسؤول' : 'مستخدم'
      },
      {
        key: 'actions',
        label: 'الإجراءات',
        width: '25%',
        render: (user) => (
          <div style={{ display: 'flex', gap: '8px' }}>
            <SettingsButton
              variant="secondary"
              icon={<PencilIcon style={{ width: '16px' }} />}
              style={{ padding: '6px 12px', fontSize: '12px' }}
            >
              تعديل
            </SettingsButton>
            <SettingsButton
              variant="danger"
              icon={<TrashIcon style={{ width: '16px' }} />}
              style={{ padding: '6px 12px', fontSize: '12px' }}
            >
              حذف
            </SettingsButton>
          </div>
        )
      }
    ],
    data: sampleUsers,
    keyExtractor: (user) => user.id
  }
};

// Empty State
export const EmptyState: Story = {
  args: {
    columns: [
      { key: 'name', label: 'الاسم' },
      { key: 'email', label: 'البريد الإلكتروني' },
      { key: 'role', label: 'الدور' }
    ],
    data: [],
    keyExtractor: (user) => user.id,
    emptyMessage: 'لا توجد مستخدمين'
  }
};

// Complete Example with All Features
export const CompleteExample: Story = {
  args: {
    columns: [
      {
        key: 'name',
        label: 'الاسم',
        width: '20%',
        render: (user) => (
          <div style={{ fontWeight: '600', color: '#1F2937' }}>{user.name}</div>
        )
      },
      {
        key: 'email',
        label: 'البريد الإلكتروني',
        width: '25%',
        render: (user) => (
          <div style={{ color: '#6B7280' }}>{user.email}</div>
        )
      },
      {
        key: 'role',
        label: 'الدور',
        width: '15%',
        render: (user) => {
          const roleMap: Record<string, string> = {
            admin: 'مسؤول',
            moderator: 'مشرف',
            user: 'مستخدم'
          };
          return (
            <span style={{
              padding: '4px 8px',
              borderRadius: '6px',
              fontSize: '12px',
              fontWeight: '500',
              background: user.role === 'admin' ? 'rgba(102, 126, 234, 0.1)' : '#F3F4F6',
              color: user.role === 'admin' ? '#667eea' : '#6B7280'
            }}>
              {roleMap[user.role]}
            </span>
          );
        }
      },
      {
        key: 'status',
        label: 'الحالة',
        width: '15%',
        render: (user) => {
          const statusMap = {
            active: { type: 'success' as const, label: 'نشط' },
            inactive: { type: 'error' as const, label: 'غير نشط' },
            suspended: { type: 'warning' as const, label: 'معلق' }
          };
          const status = statusMap[user.status];
          return <StatusBadge type={status.type}>{status.label}</StatusBadge>;
        }
      },
      {
        key: 'actions',
        label: 'الإجراءات',
        width: '25%',
        render: (user) => (
          <div style={{ display: 'flex', gap: '8px' }}>
            <SettingsButton
              variant="secondary"
              icon={<PencilIcon style={{ width: '14px' }} />}
              style={{ padding: '6px 12px', fontSize: '12px' }}
            >
              تعديل
            </SettingsButton>
            <SettingsButton
              variant="danger"
              icon={<TrashIcon style={{ width: '14px' }} />}
              style={{ padding: '6px 12px', fontSize: '12px' }}
            >
              حذف
            </SettingsButton>
          </div>
        )
      }
    ],
    data: sampleUsers,
    keyExtractor: (user) => user.id
  }
};
