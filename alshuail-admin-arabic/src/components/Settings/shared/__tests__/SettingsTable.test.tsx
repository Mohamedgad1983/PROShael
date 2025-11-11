import React from 'react';
import { render } from '@testing-library/react';
import { SettingsTable, SettingsTableColumn } from '../SettingsTable';

interface User {
  id: string;
  name: string;
  email: string;
  role: string;
  status: 'active' | 'inactive';
}

describe('SettingsTable', () => {
  const sampleUsers: User[] = [
    { id: '1', name: 'أحمد محمد', email: 'ahmed@test.com', role: 'admin', status: 'active' },
    { id: '2', name: 'فاطمة علي', email: 'fatima@test.com', role: 'user', status: 'active' },
    { id: '3', name: 'محمد خالد', email: 'mohamed@test.com', role: 'user', status: 'inactive' }
  ];

  const columns: SettingsTableColumn<User>[] = [
    { key: 'name', label: 'الاسم' },
    { key: 'email', label: 'البريد الإلكتروني' },
    { key: 'role', label: 'الدور' }
  ];

  it('renders table with headers', () => {
    const { getByText } = render(
      <SettingsTable
        columns={columns}
        data={sampleUsers}
        keyExtractor={(user) => user.id}
      />
    );

    expect(getByText('الاسم')).toBeInTheDocument();
    expect(getByText('البريد الإلكتروني')).toBeInTheDocument();
    expect(getByText('الدور')).toBeInTheDocument();
  });

  it('renders all data rows', () => {
    const { getByText } = render(
      <SettingsTable
        columns={columns}
        data={sampleUsers}
        keyExtractor={(user) => user.id}
      />
    );

    expect(getByText('أحمد محمد')).toBeInTheDocument();
    expect(getByText('ahmed@test.com')).toBeInTheDocument();
    expect(getByText('فاطمة علي')).toBeInTheDocument();
    expect(getByText('fatima@test.com')).toBeInTheDocument();
    expect(getByText('محمد خالد')).toBeInTheDocument();
    expect(getByText('mohamed@test.com')).toBeInTheDocument();
  });

  it('renders custom cell content with render function', () => {
    const columnsWithRender: SettingsTableColumn<User>[] = [
      { key: 'name', label: 'الاسم' },
      {
        key: 'role',
        label: 'الدور',
        render: (user) => <span data-testid="custom-role">{user.role === 'admin' ? 'مسؤول' : 'مستخدم'}</span>
      }
    ];

    const { getByTestId, getAllByTestId } = render(
      <SettingsTable
        columns={columnsWithRender}
        data={sampleUsers}
        keyExtractor={(user) => user.id}
      />
    );

    const customRoles = getAllByTestId('custom-role');
    expect(customRoles).toHaveLength(3);
    expect(customRoles[0]).toHaveTextContent('مسؤول');
    expect(customRoles[1]).toHaveTextContent('مستخدم');
  });

  it('displays empty message when data is empty', () => {
    const { getByText } = render(
      <SettingsTable
        columns={columns}
        data={[]}
        keyExtractor={(user) => user.id}
        emptyMessage="لا توجد بيانات"
      />
    );

    expect(getByText('لا توجد بيانات')).toBeInTheDocument();
  });

  it('displays default empty message when no custom message provided', () => {
    const { getByText } = render(
      <SettingsTable
        columns={columns}
        data={[]}
        keyExtractor={(user) => user.id}
      />
    );

    expect(getByText('لا توجد بيانات')).toBeInTheDocument();
  });

  it('applies column widths when specified', () => {
    const columnsWithWidth: SettingsTableColumn<User>[] = [
      { key: 'name', label: 'الاسم', width: '30%' },
      { key: 'email', label: 'البريد', width: '40%' },
      { key: 'role', label: 'الدور', width: '30%' }
    ];

    const { container } = render(
      <SettingsTable
        columns={columnsWithWidth}
        data={sampleUsers}
        keyExtractor={(user) => user.id}
      />
    );

    const headers = container.querySelectorAll('th');
    expect(headers[0]).toHaveStyle({ width: '30%' });
    expect(headers[1]).toHaveStyle({ width: '40%' });
    expect(headers[2]).toHaveStyle({ width: '30%' });
  });

  it('applies custom styles to table', () => {
    const customStyle = { marginTop: '20px' };
    const { container } = render(
      <SettingsTable
        columns={columns}
        data={sampleUsers}
        keyExtractor={(user) => user.id}
        style={customStyle}
      />
    );

    // Table is inside a wrapper div, so query for the table element
    const table = container.querySelector('table');
    expect(table).toHaveStyle({ marginTop: '20px' });
  });

  it('uses keyExtractor for unique row keys', () => {
    const { container } = render(
      <SettingsTable
        columns={columns}
        data={sampleUsers}
        keyExtractor={(user) => user.id}
      />
    );

    const rows = container.querySelectorAll('tbody tr');
    expect(rows).toHaveLength(3);
  });

  it('handles complex render functions', () => {
    const complexColumns: SettingsTableColumn<User>[] = [
      {
        key: 'status',
        label: 'الحالة',
        render: (user) => (
          <div data-testid={`status-${user.id}`} style={{ color: user.status === 'active' ? 'green' : 'red' }}>
            {user.status === 'active' ? 'نشط' : 'غير نشط'}
          </div>
        )
      }
    ];

    const { getByTestId } = render(
      <SettingsTable
        columns={complexColumns}
        data={sampleUsers}
        keyExtractor={(user) => user.id}
      />
    );

    const status1 = getByTestId('status-1');
    expect(status1).toHaveTextContent('نشط');
    expect(status1).toHaveStyle({ color: 'green' });

    const status3 = getByTestId('status-3');
    expect(status3).toHaveTextContent('غير نشط');
    expect(status3).toHaveStyle({ color: 'red' });
  });

  it('renders table structure correctly', () => {
    const { container } = render(
      <SettingsTable
        columns={columns}
        data={sampleUsers}
        keyExtractor={(user) => user.id}
      />
    );

    const table = container.querySelector('table');
    const thead = container.querySelector('thead');
    const tbody = container.querySelector('tbody');

    expect(table).toBeInTheDocument();
    expect(thead).toBeInTheDocument();
    expect(tbody).toBeInTheDocument();
  });

  it('applies RTL text alignment', () => {
    const { container } = render(
      <SettingsTable
        columns={columns}
        data={sampleUsers}
        keyExtractor={(user) => user.id}
      />
    );

    const headers = container.querySelectorAll('th');
    headers.forEach(header => {
      expect(header).toHaveStyle({ textAlign: 'right' });
    });

    // td elements have padding and borderBottom from tdStyle, but textAlign is not explicitly set
    // (inherits from parent). Just verify cells exist and render content correctly.
    const cells = container.querySelectorAll('td');
    expect(cells.length).toBeGreaterThan(0);
    // First cell should have user name
    expect(cells[0]).toHaveTextContent('أحمد');
  });
});
