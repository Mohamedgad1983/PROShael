/* eslint-disable testing-library/no-wait-for-multiple-assertions, testing-library/no-node-access, testing-library/prefer-screen-queries, testing-library/no-container, jest/no-conditional-expect */
import { HomeIcon } from '@heroicons/react/24/outline';
import { fireEvent,render } from '@testing-library/react';
import React from 'react';
import { DesktopNavigation,MobileNavigation,NavigationItem } from '../DashboardNavigation';

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

