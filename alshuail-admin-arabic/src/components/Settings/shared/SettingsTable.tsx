/**
 * Reusable Settings Table Component
 * Consistent table styling with RTL support and responsive design
 */

import React from 'react';
import { COLORS, SPACING, TYPOGRAPHY, BORDER_RADIUS } from '../sharedStyles';

export interface SettingsTableColumn<T> {
  key: string;
  label: string;
  render?: (item: T) => React.ReactNode;
  width?: string;
}

interface SettingsTableProps<T> {
  columns: SettingsTableColumn<T>[];
  data: T[];
  keyExtractor: (item: T, index: number) => string;
  emptyMessage?: string;
  style?: React.CSSProperties;
}

export function SettingsTable<T>({
  columns,
  data,
  keyExtractor,
  emptyMessage = 'لا توجد بيانات',
  style
}: SettingsTableProps<T>) {
  const tableStyle: React.CSSProperties = {
    width: '100%',
    borderCollapse: 'collapse' as const,
    ...style
  };

  const thStyle: React.CSSProperties = {
    padding: SPACING.md,
    textAlign: 'right' as const,
    borderBottom: `2px solid ${COLORS.border}`,
    fontSize: TYPOGRAPHY.base,
    fontWeight: TYPOGRAPHY.semibold,
    color: COLORS.gray700,
    background: COLORS.gray50
  };

  const tdStyle: React.CSSProperties = {
    padding: `${SPACING.lg} ${SPACING.md}`,
    borderBottom: `1px solid ${COLORS.border}`,
    fontSize: TYPOGRAPHY.base,
    color: COLORS.gray600
  };

  const emptyStyle: React.CSSProperties = {
    textAlign: 'center',
    padding: SPACING['4xl'],
    fontSize: TYPOGRAPHY.base,
    color: COLORS.gray400
  };

  if (data.length === 0) {
    return (
      <div style={emptyStyle}>
        {emptyMessage}
      </div>
    );
  }

  return (
    <div style={{ overflowX: 'auto' }}>
      <table style={tableStyle}>
        <thead>
          <tr>
            {columns.map((column) => (
              <th
                key={column.key}
                style={{
                  ...thStyle,
                  ...(column.width && { width: column.width })
                }}
              >
                {column.label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {data.map((item, index) => (
            <tr key={keyExtractor(item, index)}>
              {columns.map((column) => (
                <td key={column.key} style={tdStyle}>
                  {column.render
                    ? column.render(item)
                    : (item as any)[column.key]}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
