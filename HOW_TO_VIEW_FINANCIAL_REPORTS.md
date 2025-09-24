# 📊 How to View the New Financial Reports System

## Quick Start Guide

### 1. Start the Backend Server (if not running)
```bash
cd alshuail-backend
npm start
```
Backend should be running on: http://localhost:3001

### 2. Start the Frontend Application
```bash
cd alshuail-admin-arabic
npm start
```
Frontend will open at: http://localhost:3002

### 3. Access the Financial Reports

1. **Open your browser** and go to: http://localhost:3002
2. **Click on "التقارير" (Reports)** in the sidebar menu
3. You should now see the Financial Reports interface with:
   - 📈 Financial Dashboard
   - 💰 Expense Management
   - 📊 Analytics & Charts

### 4. Features Available

#### In the Financial Reports Section:
- **Dashboard Tab**: Overview of financial metrics
  - Total Revenue
  - Total Expenses
  - Net Income
  - Active Subscriptions

- **Expenses Tab**: Complete expense management
  - Create new expenses
  - View expense list with Hijri dates
  - Approve/reject expenses
  - Filter by status and category

- **Reports Tab**: Visual analytics
  - Expense breakdown charts
  - Monthly trends
  - Top contributors
  - Budget variance

### 5. Key Features to Try

1. **Create an Expense**:
   - Click "إضافة مصروف جديد" button
   - Fill in the Arabic/English form
   - Submit to create expense

2. **Export Reports**:
   - Click "تصدير PDF" for PDF export
   - Click "تصدير Excel" for Excel export
   - Select date range for filtering

3. **View Analytics**:
   - Check the pie chart for expense categories
   - View monthly trends in the line chart
   - See top contributors list

### 6. Role-Based Access

**Important**: The Financial Reports are only visible to users with financial management permissions.

If you don't see the reports, you may need to:
1. Login with a user that has `financial_manager` role
2. Or update your user permissions in the database

### 7. Test User Credentials

If you need to create a test financial manager:
```javascript
// Use this in the console or create via API
{
  email: "finance@alshuail.com",
  password: "Finance@2024",
  role: "financial_manager"
}
```

### 8. Troubleshooting

If you don't see the Financial Reports:

1. **Check Console for Errors**:
   - Press F12 in browser
   - Check Console tab for any errors

2. **Verify Backend Connection**:
   - Ensure backend is running on port 3001
   - Check network tab for API calls

3. **Clear Browser Cache**:
   - Hard refresh: Ctrl+Shift+R (Windows) or Cmd+Shift+R (Mac)

4. **Check Permissions**:
   - Ensure your user has financial permissions
   - Check localStorage for valid token

### 9. What You Should See

When you click on Reports (التقارير), you should see:

1. **Header**: "التقارير المالية" (Financial Reports)
2. **Three Tabs**:
   - لوحة القيادة (Dashboard)
   - إدارة المصروفات (Expense Management)
   - التقارير والتحليلات (Reports & Analytics)
3. **Summary Cards**: Revenue, Expenses, Net Income
4. **Export Buttons**: PDF and Excel
5. **Charts and Graphs**: Visual representations

### 10. API Endpoints Being Used

The frontend connects to these backend endpoints:
- `GET /api/reports/financial-summary` - Financial overview
- `GET /api/expenses` - List expenses
- `POST /api/expenses` - Create expense
- `PUT /api/expenses/:id/approval` - Approve/reject
- `GET /api/reports/forensic` - Forensic analysis

---

## 🎉 The Financial Reports System is Ready!

The Reports button now shows a complete financial management interface with:
- ✅ Arabic-first design with RTL support
- ✅ Hijri calendar integration
- ✅ Expense management workflow
- ✅ Visual analytics and charts
- ✅ PDF/Excel export functionality
- ✅ Role-based access control

Enjoy your new Financial Reports system! 🚀