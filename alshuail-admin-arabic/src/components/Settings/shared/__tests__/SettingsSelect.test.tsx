import React from 'react';
import { render, fireEvent } from '@testing-library/react';
import { SettingsSelect } from '../SettingsSelect';

describe('SettingsSelect', () => {
  const options = [
    { value: 'admin', label: 'مسؤول' },
    { value: 'user', label: 'مستخدم' },
    { value: 'guest', label: 'ضيف' }
  ];

  it('renders select with label', () => {
    const { getByText, container } = render(
      <SettingsSelect label="الدور" value="" onChange={() => {}} options={options} />
    );

    expect(getByText('الدور')).toBeInTheDocument();
    expect(container.querySelector('select')).toBeInTheDocument();
  });

  it('displays all options', () => {
    const { container } = render(
      <SettingsSelect label="الدور" value="" onChange={() => {}} options={options} />
    );

    const select = container.querySelector('select');
    const optionElements = select?.querySelectorAll('option');

    // Includes placeholder option when value is empty
    expect(optionElements).toHaveLength(4);
    expect(optionElements?.[0]).toHaveTextContent('اختر...');
    expect(optionElements?.[1]).toHaveTextContent('مسؤول');
    expect(optionElements?.[2]).toHaveTextContent('مستخدم');
    expect(optionElements?.[3]).toHaveTextContent('ضيف');
  });

  it('displays selected value correctly', () => {
    const { container } = render(
      <SettingsSelect
        label="الدور"
        value="admin"
        onChange={() => {}}
        options={options}
      />
    );

    const select = container.querySelector('select') as HTMLSelectElement;
    expect(select.value).toBe('admin');
  });

  it('calls onChange when value changes', () => {
    const handleChange = jest.fn();
    const { container } = render(
      <SettingsSelect
        label="الدور"
        value=""
        onChange={handleChange}
        options={options}
      />
    );

    const select = container.querySelector('select')!;
    fireEvent.change(select, { target: { value: 'user' } });

    expect(handleChange).toHaveBeenCalledWith('user');
  });

  it('renders with placeholder', () => {
    const { container } = render(
      <SettingsSelect
        label="الدور"
        value=""
        onChange={() => {}}
        options={options}
        placeholder="اختر الدور"
      />
    );

    const select = container.querySelector('select');
    const placeholderOption = select?.querySelector('option[value=""]');

    expect(placeholderOption).toHaveTextContent('اختر الدور');
  });

  it('displays error message when error prop is true', () => {
    const { getByText } = render(
      <SettingsSelect
        label="الدور"
        value=""
        onChange={() => {}}
        options={options}
        error={true}
        errorMessage="يجب اختيار دور"
      />
    );

    expect(getByText('يجب اختيار دور')).toBeInTheDocument();
  });

  it('shows required indicator when required is true', () => {
    const { container } = render(
      <SettingsSelect
        label="الدور"
        value=""
        onChange={() => {}}
        options={options}
        required
      />
    );

    const requiredSpan = container.querySelector('span[style*="color: rgb(239, 68, 68)"]');
    expect(requiredSpan).toBeInTheDocument();
    expect(requiredSpan).toHaveTextContent('*');
  });

  it('disables select when disabled prop is true', () => {
    const handleChange = jest.fn();
    const { container } = render(
      <SettingsSelect
        label="الدور"
        value="admin"
        onChange={handleChange}
        options={options}
        disabled
      />
    );

    const select = container.querySelector('select') as HTMLSelectElement;
    expect(select).toBeDisabled();
    expect(select).toHaveStyle({ opacity: '0.6', cursor: 'not-allowed' });
  });

  it('applies custom styles', () => {
    const customStyle = { fontSize: '18px' };
    const { container } = render(
      <SettingsSelect
        label="الدور"
        value=""
        onChange={() => {}}
        options={options}
        style={customStyle}
      />
    );

    const select = container.querySelector('select');
    expect(select).toHaveStyle({ fontSize: '18px' });
  });

  it('does not show error message when error is false', () => {
    const { queryByText } = render(
      <SettingsSelect
        label="الدور"
        value="admin"
        onChange={() => {}}
        options={options}
        error={false}
        errorMessage="Should not appear"
      />
    );

    expect(queryByText('Should not appear')).not.toBeInTheDocument();
  });

  it('handles empty options array', () => {
    const { container } = render(
      <SettingsSelect label="الدور" value="" onChange={() => {}} options={[]} />
    );

    const select = container.querySelector('select');
    const optionElements = select?.querySelectorAll('option');

    // Still has placeholder option even with empty options array
    expect(optionElements).toHaveLength(1);
    expect(optionElements?.[0]).toHaveTextContent('اختر...');
  });

  it('has required attribute when required is true', () => {
    const { container } = render(
      <SettingsSelect
        label="الدور"
        value="admin"
        onChange={() => {}}
        options={options}
        required
      />
    );

    const select = container.querySelector('select');
    expect(select).toHaveAttribute('required');
  });

  it('renders with full width', () => {
    const { container } = render(
      <SettingsSelect
        label="الدور"
        value="admin"
        onChange={() => {}}
        options={options}
      />
    );

    const select = container.querySelector('select');
    expect(select).toHaveStyle({ width: '100%' });
  });

  it('handles multiple options correctly', () => {
    const manyOptions = [
      { value: '1', label: 'Option 1' },
      { value: '2', label: 'Option 2' },
      { value: '3', label: 'Option 3' },
      { value: '4', label: 'Option 4' },
      { value: '5', label: 'Option 5' }
    ];

    const { container } = render(
      <SettingsSelect
        label="اختر"
        value="1"
        onChange={() => {}}
        options={manyOptions}
      />
    );

    const select = container.querySelector('select');
    const optionElements = select?.querySelectorAll('option');
    // Has 6 options: placeholder + 5 data options (placeholder always present)
    expect(optionElements).toHaveLength(6);
  });
});
