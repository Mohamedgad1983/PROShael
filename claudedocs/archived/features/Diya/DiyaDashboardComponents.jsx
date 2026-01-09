// ============================================================================
// DIYA DASHBOARD COMPONENTS - React/Next.js
// ============================================================================
// Add these components to your dashboard
// Place in: src/components/dashboard/DiyaDashboard.jsx
// ============================================================================

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';

// ============================================================================
// 1. DIYA CARD COMPONENT (For Dashboard)
// ============================================================================

const DiyaCard = ({ diyaCase, onClick }) => {
  return (
    <Card 
      className="cursor-pointer hover:shadow-lg transition-shadow"
      onClick={() => onClick(diyaCase)}
    >
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium">
          {diyaCase.title_ar}
        </CardTitle>
        <div className="h-12 w-12 rounded-full bg-orange-100 flex items-center justify-center">
          <svg className="h-6 w-6 text-orange-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-2">
          <div className="text-2xl font-bold">
            {diyaCase.total_collected?.toLocaleString()} ريال
          </div>
          <div className="text-xs text-muted-foreground">
            {diyaCase.total_contributors} مساهم
          </div>
          <div className="flex items-center gap-2">
            <span className={`px-2 py-1 rounded-full text-xs ${
              diyaCase.collection_status === 'completed' 
                ? 'bg-green-100 text-green-800' 
                : 'bg-yellow-100 text-yellow-800'
            }`}>
              {diyaCase.collection_status === 'completed' ? 'مكتمل' : 'جاري التحصيل'}
            </span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};


// ============================================================================
// 2. DIYA DASHBOARD SECTION (3 Cards)
// ============================================================================

export const DiyaDashboard = () => {
  const [diyaCases, setDiyaCases] = useState([]);
  const [selectedDiya, setSelectedDiya] = useState(null);
  const [contributors, setContributors] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);

  // Fetch diya cases on mount
  useEffect(() => {
    fetchDiyaCases();
  }, []);

  const fetchDiyaCases = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/diya/dashboard');
      const data = await response.json();
      setDiyaCases(data);
    } catch (error) {
      console.error('Error fetching diya cases:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleDiyaClick = async (diyaCase) => {
    try {
      setSelectedDiya(diyaCase);
      setModalOpen(true);
      
      // Fetch contributors
      const response = await fetch(`/api/diya/${diyaCase.id}/contributors`);
      const data = await response.json();
      setContributors(data);
    } catch (error) {
      console.error('Error fetching contributors:', error);
    }
  };

  if (loading) {
    return <div className="text-center py-8">جاري التحميل...</div>;
  }

  return (
    <>
      {/* Dashboard Cards Section */}
      <div className="mb-8">
        <h2 className="text-2xl font-bold mb-4">قضايا الدية</h2>
        <div className="grid gap-4 md:grid-cols-3">
          {diyaCases.map((diyaCase) => (
            <DiyaCard 
              key={diyaCase.id} 
              diyaCase={diyaCase}
              onClick={handleDiyaClick}
            />
          ))}
        </div>
      </div>

      {/* Contributors Modal */}
      <Dialog open={modalOpen} onOpenChange={setModalOpen}>
        <DialogContent className="max-w-4xl max-h-[80vh] overflow-auto">
          <DialogHeader>
            <DialogTitle className="text-xl">
              {selectedDiya?.title_ar} - قائمة المساهمين
            </DialogTitle>
          </DialogHeader>
          
          <div className="space-y-4">
            {/* Summary Stats */}
            <div className="grid grid-cols-3 gap-4 p-4 bg-gray-50 rounded-lg">
              <div>
                <div className="text-sm text-gray-600">إجمالي المساهمين</div>
                <div className="text-2xl font-bold">{contributors.length}</div>
              </div>
              <div>
                <div className="text-sm text-gray-600">المبلغ الإجمالي</div>
                <div className="text-2xl font-bold">
                  {contributors.reduce((sum, c) => sum + (c.amount || 0), 0).toLocaleString()} ريال
                </div>
              </div>
              <div>
                <div className="text-sm text-gray-600">متوسط المساهمة</div>
                <div className="text-2xl font-bold">
                  {contributors.length > 0 
                    ? (contributors.reduce((sum, c) => sum + (c.amount || 0), 0) / contributors.length).toFixed(0)
                    : 0
                  } ريال
                </div>
              </div>
            </div>

            {/* Contributors Table */}
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>رقم العضوية</TableHead>
                  <TableHead>الاسم</TableHead>
                  <TableHead>الفخذ</TableHead>
                  <TableHead>المبلغ</TableHead>
                  <TableHead>تاريخ المساهمة</TableHead>
                  <TableHead>الحالة</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {contributors.map((contributor) => (
                  <TableRow key={contributor.member_id}>
                    <TableCell>{contributor.membership_number}</TableCell>
                    <TableCell className="font-medium">{contributor.member_name}</TableCell>
                    <TableCell>{contributor.tribal_section}</TableCell>
                    <TableCell className="font-bold">{contributor.amount?.toLocaleString()} ريال</TableCell>
                    <TableCell>
                      {new Date(contributor.contribution_date).toLocaleDateString('ar-SA')}
                    </TableCell>
                    <TableCell>
                      <span className={`px-2 py-1 rounded-full text-xs ${
                        contributor.status === 'approved' 
                          ? 'bg-green-100 text-green-800' 
                          : 'bg-yellow-100 text-yellow-800'
                      }`}>
                        {contributor.status === 'approved' ? 'معتمد' : 'قيد المراجعة'}
                      </span>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>

            {/* Export Button */}
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => exportToExcel(contributors, selectedDiya)}>
                تصدير Excel
              </Button>
              <Button variant="outline" onClick={() => exportToPDF(contributors, selectedDiya)}>
                تصدير PDF
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
};


// ============================================================================
// 3. EXPORT FUNCTIONS
// ============================================================================

const exportToExcel = (contributors, diyaCase) => {
  // You can use a library like xlsx or sheetjs
  console.log('Exporting to Excel:', contributors);
  
  // Example with fetch to backend
  fetch('/api/diya/export/excel', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ 
      diya_id: diyaCase.id,
      contributors 
    })
  })
  .then(res => res.blob())
  .then(blob => {
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${diyaCase.title_ar}_contributors.xlsx`;
    a.click();
  });
};

const exportToPDF = (contributors, diyaCase) => {
  console.log('Exporting to PDF:', contributors);
  
  // Example with fetch to backend
  fetch('/api/diya/export/pdf', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ 
      diya_id: diyaCase.id,
      contributors 
    })
  })
  .then(res => res.blob())
  .then(blob => {
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${diyaCase.title_ar}_contributors.pdf`;
    a.click();
  });
};


