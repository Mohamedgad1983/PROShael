import React from 'react';
import { render, fireEvent } from '@testing-library/react';
import { DesktopNavigation, MobileNavigation, NavigationItem } from '../DashboardNavigation';
import { HomeIcon } from '@heroicons/react/24/outline';

describe('DashboardNavigation', () => {
  const items: NavigationItem[] = [
    {
      id: 'dashboard',
      label: '???? ??????',
      icon: HomeIcon
    }
  ];

  it('calls onSelect when desktop item is clicked', () => {
    const handleSelect = jest.fn();

    const { getByRole } = render(
      <DesktopNavigation
        items={items}
        activeSection="members"
        onSelect={handleSelect}
        logoSrc="logo.png"
        title="?????"
        subtitle="Test"
      />
    );

    fireEvent.click(getByRole('button', { name: '???? ??????' }));

    expect(handleSelect).toHaveBeenCalledWith('dashboard', expect.any(Object));
  });

  it('closes mobile navigation when close button is pressed', () => {
    const handleSelect = jest.fn();
    const handleClose = jest.fn();

    const { getByLabelText, getByRole } = render(
      <MobileNavigation
        items={items}
        activeSection="dashboard"
        onSelect={handleSelect}
        logoSrc="logo.png"
        title="?????"
        subtitle="Test"
        sidebarOpen={true}
        onClose={handleClose}
      />
    );

    fireEvent.click(getByRole('button', { name: '???? ??????' }));
    expect(handleSelect).toHaveBeenCalledWith('dashboard', expect.any(Object));
    expect(handleClose).toHaveBeenCalled();

    fireEvent.click(getByLabelText('????? ???????'));
    expect(handleClose).toHaveBeenCalledTimes(2);
  });
});

