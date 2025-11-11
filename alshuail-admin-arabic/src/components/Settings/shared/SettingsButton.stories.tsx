/**
 * SettingsButton Storybook Stories
 *
 * To use these stories:
 * 1. Install Storybook: npx storybook@latest init
 * 2. Run: npm run storybook
 */

import type { Meta, StoryObj } from '@storybook/react';
import { SettingsButton } from './SettingsButton';
import { PlusIcon, TrashIcon, CheckIcon } from '@heroicons/react/24/outline';

const meta: Meta<typeof SettingsButton> = {
  title: 'Settings/SettingsButton',
  component: SettingsButton,
  tags: ['autodocs'],
  argTypes: {
    variant: {
      control: 'select',
      options: ['primary', 'secondary', 'danger'],
      description: 'Button style variant'
    },
    disabled: {
      control: 'boolean',
      description: 'Disable the button'
    }
  }
};

export default meta;
type Story = StoryObj<typeof SettingsButton>;

// Primary Button
export const Primary: Story = {
  args: {
    variant: 'primary',
    children: 'حفظ التغييرات',
    disabled: false
  }
};

// Secondary Button
export const Secondary: Story = {
  args: {
    variant: 'secondary',
    children: 'إلغاء',
    disabled: false
  }
};

// Danger Button
export const Danger: Story = {
  args: {
    variant: 'danger',
    children: 'حذف',
    disabled: false
  }
};

// With Icon - Primary
export const PrimaryWithIcon: Story = {
  args: {
    variant: 'primary',
    children: 'إضافة جديد',
    icon: <PlusIcon style={{ width: '18px', height: '18px' }} />,
    disabled: false
  }
};

// With Icon - Danger
export const DangerWithIcon: Story = {
  args: {
    variant: 'danger',
    children: 'حذف العنصر',
    icon: <TrashIcon style={{ width: '18px', height: '18px' }} />,
    disabled: false
  }
};

// With Icon - Success Check
export const SuccessWithIcon: Story = {
  args: {
    variant: 'primary',
    children: 'تم الحفظ',
    icon: <CheckIcon style={{ width: '18px', height: '18px' }} />,
    disabled: false
  }
};

// Disabled States
export const PrimaryDisabled: Story = {
  args: {
    variant: 'primary',
    children: 'حفظ',
    disabled: true
  }
};

export const SecondaryDisabled: Story = {
  args: {
    variant: 'secondary',
    children: 'إلغاء',
    disabled: true
  }
};

// All Variants Side by Side
export const AllVariants: Story = {
  render: () => (
    <div style={{ display: 'flex', gap: '12px', flexDirection: 'column' }}>
      <div style={{ display: 'flex', gap: '12px' }}>
        <SettingsButton variant="primary">Primary</SettingsButton>
        <SettingsButton variant="secondary">Secondary</SettingsButton>
        <SettingsButton variant="danger">Danger</SettingsButton>
      </div>
      <div style={{ display: 'flex', gap: '12px' }}>
        <SettingsButton variant="primary" disabled>Primary Disabled</SettingsButton>
        <SettingsButton variant="secondary" disabled>Secondary Disabled</SettingsButton>
        <SettingsButton variant="danger" disabled>Danger Disabled</SettingsButton>
      </div>
      <div style={{ display: 'flex', gap: '12px' }}>
        <SettingsButton variant="primary" icon={<PlusIcon style={{ width: '18px' }} />}>
          With Icon
        </SettingsButton>
        <SettingsButton variant="danger" icon={<TrashIcon style={{ width: '18px' }} />}>
          Delete
        </SettingsButton>
      </div>
    </div>
  )
};
