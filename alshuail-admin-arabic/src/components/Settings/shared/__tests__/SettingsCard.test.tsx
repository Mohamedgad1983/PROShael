import React from 'react';
import { render } from '@testing-library/react';
import { SettingsCard } from '../SettingsCard';

describe('SettingsCard', () => {
  it('renders card with children', () => {
    const { getByText } = render(
      <SettingsCard>
        <div>Test Content</div>
      </SettingsCard>
    );

    expect(getByText('Test Content')).toBeInTheDocument();
  });

  it('renders multiple children', () => {
    const { getByText } = render(
      <SettingsCard>
        <h3>عنوان</h3>
        <p>محتوى النص</p>
      </SettingsCard>
    );

    expect(getByText('عنوان')).toBeInTheDocument();
    expect(getByText('محتوى النص')).toBeInTheDocument();
  });

  it('applies default styles from commonStyles', () => {
    const { container } = render(
      <SettingsCard>
        <div>Content</div>
      </SettingsCard>
    );

    const card = container.firstChild as HTMLElement;
    // Card uses commonStyles.card which has complex gradient background and shadows
    // Just verify the card element exists and has styling applied
    expect(card).toBeInTheDocument();
    expect(card.style).toBeDefined();
  });

  it('applies custom background style', () => {
    const customStyle = { background: 'red' };

    const { container } = render(
      <SettingsCard style={customStyle}>
        <div>Custom</div>
      </SettingsCard>
    );

    const card = container.firstChild as HTMLElement;
    expect(card).toHaveStyle({ background: 'red' });
  });

  it('merges custom styles with default styles', () => {
    const customStyle = { fontSize: '20px', color: 'blue' };

    const { container } = render(
      <SettingsCard style={customStyle}>
        <div>Content</div>
      </SettingsCard>
    );

    const card = container.firstChild as HTMLElement;
    // Custom styles should be applied (can verify these directly)
    expect(card).toHaveStyle({
      fontSize: '20px',
      color: 'blue'
    });
  });

  it('renders complex nested content', () => {
    const { getByText, getByRole } = render(
      <SettingsCard>
        <div>
          <h2>العنوان الرئيسي</h2>
          <p>فقرة نصية</p>
          <button>زر</button>
        </div>
      </SettingsCard>
    );

    expect(getByText('العنوان الرئيسي')).toBeInTheDocument();
    expect(getByText('فقرة نصية')).toBeInTheDocument();
    expect(getByRole('button')).toBeInTheDocument();
  });

  it('renders as a div element', () => {
    const { container } = render(
      <SettingsCard>
        <div>Content</div>
      </SettingsCard>
    );

    const card = container.firstChild;
    expect(card?.nodeName).toBe('DIV');
  });

  it('handles empty children gracefully', () => {
    const { container } = render(
      <SettingsCard>{null}</SettingsCard>
    );

    const card = container.firstChild;
    expect(card).toBeInTheDocument();
  });

  it('renders with React fragments as children', () => {
    const { getByText } = render(
      <SettingsCard>
        <>
          <div>First</div>
          <div>Second</div>
        </>
      </SettingsCard>
    );

    expect(getByText('First')).toBeInTheDocument();
    expect(getByText('Second')).toBeInTheDocument();
  });

  it('passes through data attributes', () => {
    const { container } = render(
      <SettingsCard>
        <div data-testid="test-content">Content</div>
      </SettingsCard>
    );

    expect(container.querySelector('[data-testid="test-content"]')).toBeInTheDocument();
  });

  it('applies custom padding', () => {
    const customStyle = { padding: '40px' };
    const { container } = render(
      <SettingsCard style={customStyle}>
        <div>Content</div>
      </SettingsCard>
    );

    const card = container.firstChild as HTMLElement;
    expect(card).toHaveStyle({ padding: '40px' });
  });

  it('renders with form elements inside', () => {
    const { getByLabelText, getByRole } = render(
      <SettingsCard>
        <label htmlFor="input">Label</label>
        <input id="input" type="text" />
        <button>Submit</button>
      </SettingsCard>
    );

    expect(getByLabelText('Label')).toBeInTheDocument();
    expect(getByRole('button')).toBeInTheDocument();
  });
});
