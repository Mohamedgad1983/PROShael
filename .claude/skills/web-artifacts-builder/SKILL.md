---
name: web-artifacts-builder
description: Build complex, multi-component web applications using React, Tailwind CSS, and shadcn/ui. Use when creating dashboards, interactive tools, admin panels, or any sophisticated web artifact that needs modern frontend technologies.
---

# Web Artifacts Builder Skill

## Purpose
Create elaborate, multi-component web applications using modern frontend web technologies (React, Tailwind CSS, shadcn/ui).

## Tech Stack

### Core Technologies
- **React 18+** - Component-based UI
- **Tailwind CSS** - Utility-first styling
- **shadcn/ui** - Accessible component library
- **Lucide React** - Icon library
- **Recharts** - Data visualization

### Optional Enhancements
- **Framer Motion** - Animations
- **React Hook Form** - Form handling
- **Zod** - Validation
- **TanStack Query** - Data fetching

## Project Structure

```
src/
├── components/
│   ├── ui/           # shadcn/ui components
│   ├── layout/       # Layout components
│   └── features/     # Feature-specific components
├── hooks/            # Custom React hooks
├── lib/              # Utilities
├── styles/           # Global styles
└── App.tsx           # Main app
```

## Component Templates

### Dashboard Layout
```tsx
import { Sidebar } from '@/components/layout/Sidebar';
import { Header } from '@/components/layout/Header';

export function DashboardLayout({ children }) {
  return (
    <div className="flex h-screen bg-slate-950">
      <Sidebar />
      <div className="flex flex-1 flex-col">
        <Header />
        <main className="flex-1 overflow-auto p-6">
          {children}
        </main>
      </div>
    </div>
  );
}
```

### Stats Card
```tsx
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { TrendingUp, TrendingDown } from 'lucide-react';

interface StatsCardProps {
  title: string;
  value: string | number;
  trend?: number;
  icon?: React.ReactNode;
}

export function StatsCard({ title, value, trend, icon }: StatsCardProps) {
  const isPositive = trend && trend > 0;
  
  return (
    <Card className="bg-slate-900/50 border-slate-800">
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <CardTitle className="text-sm font-medium text-slate-400">
          {title}
        </CardTitle>
        {icon}
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold text-white">{value}</div>
        {trend !== undefined && (
          <div className={`flex items-center text-xs ${isPositive ? 'text-emerald-500' : 'text-red-500'}`}>
            {isPositive ? <TrendingUp className="h-3 w-3 mr-1" /> : <TrendingDown className="h-3 w-3 mr-1" />}
            {Math.abs(trend)}%
          </div>
        )}
      </CardContent>
    </Card>
  );
}
```

### Data Table
```tsx
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';

interface Column<T> {
  key: keyof T;
  header: string;
  render?: (value: T[keyof T], row: T) => React.ReactNode;
}

interface DataTableProps<T> {
  data: T[];
  columns: Column<T>[];
}

export function DataTable<T extends Record<string, any>>({ 
  data, 
  columns 
}: DataTableProps<T>) {
  return (
    <div className="rounded-xl border border-slate-800 overflow-hidden">
      <Table>
        <TableHeader>
          <TableRow className="bg-slate-900/50 hover:bg-slate-900/50">
            {columns.map((col) => (
              <TableHead key={String(col.key)} className="text-slate-400">
                {col.header}
              </TableHead>
            ))}
          </TableRow>
        </TableHeader>
        <TableBody>
          {data.map((row, i) => (
            <TableRow key={i} className="border-slate-800 hover:bg-slate-800/50">
              {columns.map((col) => (
                <TableCell key={String(col.key)} className="text-slate-300">
                  {col.render ? col.render(row[col.key], row) : row[col.key]}
                </TableCell>
              ))}
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
```

### Chart Component
```tsx
import { 
  LineChart, 
  Line, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer 
} from 'recharts';

interface ChartData {
  name: string;
  value: number;
}

export function AreaChart({ data }: { data: ChartData[] }) {
  return (
    <div className="h-[300px] w-full">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={data}>
          <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
          <XAxis dataKey="name" stroke="#94a3b8" fontSize={12} />
          <YAxis stroke="#94a3b8" fontSize={12} />
          <Tooltip 
            contentStyle={{ 
              backgroundColor: '#1e293b', 
              border: '1px solid #334155',
              borderRadius: '8px'
            }} 
          />
          <Line 
            type="monotone" 
            dataKey="value" 
            stroke="#6366f1" 
            strokeWidth={2}
            dot={{ fill: '#6366f1' }}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
```

## Tailwind Configuration

```js
// tailwind.config.js
module.exports = {
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        border: 'hsl(var(--border))',
        background: 'hsl(var(--background))',
        foreground: 'hsl(var(--foreground))',
        primary: {
          DEFAULT: 'hsl(var(--primary))',
          foreground: 'hsl(var(--primary-foreground))',
        },
        // Add more semantic colors
      },
      animation: {
        'fade-in': 'fadeIn 0.5s ease-out',
        'slide-up': 'slideUp 0.5s ease-out',
      },
      keyframes: {
        fadeIn: {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        slideUp: {
          '0%': { opacity: '0', transform: 'translateY(20px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
      },
    },
  },
};
```

## shadcn/ui Setup

```bash
# Initialize shadcn/ui
npx shadcn-ui@latest init

# Add commonly used components
npx shadcn-ui@latest add button card input table dialog dropdown-menu
npx shadcn-ui@latest add avatar badge calendar checkbox command
npx shadcn-ui@latest add form label select separator tabs toast
```

## Best Practices

### Performance
- Use React.memo for expensive components
- Implement virtual scrolling for large lists
- Lazy load routes and heavy components
- Optimize images with next/image or similar

### Accessibility
- Use semantic HTML elements
- Include ARIA labels where needed
- Ensure keyboard navigation works
- Maintain color contrast ratios

### State Management
- Use React Context for global state
- Consider Zustand for complex state
- Keep server state in TanStack Query

## Instructions

1. **Analyze requirements**: What type of app? Dashboard, landing page, tool?
2. **Set up structure**: Create component hierarchy
3. **Build layout first**: Establish the shell (sidebar, header, main)
4. **Add components**: Build reusable UI components
5. **Connect data**: Wire up state and data fetching
6. **Polish**: Add animations, loading states, error handling
7. **Test**: Check responsiveness and accessibility

## Example: Restaurant Dashboard

```tsx
// For a restaurant management dashboard (like OverJar)
function RestaurantDashboard() {
  return (
    <DashboardLayout>
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <StatsCard title="Today's Sales" value="$12,450" trend={12.5} />
        <StatsCard title="Orders" value="234" trend={8.2} />
        <StatsCard title="Customers" value="1,890" trend={-2.4} />
        <StatsCard title="Avg Order" value="$53.20" trend={5.1} />
      </div>
      
      <div className="mt-6 grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Sales Trend</CardTitle>
          </CardHeader>
          <CardContent>
            <AreaChart data={salesData} />
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader>
            <CardTitle>Recent Orders</CardTitle>
          </CardHeader>
          <CardContent>
            <DataTable data={orders} columns={orderColumns} />
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}
```
