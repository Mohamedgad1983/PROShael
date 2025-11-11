/**
 * SettingsSelect Storybook Stories
 */

import type { Meta, StoryObj } from '@storybook/react';
import { useState } from 'react';
import { SettingsSelect } from './SettingsSelect';

const meta: Meta<typeof SettingsSelect> = {
  title: 'Settings/SettingsSelect',
  component: SettingsSelect,
  tags: ['autodocs'],
  argTypes: {
    error: {
      control: 'boolean',
      description: 'Error state'
    },
    disabled: {
      control: 'boolean',
      description: 'Disabled state'
    },
    required: {
      control: 'boolean',
      description: 'Required field indicator'
    }
  }
};

export default meta;
type Story = StoryObj<typeof SettingsSelect>;

// Interactive wrapper for stories
const InteractiveWrapper = (args: any) => {
  const [value, setValue] = useState(args.value || '');
  return <SettingsSelect {...args} value={value} onChange={setValue} />;
};

// Basic Select
export const BasicSelect: Story = {
  render: InteractiveWrapper,
  args: {
    label: 'الدور',
    value: '',
    options: [
      { value: 'admin', label: 'مسؤول' },
      { value: 'user', label: 'مستخدم' },
      { value: 'guest', label: 'ضيف' }
    ]
  }
};

// With Placeholder
export const WithPlaceholder: Story = {
  render: InteractiveWrapper,
  args: {
    label: 'اختر الدور',
    placeholder: 'اختر من القائمة...',
    value: '',
    options: [
      { value: 'super_admin', label: 'مسؤول رئيسي' },
      { value: 'admin', label: 'مسؤول' },
      { value: 'moderator', label: 'مشرف' },
      { value: 'user', label: 'مستخدم' }
    ]
  }
};

// Required Field
export const RequiredField: Story = {
  render: InteractiveWrapper,
  args: {
    label: 'نوع المستخدم',
    placeholder: 'مطلوب',
    value: '',
    required: true,
    options: [
      { value: 'individual', label: 'فرد' },
      { value: 'business', label: 'شركة' },
      { value: 'organization', label: 'منظمة' }
    ]
  }
};

// With Error
export const WithError: Story = {
  render: InteractiveWrapper,
  args: {
    label: 'الدور',
    value: '',
    error: true,
    errorMessage: 'يجب اختيار دور',
    options: [
      { value: 'admin', label: 'مسؤول' },
      { value: 'user', label: 'مستخدم' }
    ]
  }
};

// Disabled State
export const Disabled: Story = {
  render: InteractiveWrapper,
  args: {
    label: 'الدور (معطل)',
    value: 'user',
    disabled: true,
    options: [
      { value: 'admin', label: 'مسؤول' },
      { value: 'user', label: 'مستخدم' }
    ]
  }
};

// Many Options
export const ManyOptions: Story = {
  render: InteractiveWrapper,
  args: {
    label: 'المدينة',
    placeholder: 'اختر المدينة',
    value: '',
    options: [
      { value: 'riyadh', label: 'الرياض' },
      { value: 'jeddah', label: 'جدة' },
      { value: 'mecca', label: 'مكة المكرمة' },
      { value: 'medina', label: 'المدينة المنورة' },
      { value: 'dammam', label: 'الدمام' },
      { value: 'khobar', label: 'الخبر' },
      { value: 'taif', label: 'الطائف' },
      { value: 'buraidah', label: 'بريدة' },
      { value: 'tabuk', label: 'تبوك' },
      { value: 'khamis', label: 'خميس مشيط' }
    ]
  }
};

// Form Example
export const FormExample: Story = {
  render: () => {
    const [role, setRole] = useState('');
    const [status, setStatus] = useState('');
    const [department, setDepartment] = useState('');

    return (
      <div style={{ maxWidth: '400px', direction: 'rtl' }}>
        <h3>نموذج إعدادات المستخدم</h3>
        <SettingsSelect
          label="الدور"
          value={role}
          onChange={setRole}
          placeholder="اختر الدور"
          required
          options={[
            { value: 'super_admin', label: 'مسؤول رئيسي' },
            { value: 'admin', label: 'مسؤول' },
            { value: 'moderator', label: 'مشرف' },
            { value: 'user', label: 'مستخدم' }
          ]}
        />
        <SettingsSelect
          label="الحالة"
          value={status}
          onChange={setStatus}
          placeholder="اختر الحالة"
          required
          options={[
            { value: 'active', label: 'نشط' },
            { value: 'inactive', label: 'غير نشط' },
            { value: 'suspended', label: 'معلق' }
          ]}
        />
        <SettingsSelect
          label="القسم"
          value={department}
          onChange={setDepartment}
          placeholder="اختر القسم"
          options={[
            { value: 'hr', label: 'الموارد البشرية' },
            { value: 'it', label: 'تقنية المعلومات' },
            { value: 'finance', label: 'المالية' },
            { value: 'sales', label: 'المبيعات' }
          ]}
        />
      </div>
    );
  }
};

// Validation Example
export const ValidationExample: Story = {
  render: () => {
    const [role, setRole] = useState('');
    const [error, setError] = useState(false);
    const [errorMessage, setErrorMessage] = useState('');

    const handleChange = (value: string) => {
      setRole(value);
      if (!value) {
        setError(true);
        setErrorMessage('يجب اختيار دور');
      } else {
        setError(false);
        setErrorMessage('');
      }
    };

    return (
      <div style={{ maxWidth: '400px', direction: 'rtl' }}>
        <h3>مثال على التحقق من الصحة</h3>
        <SettingsSelect
          label="الدور"
          value={role}
          onChange={handleChange}
          placeholder="اختر الدور"
          required
          error={error}
          errorMessage={errorMessage}
          options={[
            { value: 'admin', label: 'مسؤول' },
            { value: 'user', label: 'مستخدم' },
            { value: 'guest', label: 'ضيف' }
          ]}
        />
      </div>
    );
  }
};
