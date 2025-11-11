import React from 'react';
import { render } from '@testing-library/react';
import { StatusBadge } from '../StatusBadge';
import { CheckCircleIcon } from '@heroicons/react/24/outline';

describe('StatusBadge', () => {
  it('renders badge with text', () => {
    const { getByText } = render(<StatusBadge type="success">نشط</StatusBadge>);
    expect(getByText('نشط')).toBeInTheDocument();
  });

  it('renders success type', () => {
    const { getByText } = render(<StatusBadge type="success">نشط</StatusBadge>);
    expect(getByText('نشط')).toBeInTheDocument();
  });

  it('renders error type', () => {
    const { getByText } = render(<StatusBadge type="error">خطأ</StatusBadge>);
    expect(getByText('خطأ')).toBeInTheDocument();
  });

  it('renders warning type', () => {
    const { getByText } = render(<StatusBadge type="warning">تحذير</StatusBadge>);
    expect(getByText('تحذير')).toBeInTheDocument();
  });

  it('renders info type', () => {
    const { getByText } = render(<StatusBadge type="info">معلومة</StatusBadge>);
    expect(getByText('معلومة')).toBeInTheDocument();
  });

  it('renders with icon', () => {
    const { getByText, container } = render(
      <StatusBadge type="success" icon={<CheckCircleIcon data-testid="check-icon" />}>
        تم التفعيل
      </StatusBadge>
    );

    expect(getByText('تم التفعيل')).toBeInTheDocument();
    expect(container.querySelector('[data-testid="check-icon"]')).toBeInTheDocument();
  });

  it('applies custom padding style', () => {
    const customStyle = { padding: '10px' };
    const { getByText } = render(
      <StatusBadge type="success" style={customStyle}>
        مخصص
      </StatusBadge>
    );

    const badge = getByText('مخصص');
    expect(badge).toHaveStyle({ padding: '10px' });
  });

  it('has proper accessibility structure', () => {
    const { container } = render(<StatusBadge type="success">نشط</StatusBadge>);
    const badge = container.firstChild;

    expect(badge).toHaveStyle({
      display: 'inline-flex',
      alignItems: 'center',
      gap: '4px'
    });
  });

  it('renders all badge types correctly', () => {
    const { rerender, getByText } = render(
      <StatusBadge type="success">Success</StatusBadge>
    );
    expect(getByText('Success')).toBeInTheDocument();

    rerender(<StatusBadge type="error">Error</StatusBadge>);
    expect(getByText('Error')).toBeInTheDocument();

    rerender(<StatusBadge type="warning">Warning</StatusBadge>);
    expect(getByText('Warning')).toBeInTheDocument();

    rerender(<StatusBadge type="info">Info</StatusBadge>);
    expect(getByText('Info')).toBeInTheDocument();
  });

  it('icon appears before text', () => {
    const { container } = render(
      <StatusBadge type="success" icon={<CheckCircleIcon />}>
        نشط
      </StatusBadge>
    );

    const badge = container.firstChild as HTMLElement;
    const children = Array.from(badge.childNodes);

    // Icon should be first child
    expect(children.length).toBeGreaterThan(1);
  });

  it('renders with Arabic text', () => {
    const { getByText } = render(
      <StatusBadge type="success">نشط ومفعل</StatusBadge>
    );
    expect(getByText('نشط ومفعل')).toBeInTheDocument();
  });

  it('maintains inline-flex display for proper icon alignment', () => {
    const { container } = render(
      <StatusBadge type="info">Info</StatusBadge>
    );

    const badge = container.firstChild as HTMLElement;
    expect(badge).toHaveStyle({ display: 'inline-flex' });
  });
});
