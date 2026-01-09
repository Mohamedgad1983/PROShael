---
name: dashboard-builder
description: Build professional admin dashboards and management panels with charts, tables, stats cards, and navigation. Use when creating admin panels, analytics dashboards, CRM interfaces, or any data-driven management UI.
---

# Dashboard Builder Skill

## Purpose
Create professional admin dashboards and management panels with comprehensive data visualization, user management, and operational controls.

## Dashboard Architecture

### Layout Structure
```tsx
function DashboardLayout({ children }) {
  const [sidebarOpen, setSidebarOpen] = useState(true);
  
  return (
    <div className="flex h-screen bg-slate-950">
      {/* Sidebar */}
      <Sidebar isOpen={sidebarOpen} />
      
      {/* Main Content */}
      <div className="flex flex-1 flex-col overflow-hidden">
        {/* Header */}
        <Header onMenuClick={() => setSidebarOpen(!sidebarOpen)} />
        
        {/* Page Content */}
        <main className="flex-1 overflow-auto p-6">
          {children}
        </main>
      </div>
    </div>
  );
}
```

### Sidebar Component
```tsx
function Sidebar({ isOpen }) {
  const navItems = [
    { icon: LayoutDashboard, label: 'Dashboard', href: '/' },
    { icon: ShoppingCart, label: 'Orders', href: '/orders', badge: 12 },
    { icon: Users, label: 'Customers', href: '/customers' },
    { icon: Package, label: 'Products', href: '/products' },
    { icon: Store, label: 'Branches', href: '/branches' },
    { icon: BarChart3, label: 'Analytics', href: '/analytics' },
    { icon: Receipt, label: 'Invoices', href: '/invoices' },
    { icon: Settings, label: 'Settings', href: '/settings' },
  ];

  return (
    <aside className={`
      ${isOpen ? 'w-64' : 'w-20'} 
      bg-slate-900 border-r border-slate-800 
      transition-all duration-300
    `}>
      {/* Logo */}
      <div className="flex items-center gap-3 px-6 py-5 border-b border-slate-800">
        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center">
          <Utensils className="w-5 h-5 text-white" />
        </div>
        {isOpen && (
          <span className="text-lg font-semibold text-white">RestaurantOS</span>
        )}
      </div>
      
      {/* Navigation */}
      <nav className="p-4 space-y-1">
        {navItems.map((item) => (
          <NavItem key={item.href} {...item} collapsed={!isOpen} />
        ))}
      </nav>
      
      {/* User Profile */}
      <div className="absolute bottom-0 left-0 right-0 p-4 border-t border-slate-800">
        <UserProfile collapsed={!isOpen} />
      </div>
    </aside>
  );
}
```

### Header Component
```tsx
function Header({ onMenuClick }) {
  return (
    <header className="h-16 bg-slate-900/50 border-b border-slate-800 px-6 flex items-center justify-between backdrop-blur-xl">
      {/* Left: Menu & Search */}
      <div className="flex items-center gap-4">
        <button 
          onClick={onMenuClick}
          className="p-2 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg"
        >
          <Menu className="w-5 h-5" />
        </button>
        
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
          <input 
            type="text"
            placeholder="Search..."
            className="w-80 pl-10 pr-4 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white placeholder:text-slate-500 focus:border-blue-500 focus:outline-none"
          />
        </div>
      </div>
      
      {/* Right: Actions */}
      <div className="flex items-center gap-3">
        <button className="relative p-2 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg">
          <Bell className="w-5 h-5" />
          <span className="absolute top-1 right-1 w-2 h-2 bg-red-500 rounded-full" />
        </button>
        
        <button className="p-2 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg">
          <Settings className="w-5 h-5" />
        </button>
        
        <div className="w-px h-6 bg-slate-700 mx-2" />
        
        <Avatar src="/avatar.jpg" fallback="MO" />
      </div>
    </header>
  );
}
```

## Stats Cards

### Basic Stats Card
```tsx
interface StatsCardProps {
  title: string;
  value: string | number;
  change?: number;
  changeLabel?: string;
  icon: React.ReactNode;
  iconColor?: string;
}

function StatsCard({ title, value, change, changeLabel, icon, iconColor = 'blue' }) {
  const colors = {
    blue: 'from-blue-500/20 to-blue-600/20 text-blue-500',
    green: 'from-emerald-500/20 to-emerald-600/20 text-emerald-500',
    purple: 'from-purple-500/20 to-purple-600/20 text-purple-500',
    orange: 'from-orange-500/20 to-orange-600/20 text-orange-500',
  };

  return (
    <div className="bg-slate-900/50 rounded-2xl border border-slate-800 p-6 hover:border-slate-700 transition-colors">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-sm text-slate-400">{title}</p>
          <p className="text-3xl font-bold text-white mt-2">{value}</p>
          
          {change !== undefined && (
            <div className="flex items-center gap-1.5 mt-2">
              {change >= 0 ? (
                <TrendingUp className="w-4 h-4 text-emerald-500" />
              ) : (
                <TrendingDown className="w-4 h-4 text-red-500" />
              )}
              <span className={change >= 0 ? 'text-emerald-500' : 'text-red-500'}>
                {Math.abs(change)}%
              </span>
              <span className="text-slate-500 text-sm">{changeLabel}</span>
            </div>
          )}
        </div>
        
        <div className={`p-3 rounded-xl bg-gradient-to-br ${colors[iconColor]}`}>
          {icon}
        </div>
      </div>
    </div>
  );
}
```

