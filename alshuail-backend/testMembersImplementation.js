import axios from 'axios';
import FormData from 'form-data';
import fs from 'fs';
import XLSX from 'xlsx';

const BASE_URL = 'http://localhost:5001/api';

// Helper function to create test Excel file
function createTestExcelFile() {
  const testData = [
    { 'الاسم الكامل': 'أحمد محمد الشعيل', 'الهاتف': '0501234567', 'الواتساب': '0501234567', 'رقم العضوية': '10001' },
    { 'الاسم الكامل': 'فاطمة علي الشعيل', 'الهاتف': '0509876543', 'الواتساب': '0509876543', 'رقم العضوية': '10002' },
    { 'الاسم الكامل': 'محمد عبدالله الشعيل', 'الهاتف': '0555555555', 'الواتساب': '0555555555', 'رقم العضوية': '10003' },
    { 'الاسم الكامل': 'عائشة أحمد الشعيل', 'الهاتف': '0544444444', 'الواتساب': '0544444444', 'رقم العضوية': '10004' },
    { 'الاسم الكامل': 'عبدالرحمن محمد الشعيل', 'الهاتف': '0533333333', 'الواتساب': '0533333333', 'رقم العضوية': '10005' }
  ];

  const worksheet = XLSX.utils.json_to_sheet(testData);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, 'الأعضاء');

  const filePath = 'test_members.xlsx';
  XLSX.writeFile(workbook, filePath);
  return filePath;
}

async function testAPI() {
  console.log('🧪 Testing Al-Shuail Members Management System API...\n');

  try {
    // Test 1: Get Member Statistics
    console.log('1️⃣ Testing Member Statistics...');
    const statsResponse = await axios.get(`${BASE_URL}/members/statistics`);
    console.log('✅ Statistics:', statsResponse.data);
    console.log('');

    // Test 2: Get All Members
    console.log('2️⃣ Testing Get All Members...');
    const membersResponse = await axios.get(`${BASE_URL}/members`);
    console.log('✅ Members count:', membersResponse.data.data.length);
    console.log('');

    // Test 3: Create Test Excel File and Import
    console.log('3️⃣ Testing Excel Import...');
    const excelFilePath = createTestExcelFile();

    const formData = new FormData();
    formData.append('excel_file', fs.createReadStream(excelFilePath));

    const importResponse = await axios.post(`${BASE_URL}/members/admin/import`, formData, {
      headers: {
        ...formData.getHeaders(),
      },
    });
    console.log('✅ Import Result:', {
      successful_imports: importResponse.data.data.successful_imports,
      failed_imports: importResponse.data.data.failed_imports,
      total_records: importResponse.data.data.total_records
    });

    // Sample imported member for further testing
    const sampleMember = importResponse.data.data.imported_members[0];
    if (sampleMember) {
      console.log('📋 Sample imported member:', {
        name: sampleMember.full_name,
        membership_number: sampleMember.membership_number,
        registration_token: sampleMember.registration_token,
        temp_password: sampleMember.temp_password
      });
      console.log('');

      // Test 4: Verify Registration Token
      console.log('4️⃣ Testing Token Verification...');
      const tokenResponse = await axios.get(
        `${BASE_URL}/members/verify-token/${sampleMember.registration_token}`
      );
      console.log('✅ Token verification:', tokenResponse.data.message);
      console.log('');

      // Test 5: Complete Profile
      console.log('5️⃣ Testing Profile Completion...');
      const profileData = {
        national_id: '1234567890',
        birth_date: '1990-01-01',
        employer: 'شركة الشعيل للتجارة',
        email: 'test@alshuail.com',
        social_security_beneficiary: false,
        temp_password: sampleMember.temp_password
      };

      const completeProfileResponse = await axios.post(
        `${BASE_URL}/members/complete-profile/${sampleMember.registration_token}`,
        profileData
      );
      console.log('✅ Profile completion:', completeProfileResponse.data.message);
      console.log('');
    }

    // Test 6: Get Import History
    console.log('6️⃣ Testing Import History...');
    const historyResponse = await axios.get(`${BASE_URL}/members/admin/import-history`);
    console.log('✅ Import batches:', historyResponse.data.data.length);
    console.log('');

    // Test 7: Get Incomplete Profiles
    console.log('7️⃣ Testing Incomplete Profiles...');
    const incompleteResponse = await axios.get(`${BASE_URL}/members/incomplete-profiles`);
    console.log('✅ Incomplete profiles:', incompleteResponse.data.data.length);
    console.log('');

    // Test 8: Updated Statistics
    console.log('8️⃣ Testing Updated Statistics...');
    const updatedStatsResponse = await axios.get(`${BASE_URL}/members/statistics`);
    console.log('✅ Updated Statistics:', {
      total_members: updatedStatsResponse.data.data.total_members,
      completed_profiles: updatedStatsResponse.data.data.completed_profiles,
      pending_profiles: updatedStatsResponse.data.data.pending_profiles,
      completion_rate: `${updatedStatsResponse.data.data.completion_rate  }%`
    });

    // Clean up test file
    fs.unlinkSync(excelFilePath);

    console.log('\n🎉 All tests completed successfully!');

  } catch (error) {
    console.error('❌ Test failed:', error.response?.data || error.message);

    // Clean up test file if it exists
    try {
      fs.unlinkSync('test_members.xlsx');
    } catch (e) {
      // File might not exist
    }
  }
}

// Only run if this file is executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  testAPI();
}