// ============================================================================
// 4. ALTERNATIVE: SIMPLE VERSION (No Modal, Direct Navigation)
// ============================================================================

export const DiyaDashboardSimple = () => {
  const [diyaCases, setDiyaCases] = useState([]);
  const router = useRouter(); // Next.js router

  useEffect(() => {
    fetch('/api/diya/dashboard')
      .then(res => res.json())
      .then(data => setDiyaCases(data));
  }, []);

  return (
    <div className="grid gap-4 md:grid-cols-3">
      {diyaCases.map((diyaCase) => (
        <Card 
          key={diyaCase.id}
          className="cursor-pointer"
          onClick={() => router.push(`/diya/${diyaCase.id}/contributors`)}
        >
          <CardHeader>
            <CardTitle>{diyaCase.title_ar}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">
              {diyaCase.total_collected?.toLocaleString()} ريال
            </div>
            <div className="text-sm text-gray-600">
              {diyaCase.total_contributors} مساهم
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
};


// ============================================================================
// 5. ADD TO YOUR MAIN DASHBOARD
// ============================================================================

// In your Dashboard.jsx or page.tsx:
/*
import { DiyaDashboard } from '@/components/dashboard/DiyaDashboard';

export default function Dashboard() {
  return (
    <div className="p-8">
      <h1>لوحة التحكم</h1>
      
      {/* Other dashboard cards *}
      
      {/* Add Diya Dashboard Section *}
      <DiyaDashboard />
      
      {/* Rest of dashboard *}
    </div>
  );
}
*/


// ============================================================================
// 6. STYLING (Tailwind CSS)
// ============================================================================

// Make sure you have these in your tailwind.config.js:
/*
module.exports = {
  theme: {
    extend: {
      // Add RTL support for Arabic
    }
  },
  plugins: [
    require('@tailwindcss/forms'),
  ]
}
*/


// ============================================================================
// 7. API ROUTE EXAMPLES (Next.js)
// ============================================================================

// pages/api/diya/dashboard.js
/*
import { supabase } from '@/lib/supabase';

export default async function handler(req, res) {
  try {
    const { data, error } = await supabase
      .from('diya_dashboard_stats')
      .select('*')
      .order('created_at');
    
    if (error) throw error;
    
    res.status(200).json(data);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
}
*/

// pages/api/diya/[id]/contributors.js
/*
import { supabase } from '@/lib/supabase';

export default async function handler(req, res) {
  const { id } = req.query;
  
  try {
    const { data, error } = await supabase
      .rpc('get_diya_contributors', { p_activity_id: id });
    
    if (error) throw error;
    
    res.status(200).json(data);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
}
*/