### Stats Grid
```tsx
function StatsGrid() {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
      <StatsCard
        title="Today's Revenue"
        value="$12,450"
        change={12.5}
        changeLabel="vs yesterday"
        icon={<DollarSign className="w-6 h-6" />}
        iconColor="green"
      />
      <StatsCard
        title="Total Orders"
        value="234"
        change={8.2}
        changeLabel="vs yesterday"
        icon={<ShoppingCart className="w-6 h-6" />}
        iconColor="blue"
      />
      <StatsCard
        title="Active Customers"
        value="1,890"
        change={-2.4}
        changeLabel="vs last week"
        icon={<Users className="w-6 h-6" />}
        iconColor="purple"
      />
      <StatsCard
        title="Avg Order Value"
        value="$53.20"
        change={5.1}
        changeLabel="vs last month"
        icon={<TrendingUp className="w-6 h-6" />}
        iconColor="orange"
      />
    </div>
  );
}
```

## Charts

### Revenue Chart
```tsx
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

function RevenueChart({ data }) {
  return (
    <div className="bg-slate-900/50 rounded-2xl border border-slate-800 p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h3 className="text-lg font-semibold text-white">Revenue Overview</h3>
          <p className="text-sm text-slate-400">Daily revenue for the current month</p>
        </div>
        <select className="bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white">
          <option>Last 7 days</option>
          <option>Last 30 days</option>
          <option>Last 90 days</option>
        </select>
      </div>
      
      <div className="h-[300px]">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={data}>
            <defs>
              <linearGradient id="colorRevenue" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#6366f1" stopOpacity={0.3}/>
                <stop offset="95%" stopColor="#6366f1" stopOpacity={0}/>
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="#334155" vertical={false} />
            <XAxis dataKey="date" stroke="#94a3b8" fontSize={12} tickLine={false} />
            <YAxis stroke="#94a3b8" fontSize={12} tickLine={false} axisLine={false} />
            <Tooltip
              contentStyle={{
                backgroundColor: '#1e293b',
                border: '1px solid #334155',
                borderRadius: '8px',
              }}
            />
            <Area
              type="monotone"
              dataKey="revenue"
              stroke="#6366f1"
              strokeWidth={2}
              fillOpacity={1}
              fill="url(#colorRevenue)"
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
```

## Data Tables

### Advanced Table
```tsx
function OrdersTable({ orders }) {
  return (
    <div className="bg-slate-900/50 rounded-2xl border border-slate-800 overflow-hidden">
      {/* Table Header */}
      <div className="px-6 py-4 border-b border-slate-800 flex items-center justify-between">
        <h3 className="text-lg font-semibold text-white">Recent Orders</h3>
        <div className="flex items-center gap-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
            <input 
              type="text"
              placeholder="Search orders..."
              className="pl-10 pr-4 py-2 bg-slate-800 border border-slate-700 rounded-lg text-sm text-white"
            />
          </div>
          <button className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-medium">
            <Plus className="w-4 h-4" />
            New Order
          </button>
        </div>
      </div>
      
      {/* Table */}
      <table className="w-full">
        <thead>
          <tr className="bg-slate-800/50">
            <th className="text-left px-6 py-3 text-xs font-medium text-slate-400 uppercase tracking-wider">
              Order ID
            </th>
            <th className="text-left px-6 py-3 text-xs font-medium text-slate-400 uppercase tracking-wider">
              Customer
            </th>
            <th className="text-left px-6 py-3 text-xs font-medium text-slate-400 uppercase tracking-wider">
              Items
            </th>
            <th className="text-left px-6 py-3 text-xs font-medium text-slate-400 uppercase tracking-wider">
              Total
            </th>
            <th className="text-left px-6 py-3 text-xs font-medium text-slate-400 uppercase tracking-wider">
              Status
            </th>
            <th className="text-left px-6 py-3 text-xs font-medium text-slate-400 uppercase tracking-wider">
              Date
            </th>
            <th className="text-right px-6 py-3 text-xs font-medium text-slate-400 uppercase tracking-wider">
              Actions
            </th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-800">
          {orders.map((order) => (
            <tr key={order.id} className="hover:bg-slate-800/30 transition-colors">
              <td className="px-6 py-4">
                <span className="font-mono text-sm text-white">#{order.id}</span>
              </td>
              <td className="px-6 py-4">
                <div className="flex items-center gap-3">
                  <Avatar src={order.customer.avatar} fallback={order.customer.name[0]} size="sm" />
                  <div>
                    <p className="text-sm font-medium text-white">{order.customer.name}</p>
                    <p className="text-xs text-slate-400">{order.customer.email}</p>
                  </div>
                </div>
              </td>
              <td className="px-6 py-4 text-sm text-slate-300">
                {order.items} items
              </td>
              <td className="px-6 py-4 text-sm font-medium text-white">
                ${order.total.toFixed(2)}
              </td>
              <td className="px-6 py-4">
                <OrderStatus status={order.status} />
              </td>
              <td className="px-6 py-4 text-sm text-slate-400">
                {order.date}
              </td>
              <td className="px-6 py-4 text-right">
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <button className="p-2 hover:bg-slate-800 rounded-lg">
                      <MoreHorizontal className="w-4 h-4 text-slate-400" />
                    </button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent>
                    <DropdownMenuItem>View Details</DropdownMenuItem>
                    <DropdownMenuItem>Edit Order</DropdownMenuItem>
                    <DropdownMenuItem className="text-red-500">Cancel Order</DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      
      {/* Pagination */}
      <div className="px-6 py-4 border-t border-slate-800 flex items-center justify-between">
        <p className="text-sm text-slate-400">
          Showing 1 to 10 of 97 results
        </p>
        <div className="flex items-center gap-2">
          <button className="px-3 py-1.5 text-sm bg-slate-800 text-white rounded-lg hover:bg-slate-700">
            Previous
          </button>
          <button className="px-3 py-1.5 text-sm bg-blue-600 text-white rounded-lg">
            1
          </button>
          <button className="px-3 py-1.5 text-sm bg-slate-800 text-white rounded-lg hover:bg-slate-700">
            2
          </button>
          <button className="px-3 py-1.5 text-sm bg-slate-800 text-white rounded-lg hover:bg-slate-700">
            3
          </button>
          <button className="px-3 py-1.5 text-sm bg-slate-800 text-white rounded-lg hover:bg-slate-700">
            Next
          </button>
        </div>
      </div>
    </div>
  );
}
```

