import React from 'react';
import { render, fireEvent } from '@testing-library/react';
import { SettingsButton } from '../SettingsButton';
import { PlusIcon } from '@heroicons/react/24/outline';

describe('SettingsButton', () => {
  it('renders button with text', () => {
    const { getByRole } = render(<SettingsButton>حفظ</SettingsButton>);
    expect(getByRole('button', { name: 'حفظ' })).toBeInTheDocument();
  });

  it('renders primary variant by default', () => {
    const { getByRole } = render(<SettingsButton>حفظ</SettingsButton>);
    expect(getByRole('button')).toBeInTheDocument();
  });

  it('renders secondary variant', () => {
    const { getByRole } = render(
      <SettingsButton variant="secondary">إلغاء</SettingsButton>
    );
    expect(getByRole('button')).toBeInTheDocument();
  });

  it('renders danger variant', () => {
    const { getByRole } = render(
      <SettingsButton variant="danger">حذف</SettingsButton>
    );
    expect(getByRole('button')).toBeInTheDocument();
  });

  it('calls onClick when clicked', () => {
    const handleClick = jest.fn();
    const { getByRole } = render(
      <SettingsButton onClick={handleClick}>نقر</SettingsButton>
    );

    fireEvent.click(getByRole('button'));
    expect(handleClick).toHaveBeenCalledTimes(1);
  });

  it('does not call onClick when disabled', () => {
    const handleClick = jest.fn();
    const { getByRole } = render(
      <SettingsButton onClick={handleClick} disabled>
        معطل
      </SettingsButton>
    );

    const button = getByRole('button');
    expect(button).toBeDisabled();
    fireEvent.click(button);
    expect(handleClick).not.toHaveBeenCalled();
  });

  it('renders with icon', () => {
    const { getByRole, container } = render(
      <SettingsButton icon={<PlusIcon data-testid="icon" />}>
        إضافة
      </SettingsButton>
    );

    expect(getByRole('button')).toBeInTheDocument();
    expect(container.querySelector('[data-testid="icon"]')).toBeInTheDocument();
  });

  it('applies custom padding style', () => {
    const customStyle = { padding: '20px' };
    const { getByRole } = render(
      <SettingsButton style={customStyle}>مخصص</SettingsButton>
    );

    const button = getByRole('button');
    expect(button).toHaveStyle({ padding: '20px' });
  });

  it('disabled button has reduced opacity', () => {
    const { getByRole } = render(
      <SettingsButton disabled>معطل</SettingsButton>
    );

    const button = getByRole('button');
    expect(button).toHaveStyle({ opacity: '0.6', cursor: 'not-allowed' });
  });

  it('renders button text as accessible name', () => {
    const { getByRole } = render(
      <SettingsButton>حفظ التغييرات</SettingsButton>
    );

    const button = getByRole('button', { name: 'حفظ التغييرات' });
    expect(button).toBeInTheDocument();
  });

  it('handles multiple clicks correctly', () => {
    const handleClick = jest.fn();
    const { getByRole } = render(
      <SettingsButton onClick={handleClick}>نقر</SettingsButton>
    );

    const button = getByRole('button');
    fireEvent.click(button);
    fireEvent.click(button);
    fireEvent.click(button);
    expect(handleClick).toHaveBeenCalledTimes(3);
  });

  it('renders button with flex display for icon layout', () => {
    const { getByRole } = render(
      <SettingsButton>محتوى</SettingsButton>
    );

    const button = getByRole('button');
    expect(button).toHaveStyle({ display: 'flex', alignItems: 'center' });
  });
});
