/**
 * SettingsCard Storybook Stories
 */

import type { Meta, StoryObj } from '@storybook/react';
import { SettingsCard } from './SettingsCard';
import { SettingsButton } from './SettingsButton';
import { SettingsInput } from './SettingsInput';
import { SettingsSelect } from './SettingsSelect';
import { StatusBadge } from './StatusBadge';
import { useState } from 'react';

const meta: Meta<typeof SettingsCard> = {
  title: 'Settings/SettingsCard',
  component: SettingsCard,
  tags: ['autodocs']
};

export default meta;
type Story = StoryObj<typeof SettingsCard>;

// Basic Card with Text
export const BasicCard: Story = {
  args: {
    children: (
      <div style={{ padding: '20px' }}>
        <h3 style={{ margin: '0 0 12px 0', fontSize: '18px', fontWeight: '600' }}>
          بطاقة الإعدادات الأساسية
        </h3>
        <p style={{ margin: 0, color: '#6B7280', lineHeight: '1.6' }}>
          هذه بطاقة إعدادات قياسية مع محتوى نصي بسيط. يمكن استخدامها لعرض المعلومات أو النماذج أو أي محتوى آخر.
        </p>
      </div>
    )
  }
};

// Card with Form Elements
export const CardWithForm: Story = {
  render: () => {
    const [name, setName] = useState('');
    const [email, setEmail] = useState('');
    const [role, setRole] = useState('');

    return (
      <SettingsCard>
        <div style={{ padding: '24px' }}>
          <h3 style={{ margin: '0 0 20px 0', fontSize: '20px', fontWeight: '600' }}>
            معلومات المستخدم
          </h3>
          <SettingsInput
            label="الاسم الكامل"
            value={name}
            onChange={setName}
            placeholder="أدخل الاسم"
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
          <SettingsSelect
            label="الدور"
            value={role}
            onChange={setRole}
            placeholder="اختر الدور"
            options={[
              { value: 'admin', label: 'مسؤول' },
              { value: 'user', label: 'مستخدم' },
              { value: 'guest', label: 'ضيف' }
            ]}
          />
          <div style={{ display: 'flex', gap: '12px', marginTop: '20px' }}>
            <SettingsButton variant="primary">حفظ</SettingsButton>
            <SettingsButton variant="secondary">إلغاء</SettingsButton>
          </div>
        </div>
      </SettingsCard>
    );
  }
};

// Card with Status Information
export const CardWithStatusInfo: Story = {
  args: {
    children: (
      <div style={{ padding: '24px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
          <h3 style={{ margin: 0, fontSize: '18px', fontWeight: '600' }}>حالة النظام</h3>
          <StatusBadge type="success">نشط</StatusBadge>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
            <span style={{ color: '#6B7280' }}>عدد المستخدمين:</span>
            <span style={{ fontWeight: '600' }}>247</span>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
            <span style={{ color: '#6B7280' }}>آخر تحديث:</span>
            <span style={{ fontWeight: '600' }}>منذ 5 دقائق</span>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
            <span style={{ color: '#6B7280' }}>الإصدار:</span>
            <span style={{ fontWeight: '600' }}>v2.1.0</span>
          </div>
        </div>
      </div>
    )
  }
};

// Card with Action Buttons
export const CardWithActions: Story = {
  args: {
    children: (
      <div style={{ padding: '24px' }}>
        <h3 style={{ margin: '0 0 12px 0', fontSize: '18px', fontWeight: '600' }}>
          إدارة الإعدادات
        </h3>
        <p style={{ margin: '0 0 20px 0', color: '#6B7280', lineHeight: '1.6' }}>
          اختر إجراء لإدارة إعدادات النظام. يمكنك تصدير البيانات، استيراد إعدادات جديدة، أو إعادة تعيين كل شيء إلى الإعدادات الافتراضية.
        </p>
        <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
          <SettingsButton variant="primary">تصدير البيانات</SettingsButton>
          <SettingsButton variant="secondary">استيراد الإعدادات</SettingsButton>
          <SettingsButton variant="danger">إعادة التعيين</SettingsButton>
        </div>
      </div>
    )
  }
};

// Card with List Content
export const CardWithList: Story = {
  args: {
    children: (
      <div style={{ padding: '24px' }}>
        <h3 style={{ margin: '0 0 16px 0', fontSize: '18px', fontWeight: '600' }}>
          الصلاحيات المتاحة
        </h3>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          {[
            { name: 'إدارة المستخدمين', enabled: true },
            { name: 'عرض التقارير', enabled: true },
            { name: 'تعديل الإعدادات', enabled: false },
            { name: 'حذف البيانات', enabled: false }
          ].map((permission, index) => (
            <div key={index} style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              padding: '12px',
              background: '#F9FAFB',
              borderRadius: '8px'
            }}>
              <span style={{ color: '#374151' }}>{permission.name}</span>
              <StatusBadge type={permission.enabled ? 'success' : 'error'}>
                {permission.enabled ? 'مفعل' : 'معطل'}
              </StatusBadge>
            </div>
          ))}
        </div>
      </div>
    )
  }
};