## Restaurant-Specific Components

### Live Orders Widget
```tsx
function LiveOrdersWidget() {
  return (
    <div className="bg-slate-900/50 rounded-2xl border border-slate-800 p-6">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-white">Live Orders</h3>
        <span className="flex items-center gap-2 text-sm text-emerald-500">
          <span className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse" />
          12 active
        </span>
      </div>
      
      <div className="space-y-3">
        {liveOrders.map((order) => (
          <div key={order.id} className="flex items-center gap-4 p-3 bg-slate-800/50 rounded-xl">
            <div className={`w-2 h-full rounded-full ${
              order.status === 'preparing' ? 'bg-yellow-500' :
              order.status === 'ready' ? 'bg-emerald-500' :
              'bg-blue-500'
            }`} />
            <div className="flex-1">
              <div className="flex items-center justify-between">
                <span className="font-mono text-sm text-white">#{order.id}</span>
                <span className="text-xs text-slate-400">{order.time}</span>
              </div>
              <p className="text-sm text-slate-400 mt-1">{order.items}</p>
            </div>
            <OrderStatus status={order.status} size="sm" />
          </div>
        ))}
      </div>
    </div>
  );
}
```

### Branch Performance
```tsx
function BranchPerformance() {
  const branches = [
    { name: 'Downtown', revenue: 45000, orders: 320, rating: 4.8 },
    { name: 'Mall Location', revenue: 38000, orders: 280, rating: 4.6 },
    { name: 'Airport', revenue: 52000, orders: 410, rating: 4.9 },
    { name: 'Business District', revenue: 41000, orders: 295, rating: 4.7 },
  ];

  return (
    <div className="bg-slate-900/50 rounded-2xl border border-slate-800 p-6">
      <h3 className="text-lg font-semibold text-white mb-4">Branch Performance</h3>
      
      <div className="space-y-4">
        {branches.map((branch, i) => (
          <div key={branch.name} className="flex items-center gap-4">
            <div className="w-8 h-8 rounded-lg bg-slate-800 flex items-center justify-center text-sm font-medium text-white">
              {i + 1}
            </div>
            <div className="flex-1">
              <div className="flex items-center justify-between">
                <span className="font-medium text-white">{branch.name}</span>
                <span className="text-sm text-slate-400">${branch.revenue.toLocaleString()}</span>
              </div>
              <div className="flex items-center gap-4 mt-1">
                <span className="text-xs text-slate-500">{branch.orders} orders</span>
                <span className="flex items-center gap-1 text-xs text-yellow-500">
                  <Star className="w-3 h-3 fill-current" />
                  {branch.rating}
                </span>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
```

## Instructions

1. **Define layout**: Choose sidebar position and header style
2. **Build navigation**: Create clear information architecture
3. **Add stats cards**: Show key metrics at a glance
4. **Include charts**: Visualize trends and patterns
5. **Create data tables**: Display detailed information with actions
6. **Add real-time widgets**: Show live data where applicable
7. **Implement filters**: Allow data slicing and searching
8. **Test responsiveness**: Ensure mobile/tablet compatibility
