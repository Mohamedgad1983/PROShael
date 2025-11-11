/**
 * StatusBadge Storybook Stories
 */

import type { Meta, StoryObj } from '@storybook/react';
import { StatusBadge } from './StatusBadge';
import { CheckCircleIcon, XCircleIcon, ExclamationTriangleIcon, InformationCircleIcon } from '@heroicons/react/24/outline';

const meta: Meta<typeof StatusBadge> = {
  title: 'Settings/StatusBadge',
  component: StatusBadge,
  tags: ['autodocs'],
  argTypes: {
    type: {
      control: 'select',
      options: ['success', 'error', 'warning', 'info'],
      description: 'Badge type/color scheme'
    }
  }
};

export default meta;
type Story = StoryObj<typeof StatusBadge>;

// Success Badge
export const Success: Story = {
  args: {
    type: 'success',
    children: 'نشط'
  }
};

// Error Badge
export const Error: Story = {
  args: {
    type: 'error',
    children: 'غير نشط'
  }
};

// Warning Badge
export const Warning: Story = {
  args: {
    type: 'warning',
    children: 'معلق'
  }
};

// Info Badge
export const Info: Story = {
  args: {
    type: 'info',
    children: 'قيد المراجعة'
  }
};

// With Icons
export const SuccessWithIcon: Story = {
  args: {
    type: 'success',
    children: 'تم التفعيل',
    icon: <CheckCircleIcon style={{ width: '16px', height: '16px' }} />
  }
};

export const ErrorWithIcon: Story = {
  args: {
    type: 'error',
    children: 'فشل',
    icon: <XCircleIcon style={{ width: '16px', height: '16px' }} />
  }
};

export const WarningWithIcon: Story = {
  args: {
    type: 'warning',
    children: 'تحذير',
    icon: <ExclamationTriangleIcon style={{ width: '16px', height: '16px' }} />
  }
};

export const InfoWithIcon: Story = {
  args: {
    type: 'info',
    children: 'معلومة',
    icon: <InformationCircleIcon style={{ width: '16px', height: '16px' }} />
  }
};

// Status Examples
export const UserStatuses: Story = {
  render: () => (
    <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
      <StatusBadge type="success" icon={<CheckCircleIcon style={{ width: '14px' }} />}>
        نشط
      </StatusBadge>
      <StatusBadge type="error" icon={<XCircleIcon style={{ width: '14px' }} />}>
        محظور
      </StatusBadge>
      <StatusBadge type="warning" icon={<ExclamationTriangleIcon style={{ width: '14px' }} />}>
        معلق
      </StatusBadge>
      <StatusBadge type="info">
        قيد المراجعة
      </StatusBadge>
    </div>
  )
};

// All Types Side by Side
export const AllTypes: Story = {
  render: () => (
    <div style={{ display: 'flex', gap: '12px', flexDirection: 'column' }}>
      <div style={{ display: 'flex', gap: '8px' }}>
        <StatusBadge type="success">Success</StatusBadge>
        <StatusBadge type="error">Error</StatusBadge>
        <StatusBadge type="warning">Warning</StatusBadge>
        <StatusBadge type="info">Info</StatusBadge>
      </div>
      <div style={{ display: 'flex', gap: '8px' }}>
        <StatusBadge type="success" icon={<CheckCircleIcon style={{ width: '14px' }} />}>
          With Icon
        </StatusBadge>
        <StatusBadge type="error" icon={<XCircleIcon style={{ width: '14px' }} />}>
          With Icon
        </StatusBadge>
        <StatusBadge type="warning" icon={<ExclamationTriangleIcon style={{ width: '14px' }} />}>
          With Icon
        </StatusBadge>
        <StatusBadge type="info" icon={<InformationCircleIcon style={{ width: '14px' }} />}>
          With Icon
        </StatusBadge>
      </div>
    </div>
  )
};
