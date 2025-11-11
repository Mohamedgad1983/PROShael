/**
 * SettingsInput Storybook Stories
 */

import type { Meta, StoryObj } from '@storybook/react';
import { useState } from 'react';
import { SettingsInput } from './SettingsInput';

const meta: Meta<typeof SettingsInput> = {
  title: 'Settings/SettingsInput',
  component: SettingsInput,
  tags: ['autodocs'],
  argTypes: {
    type: {
      control: 'select',
      options: ['text', 'email', 'password', 'number', 'tel', 'url'],
      description: 'Input type'
    },
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
type Story = StoryObj<typeof SettingsInput>;

// Interactive wrapper for stories
const InteractiveWrapper = (args: any) => {
  const [value, setValue] = useState(args.value || '');
  return <SettingsInput {...args} value={value} onChange={setValue} />;
};

// Basic Text Input
export const TextInput: Story = {
  render: InteractiveWrapper,
  args: {
    label: 'اسم المستخدم',
    placeholder: 'أدخل اسم المستخدم',
    type: 'text',
    value: ''
  }
};

// Email Input
export const EmailInput: Story = {
  render: InteractiveWrapper,
  args: {
    label: 'البريد الإلكتروني',
    placeholder: 'example@domain.com',
    type: 'email',
    value: ''
  }
};

// Password Input
export const PasswordInput: Story = {
  render: InteractiveWrapper,
  args: {
    label: 'كلمة المرور',
    placeholder: '••••••••',
    type: 'password',
    value: ''
  }
};

// Number Input
export const NumberInput: Story = {
  render: InteractiveWrapper,
  args: {
    label: 'رقم الهاتف',
    placeholder: '0500000000',
    type: 'tel',
    value: ''
  }
};

// Required Field
export const RequiredField: Story = {
  render: InteractiveWrapper,
  args: {
    label: 'الاسم الكامل',
    placeholder: 'مطلوب',
    type: 'text',
    required: true,
    value: ''
  }
};

// With Error
export const WithError: Story = {
  render: InteractiveWrapper,
  args: {
    label: 'البريد الإلكتروني',
    placeholder: 'example@domain.com',
    type: 'email',
    value: 'invalid-email',
    error: true,
    errorMessage: 'البريد الإلكتروني غير صالح'
  }
};

// Disabled State
export const Disabled: Story = {
  render: InteractiveWrapper,
  args: {
    label: 'حقل معطل',
    placeholder: 'لا يمكن التعديل',
    type: 'text',
    value: 'قيمة غير قابلة للتعديل',
    disabled: true
  }
};

// Form Example
export const FormExample: Story = {
  render: () => {
    const [username, setUsername] = useState('');
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [phone, setPhone] = useState('');

    return (
      <div style={{ maxWidth: '400px', direction: 'rtl' }}>
        <h3>نموذج تسجيل</h3>
        <SettingsInput
          label="اسم المستخدم"
          value={username}
          onChange={setUsername}
          placeholder="أدخل اسم المستخدم"
          required
        />
        <SettingsInput
          label="البريد الإلكتروني"
          type="email"
          value={email}
          onChange={setEmail}
          placeholder="example@domain.com"
          required
        />
        <SettingsInput
          label="كلمة المرور"
          type="password"
          value={password}
          onChange={setPassword}
          placeholder="••••••••"
          required
        />
        <SettingsInput
          label="رقم الهاتف"
          type="tel"
          value={phone}
          onChange={setPhone}
          placeholder="05XXXXXXXX"
        />
      </div>
    );
  }
};

// Validation Example
export const ValidationExample: Story = {
  render: () => {
    const [email, setEmail] = useState('');
    const [error, setError] = useState(false);
    const [errorMessage, setErrorMessage] = useState('');

    const validateEmail = (value: string) => {
      setEmail(value);
      if (value && !value.includes('@')) {
        setError(true);
        setErrorMessage('البريد الإلكتروني يجب أن يحتوي على @');
      } else {
        setError(false);
        setErrorMessage('');
      }
    };

    return (
      <div style={{ maxWidth: '400px', direction: 'rtl' }}>
        <h3>مثال على التحقق من الصحة</h3>
        <SettingsInput
          label="البريد الإلكتروني"
          type="email"
          value={email}
          onChange={validateEmail}
          placeholder="أدخل البريد الإلكتروني"
          error={error}
          errorMessage={errorMessage}
          required
        />
      </div>
    );
  }
};
