import React from 'react';
import { render, fireEvent } from '@testing-library/react';
import { SettingsInput } from '../SettingsInput';

describe('SettingsInput', () => {
  it('renders input with label', () => {
    const { getByText, getByRole } = render(
      <SettingsInput label="اسم المستخدم" value="" onChange={() => {}} />
    );

    expect(getByText('اسم المستخدم')).toBeInTheDocument();
    expect(getByRole('textbox')).toBeInTheDocument();
  });

  it('displays value correctly', () => {
    const { getByDisplayValue } = render(
      <SettingsInput label="الاسم" value="أحمد" onChange={() => {}} />
    );

    expect(getByDisplayValue('أحمد')).toBeInTheDocument();
  });

  it('calls onChange when value changes', () => {
    const handleChange = jest.fn();
    const { getByRole } = render(
      <SettingsInput label="الاسم" value="" onChange={handleChange} />
    );

    const input = getByRole('textbox');
    fireEvent.change(input, { target: { value: 'محمد' } });

    expect(handleChange).toHaveBeenCalledWith('محمد');
  });

  it('renders with placeholder', () => {
    const { getByPlaceholderText } = render(
      <SettingsInput
        label="البريد"
        value=""
        onChange={() => {}}
        placeholder="example@domain.com"
      />
    );

    expect(getByPlaceholderText('example@domain.com')).toBeInTheDocument();
  });

  it('renders different input types', () => {
    const { rerender, container } = render(
      <SettingsInput label="Test" value="" onChange={() => {}} type="email" />
    );
    expect(container.querySelector('input')).toHaveAttribute('type', 'email');

    rerender(
      <SettingsInput label="Test" value="" onChange={() => {}} type="password" />
    );
    expect(container.querySelector('input')).toHaveAttribute('type', 'password');

    rerender(
      <SettingsInput label="Test" value="" onChange={() => {}} type="number" />
    );
    expect(container.querySelector('input')).toHaveAttribute('type', 'number');
  });

  it('displays error message when error prop is true', () => {
    const { getByText } = render(
      <SettingsInput
        label="البريد"
        value="invalid"
        onChange={() => {}}
        error={true}
        errorMessage="البريد الإلكتروني غير صالح"
      />
    );

    expect(getByText('البريد الإلكتروني غير صالح')).toBeInTheDocument();
  });

  it('applies error background when error is true', () => {
    const { getByRole } = render(
      <SettingsInput
        label="البريد"
        value=""
        onChange={() => {}}
        error={true}
      />
    );

    const input = getByRole('textbox');
    expect(input).toBeInTheDocument();
  });

  it('shows required indicator when required is true', () => {
    const { container } = render(
      <SettingsInput label="الاسم" value="" onChange={() => {}} required />
    );

    const requiredSpan = container.querySelector('span[style*="color: rgb(239, 68, 68)"]');
    expect(requiredSpan).toBeInTheDocument();
    expect(requiredSpan).toHaveTextContent('*');
  });

  it('disables input when disabled prop is true', () => {
    const handleChange = jest.fn();
    const { getByRole } = render(
      <SettingsInput
        label="الاسم"
        value="test"
        onChange={handleChange}
        disabled
      />
    );

    const input = getByRole('textbox') as HTMLInputElement;
    expect(input).toBeDisabled();
    expect(input).toHaveStyle({ opacity: '0.6', cursor: 'not-allowed' });
  });

  it('applies custom styles', () => {
    const customStyle = { fontSize: '18px' };
    const { getByRole } = render(
      <SettingsInput
        label="الاسم"
        value=""
        onChange={() => {}}
        style={customStyle}
      />
    );

    const input = getByRole('textbox');
    expect(input).toHaveStyle({ fontSize: '18px' });
  });

  it('does not show error message when error is false', () => {
    const { queryByText } = render(
      <SettingsInput
        label="البريد"
        value="valid@test.com"
        onChange={() => {}}
        error={false}
        errorMessage="Should not appear"
      />
    );

    expect(queryByText('Should not appear')).not.toBeInTheDocument();
  });

  it('has required attribute when required is true', () => {
    const { container } = render(
      <SettingsInput
        label="الاسم"
        value="test"
        onChange={() => {}}
        required
      />
    );

    const input = container.querySelector('input');
    expect(input).toHaveAttribute('required');
  });

  it('renders with proper width', () => {
    const { getByRole } = render(
      <SettingsInput
        label="الاسم"
        value="test"
        onChange={() => {}}
      />
    );

    const input = getByRole('textbox');
    expect(input).toHaveStyle({ width: '100%' });
  });

  it('handles empty value', () => {
    const { getByRole } = render(
      <SettingsInput label="الاسم" value="" onChange={() => {}} />
    );

    const input = getByRole('textbox') as HTMLInputElement;
    expect(input.value).toBe('');
  });
});
