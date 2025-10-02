// ============================================================================
// COMPLETE DIYA PAGE COMPONENT WITH REAL DYNAMIC DATA
// ============================================================================
// Place this in: app/diya/page.jsx (App Router)
//           or: pages/diya/index.jsx (Pages Router)
// ============================================================================

'use client'; // Add this if using Next.js App Router

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Input } from '@/components/ui/input';
import { 
  Search, 
  Download, 
  FileText, 
  Users, 
  DollarSign, 
  CheckCircle, 
  Clock,
  Filter
} from 'lucide-react';

export default function DiyaPage() {
  // State management
  const [diyaCases, setDiyaCases] = useState([]);
  const [selectedDiya, setSelectedDiya] = useState(null);
  const [contributors, setContributors] = useState([]);
  const [filteredContributors, setFilteredContributors] = useState([]);
  const [loading, setLoading] = useState(true);
  const [contributorsLoading, setContributorsLoading] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [activeTab, setActiveTab] = useState('overview');
  const [searchTerm, setSearchTerm] = useState('');
  const [tribalFilter, setTribalFilter] = useState('all');

  // Fetch all diya cases on component mount
  useEffect(() => {
    fetchDiyaCases();
  }, []);

  // Filter contributors based on search and tribal section
  useEffect(() => {
    if (!contributors.length) return;

    let filtered = [...contributors];

    // Apply search filter
    if (searchTerm) {
      filtered = filtered.filter(c =>
        c.member_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        c.membership_number.includes(searchTerm) ||
        c.tribal_section.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    // Apply tribal section filter
    if (tribalFilter !== 'all') {
      filtered = filtered.filter(c => c.tribal_section === tribalFilter);
    }

    setFilteredContributors(filtered);
  }, [searchTerm, tribalFilter, contributors]);

  // Fetch all diya cases with real data
  const fetchDiyaCases = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/diya/dashboard');
      
      if (!response.ok) {
        throw new Error('Failed to fetch diya cases');
      }
      
      const data = await response.json();
      setDiyaCases(data);
    } catch (error) {
      console.error('Error fetching diya cases:', error);
      alert('فشل في تحميل قضايا الدية. يرجى المحاولة مرة أخرى.');
    } finally {
      setLoading(false);
    }
  };

  // Fetch contributors for specific diya case
  const handleDiyaClick = async (diyaCase) => {
    try {
      setSelectedDiya(diyaCase);
      setModalOpen(true);
      setContributorsLoading(true);
      setSearchTerm('');
      setTribalFilter('all');
      
      // Fetch ONLY contributors for THIS specific diya
      const response = await fetch(`/api/diya/${diyaCase.id}/contributors`);
      
      if (!response.ok) {
        throw new Error('Failed to fetch contributors');
      }
      
      const data = await response.json();
      
      // Check if response has contributors array or is direct array
      const contributorsList = data.contributors || data;
      setContributors(contributorsList);
      setFilteredContributors(contributorsList);
    } catch (error) {
      console.error('Error fetching contributors:', error);
      alert('فشل في تحميل المساهمين. يرجى المحاولة مرة أخرى.');
    } finally {
      setContributorsLoading(false);
    }
  };

  // Export to Excel
  const exportToExcel = () => {
    if (!filteredContributors.length) return;

    // Create CSV content
    const headers = ['رقم العضوية', 'الاسم', 'الفخذ', 'المبلغ', 'تاريخ المساهمة', 'الحالة'];
    const rows = filteredContributors.map(c => [
      c.membership_number,
      c.member_name,
      c.tribal_section,
      c.amount,
      new Date(c.contribution_date).toLocaleDateString('ar-SA'),
      c.status === 'approved' ? 'معتمد' : 'قيد المراجعة'
    ]);

    const csvContent = [
      headers.join(','),
      ...rows.map(row => row.join(','))
    ].join('\n');

    // Create blob and download
    const blob = new Blob(['\ufeff' + csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `${selectedDiya?.title_ar}_contributors_${new Date().toISOString().split('T')[0]}.csv`;
    link.click();
  };

  // Calculate summary statistics
  const totalContributors = diyaCases.reduce((sum, d) => sum + (d.total_contributors || 0), 0);
  const totalCollected = diyaCases.reduce((sum, d) => sum + (d.total_collected || 0), 0);
  const activeCases = diyaCases.filter(d => d.collection_status === 'ongoing').length;
  const completedCases = diyaCases.filter(d => d.collection_status === 'completed').length;

  // Get unique tribal sections for filter
  const tribalSections = [...new Set(contributors.map(c => c.tribal_section))].filter(Boolean);

  // Loading state
  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-b-4 border-orange-600 mx-auto mb-4"></div>
          <p className="text-gray-600 text-lg">جاري تحميل بيانات الدية...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 max-w-7xl" dir="rtl">
      {/* Page Header */}
      <div className="mb-8">
        <h1 className="text-4xl font-bold text-gray-900 mb-2">إدارة الديات</h1>
        <p className="text-gray-600 text-lg">إدارة ومتابعة قضايا الدية والمساهمات المالية</p>
      </div>

      {/* Summary Stats Cards */}
      <div className="grid gap-6 md:grid-cols-4 mb-8">
        <Card className="hover:shadow-lg transition-shadow">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">إجمالي القضايا</CardTitle>
            <div className="h-10 w-10 rounded-full bg-blue-100 flex items-center justify-center">
              <FileText className="h-5 w-5 text-blue-600" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{diyaCases.length}</div>
            <p className="text-xs text-gray-500 mt-1">قضية دية مسجلة</p>
          </CardContent>
        </Card>

        <Card className="hover:shadow-lg transition-shadow">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">قضايا مكتملة</CardTitle>
            <div className="h-10 w-10 rounded-full bg-green-100 flex items-center justify-center">
              <CheckCircle className="h-5 w-5 text-green-600" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-green-600">{completedCases}</div>
            <p className="text-xs text-gray-500 mt-1">من أصل {diyaCases.length}</p>
          </CardContent>
        </Card>

        <Card className="hover:shadow-lg transition-shadow">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">قضايا نشطة</CardTitle>
            <div className="h-10 w-10 rounded-full bg-yellow-100 flex items-center justify-center">
              <Clock className="h-5 w-5 text-yellow-600" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-yellow-600">{activeCases}</div>
            <p className="text-xs text-gray-500 mt-1">يتم التحصيل حالياً</p>
          </CardContent>
        </Card>

        <Card className="hover:shadow-lg transition-shadow">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">المبلغ الإجمالي</CardTitle>
            <div className="h-10 w-10 rounded-full bg-orange-100 flex items-center justify-center">
              <DollarSign className="h-5 w-5 text-orange-600" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-orange-600">
              {totalCollected.toLocaleString()}
            </div>
            <p className="text-xs text-gray-500 mt-1">ريال سعودي</p>
          </CardContent>
        </Card>
      </div>

      {/* Tabs Section */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-3 mb-6">
          <TabsTrigger value="overview">نظرة عامة</TabsTrigger>
          <TabsTrigger value="cases">قضايا الدية</TabsTrigger>
          <TabsTrigger value="reports">التقارير</TabsTrigger>
        </TabsList>

        {/* Overview Tab */}
        <TabsContent value="overview" className="space-y-6">
          <div className="grid gap-6 md:grid-cols-3">
            {diyaCases.map((diyaCase) => (
              <Card 
                key={diyaCase.id}
                className="cursor-pointer hover:shadow-xl transition-all duration-300 hover:-translate-y-2 border-2 hover:border-orange-300"
                onClick={() => handleDiyaClick(diyaCase)}
              >
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
                  <CardTitle className="text-xl font-bold text-gray-900">
                    {diyaCase.title_ar}
                  </CardTitle>
                  <div className="h-14 w-14 rounded-full bg-gradient-to-br from-orange-400 to-orange-600 flex items-center justify-center shadow-lg">
                    <DollarSign className="h-7 w-7 text-white" />
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {/* Amount */}
                    <div>
                      <div className="text-4xl font-bold text-orange-600">
                        {diyaCase.total_collected?.toLocaleString() || 0} ريال
                      </div>
                      <div className="text-sm text-gray-600 mt-1">المبلغ المحصل</div>
                    </div>
                    
                    {/* Progress Bar */}
                    <div>
                      <div className="flex justify-between text-sm mb-2">
                        <span className="text-gray-600">التقدم</span>
                        <span className="font-bold text-orange-600">
                          {diyaCase.collection_percentage?.toFixed(0) || 0}%
                        </span>
                      </div>
                      <div className="w-full bg-gray-200 rounded-full h-3 overflow-hidden">
                        <div 
                          className="bg-gradient-to-r from-orange-500 to-orange-600 h-3 rounded-full transition-all duration-500"
                          style={{ width: `${Math.min(100, diyaCase.collection_percentage || 0)}%` }}
                        />
                      </div>
                    </div>

                    {/* Contributors */}
                    <div className="flex items-center justify-between pt-3 border-t">
                      <div className="flex items-center gap-2">
                        <Users className="h-5 w-5 text-gray-600" />
                        <span className="text-gray-600">عدد المساهمين:</span>
                      </div>
                      <span className="text-xl font-bold">{diyaCase.total_contributors || 0}</span>
                    </div>

                    {/* Status Badge */}
                    <div className="flex items-center gap-2 pt-2">
                      <span className={`flex-1 px-4 py-2 rounded-lg text-sm font-medium text-center ${
                        diyaCase.collection_status === 'completed' 
                          ? 'bg-green-100 text-green-800' 
                          : 'bg-yellow-100 text-yellow-800'
                      }`}>
                        {diyaCase.collection_status === 'completed' ? '✅ مكتملة' : '⏳ جاري التحصيل'}
                      </span>
                    </div>

                    {/* View Details Button */}
                    <button className="w-full mt-3 text-sm text-orange-600 hover:text-orange-700 font-medium flex items-center justify-center gap-2 py-2 border border-orange-200 rounded-lg hover:bg-orange-50 transition-colors">
                      <span>عرض التفاصيل والمساهمين</span>
                      <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                      </svg>
                    </button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        {/* Cases Tab */}
        <TabsContent value="cases" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-2xl">جميع قضايا الدية</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-gray-50">
                      <TableHead className="font-bold">اسم القضية</TableHead>
                      <TableHead className="font-bold">المستفيد</TableHead>
                      <TableHead className="font-bold">عدد المساهمين</TableHead>
                      <TableHead className="font-bold">المبلغ المحصل</TableHead>
                      <TableHead className="font-bold">متوسط المساهمة</TableHead>
                      <TableHead className="font-bold">الحالة</TableHead>
                      <TableHead className="font-bold">الإجراءات</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {diyaCases.map((diyaCase) => (
                      <TableRow key={diyaCase.id} className="hover:bg-gray-50">
                        <TableCell className="font-medium">{diyaCase.title_ar}</TableCell>
                        <TableCell>{diyaCase.beneficiary_name_ar || 'غير محدد'}</TableCell>
                        <TableCell className="text-center">{diyaCase.total_contributors || 0}</TableCell>
                        <TableCell className="font-bold text-orange-600">
                          {diyaCase.total_collected?.toLocaleString() || 0} ريال
                        </TableCell>
                        <TableCell>
                          {diyaCase.average_contribution?.toFixed(0) || 0} ريال
                        </TableCell>
                        <TableCell>
                          <span className={`px-3 py-1 rounded-full text-xs font-medium ${
                            diyaCase.collection_status === 'completed' 
                              ? 'bg-green-100 text-green-800' 
                              : 'bg-yellow-100 text-yellow-800'
                          }`}>
                            {diyaCase.collection_status === 'completed' ? 'مكتملة' : 'نشطة'}
                          </span>
                        </TableCell>
                        <TableCell>
                          <Button 
                            variant="outline" 
                            size="sm"
                            onClick={() => handleDiyaClick(diyaCase)}
                            className="hover:bg-orange-50 hover:text-orange-600"
                          >
                            عرض التفاصيل
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Reports Tab */}
        <TabsContent value="reports" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-2xl">التقارير والإحصائيات</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-6">
                <div className="grid gap-6 md:grid-cols-2">
                  <div className="p-6 border-2 rounded-lg bg-gradient-to-br from-orange-50 to-orange-100">
                    <h3 className="font-bold text-lg mb-2 text-gray-900">إجمالي المساهمين</h3>
                    <p className="text-5xl font-bold text-orange-600 mb-2">{totalContributors}</p>
                    <p className="text-sm text-gray-600">عضو ساهم في الديات</p>
                  </div>
                  
                  <div className="p-6 border-2 rounded-lg bg-gradient-to-br from-green-50 to-green-100">
                    <h3 className="font-bold text-lg mb-2 text-gray-900">متوسط المساهمة</h3>
                    <p className="text-5xl font-bold text-green-600 mb-2">
                      {totalContributors > 0 ? (totalCollected / totalContributors).toFixed(0) : 0}
                    </p>
                    <p className="text-sm text-gray-600">ريال للعضو الواحد</p>
                  </div>
                </div>

                <div className="flex gap-3">
                  <Button 
                    variant="outline" 
                    className="flex items-center gap-2 hover:bg-orange-50"
                    onClick={exportToExcel}
                  >
                    <Download className="h-4 w-4" />
                    تصدير تقرير شامل (Excel)
                  </Button>
                  <Button 
                    variant="outline" 
                    className="flex items-center gap-2 hover:bg-orange-50"
                  >
                    <FileText className="h-4 w-4" />
                    تصدير PDF
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Contributors Modal - Filtered by Selected Diya */}
      <Dialog open={modalOpen} onOpenChange={setModalOpen}>
        <DialogContent className="max-w-6xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-2xl font-bold text-gray-900">
              {selectedDiya?.title_ar} - قائمة المساهمين
            </DialogTitle>
          </DialogHeader>
          
          {contributorsLoading ? (
            <div className="flex items-center justify-center py-12">
              <div className="text-center">
                <div className="animate-spin rounded-full h-12 w-12 border-b-4 border-orange-600 mx-auto mb-4"></div>
                <p className="text-gray-600">جاري تحميل المساهمين...</p>
              </div>
            </div>
          ) : (
            <div className="space-y-6">
              {/* Summary Stats */}
              <div className="grid grid-cols-3 gap-4 p-6 bg-gradient-to-r from-orange-50 via-orange-100 to-orange-50 rounded-xl shadow-inner">
                <div className="text-center">
                  <div className="text-sm text-gray-600 mb-2">إجمالي المساهمين</div>
                  <div className="text-4xl font-bold text-orange-600">{filteredContributors.length}</div>
                </div>
                <div className="text-center border-x border-orange-200">
                  <div className="text-sm text-gray-600 mb-2">المبلغ الإجمالي</div>
                  <div className="text-4xl font-bold text-orange-600">
                    {filteredContributors.reduce((sum, c) => sum + (c.amount || 0), 0).toLocaleString()}
                  </div>
                  <div className="text-xs text-gray-500">ريال</div>
                </div>
                <div className="text-center">
                  <div className="text-sm text-gray-600 mb-2">متوسط المساهمة</div>
                  <div className="text-4xl font-bold text-orange-600">
                    {filteredContributors.length > 0 
                      ? (filteredContributors.reduce((sum, c) => sum + (c.amount || 0), 0) / filteredContributors.length).toFixed(0)
                      : 0
                    }
                  </div>
                  <div className="text-xs text-gray-500">ريال</div>
                </div>
              </div>

              {/* Search and Filter */}
              <div className="flex gap-4">
                <div className="flex-1 relative">
                  <Search className="absolute right-3 top-3 h-5 w-5 text-gray-400" />
                  <Input
                    placeholder="ابحث بالاسم أو رقم العضوية أو الفخذ..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pr-10"
                  />
                </div>
                <div className="w-48">
                  <select
                    value={tribalFilter}
                    onChange={(e) => setTribalFilter(e.target.value)}
                    className="w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500"
                  >
                    <option value="all">كل الأفخاذ</option>
                    {tribalSections.map(section => (
                      <option key={section} value={section}>{section}</option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Contributors Table */}
              <div className="border-2 rounded-xl overflow-hidden">
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow className="bg-gray-100">
                        <TableHead className="font-bold text-gray-900">رقم العضوية</TableHead>
                        <TableHead className="font-bold text-gray-900">الاسم</TableHead>
                        <TableHead className="font-bold text-gray-900">الفخذ</TableHead>
                        <TableHead className="font-bold text-gray-900">المبلغ</TableHead>
                        <TableHead className="font-bold text-gray-900">تاريخ المساهمة</TableHead>
                        <TableHead className="font-bold text-gray-900">الحالة</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredContributors.length > 0 ? (
                        filteredContributors.map((contributor, index) => (
                          <TableRow 
                            key={contributor.id} 
                            className={`${index % 2 === 0 ? 'bg-white' : 'bg-gray-50'} hover:bg-orange-50`}
                          >
                            <TableCell className="font-medium">{contributor.membership_number}</TableCell>
                            <TableCell className="font-medium">{contributor.member_name}</TableCell>
                            <TableCell>{contributor.tribal_section}</TableCell>
                            <TableCell className="font-bold text-orange-600">
                              {contributor.amount?.toLocaleString()} ريال
                            </TableCell>
                            <TableCell>
                              {new Date(contributor.contribution_date).toLocaleDateString('ar-SA')}
                            </TableCell>
                            <TableCell>
                              <span className={`px-3 py-1 rounded-full text-xs font-medium ${
                                contributor.status === 'approved' 
                                  ? 'bg-green-100 text-green-800' 
                                  : 'bg-yellow-100 text-yellow-800'
                              }`}>
                                {contributor.status === 'approved' ? 'معتمد' : 'قيد المراجعة'}
                              </span>
                            </TableCell>
                          </TableRow>
                        ))
                      ) : (
                        <TableRow>
                          <TableCell colSpan={6} className="text-center py-8 text-gray-500">
                            لا توجد نتائج مطابقة للبحث
                          </TableCell>
                        </TableRow>
                      )}
                    </TableBody>
                  </Table>
                </div>
              </div>

              {/* Export Buttons */}
              <div className="flex justify-between items-center pt-4 border-t-2">
                <div className="text-sm text-gray-600">
                  عرض {filteredContributors.length} من {contributors.length} مساهم
                </div>
                <div className="flex gap-3">
                  <Button 
                    variant="outline"
                    onClick={exportToExcel}
                    className="flex items-center gap-2 hover:bg-orange-50"
                  >
                    <Download className="h-4 w-4" />
                    تصدير Excel
                  </Button>
                  <Button 
                    variant="outline"
                    className="flex items-center gap-2 hover:bg-orange-50"
                  >
                    <FileText className="h-4 w-4" />
                    تصدير PDF
                  </Button>
                  <Button 
                    onClick={() => setModalOpen(false)}
                    className="bg-orange-600 hover:bg-orange-700 text-white"
                  >
                    إغلاق
                  </Button>
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