// Card with Custom Styling
export const CardWithCustomStyle: Story = {
  args: {
    style: {
      background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
      color: '#FFFFFF'
    },
    children: (
      <div style={{ padding: '32px', textAlign: 'center' }}>
        <h2 style={{ margin: '0 0 12px 0', fontSize: '28px', fontWeight: '700', color: '#FFFFFF' }}>
          مميز
        </h2>
        <p style={{ margin: '0 0 24px 0', fontSize: '16px', opacity: 0.9 }}>
          احصل على وصول غير محدود لجميع الميزات
        </p>
        <SettingsButton
          variant="secondary"
          style={{
            background: '#FFFFFF',
            color: '#667eea',
            border: 'none'
          }}
        >
          اشترك الآن
        </SettingsButton>
      </div>
    )
  }
};

// Card with Grid Layout
export const CardWithGrid: Story = {
  args: {
    children: (
      <div style={{ padding: '24px' }}>
        <h3 style={{ margin: '0 0 20px 0', fontSize: '18px', fontWeight: '600' }}>
          إحصائيات النظام
        </h3>
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(2, 1fr)',
          gap: '16px'
        }}>
          {[
            { label: 'المستخدمين النشطين', value: '1,247', color: '#10B981' },
            { label: 'الطلبات اليوم', value: '8,392', color: '#3B82F6' },
            { label: 'معدل النجاح', value: '98.5%', color: '#F59E0B' },
            { label: 'وقت الاستجابة', value: '245ms', color: '#8B5CF6' }
          ].map((stat, index) => (
            <div key={index} style={{
              padding: '16px',
              background: '#F9FAFB',
              borderRadius: '8px',
              borderRight: `4px solid ${stat.color}`
            }}>
              <div style={{ fontSize: '12px', color: '#6B7280', marginBottom: '4px' }}>
                {stat.label}
              </div>
              <div style={{ fontSize: '24px', fontWeight: '700', color: '#1F2937' }}>
                {stat.value}
              </div>
            </div>
          ))}
        </div>
      </div>
    )
  }
};

// Multiple Cards Layout
export const MultipleCards: Story = {
  render: () => (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px', maxWidth: '800px' }}>
      <SettingsCard>
        <div style={{ padding: '20px' }}>
          <h3 style={{ margin: '0 0 8px 0', fontSize: '16px', fontWeight: '600' }}>البطاقة الأولى</h3>
          <p style={{ margin: 0, color: '#6B7280', fontSize: '14px' }}>محتوى البطاقة الأولى</p>
        </div>
      </SettingsCard>

      <SettingsCard>
        <div style={{ padding: '20px' }}>
          <h3 style={{ margin: '0 0 8px 0', fontSize: '16px', fontWeight: '600' }}>البطاقة الثانية</h3>
          <p style={{ margin: 0, color: '#6B7280', fontSize: '14px' }}>محتوى البطاقة الثانية</p>
        </div>
      </SettingsCard>

      <SettingsCard>
        <div style={{ padding: '20px' }}>
          <h3 style={{ margin: '0 0 8px 0', fontSize: '16px', fontWeight: '600' }}>البطاقة الثالثة</h3>
          <p style={{ margin: 0, color: '#6B7280', fontSize: '14px' }}>محتوى البطاقة الثالثة</p>
        </div>
      </SettingsCard>
    </div>
  )
};

// Compact Card
export const CompactCard: Story = {
  args: {
    children: (
      <div style={{ padding: '16px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <h4 style={{ margin: '0 0 4px 0', fontSize: '14px', fontWeight: '600' }}>إشعار جديد</h4>
            <p style={{ margin: 0, fontSize: '12px', color: '#6B7280' }}>لديك 3 رسائل جديدة</p>
          </div>
          <SettingsButton variant="primary" style={{ padding: '8px 16px', fontSize: '12px' }}>
            عرض
          </SettingsButton>
        </div>
      </div>
    )
  }
};
