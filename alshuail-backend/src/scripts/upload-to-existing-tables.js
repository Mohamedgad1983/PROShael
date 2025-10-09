import XLSX from 'xlsx';
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load environment variables
dotenv.config({ path: path.join(__dirname, '../../.env') });

// Validate required environment variables
if (!process.env.SUPABASE_URL) {
  throw new Error('SUPABASE_URL is required in environment variables');
}
if (!process.env.SUPABASE_SERVICE_KEY) {
  throw new Error('SUPABASE_SERVICE_KEY is required in environment variables');
}

// Load Supabase credentials from environment
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_KEY;

const supabase = createClient(supabaseUrl, supabaseKey);

log.info('📊 Uploading Data to Existing Supabase Tables');
log.info('==============================================\n');

async function uploadData() {
  try {
    // Read Excel file
    log.info('📖 Reading Excel file...');
    const excelPath = path.join(__dirname, '../../../AlShuail_Members_Prefilled_Import.xlsx');

    if (!fs.existsSync(excelPath)) {
      log.error('❌ Excel file not found');
      return;
    }

    const workbook = XLSX.readFile(excelPath);
    const sheetName = workbook.SheetNames[0];
    const sheet = workbook.Sheets[sheetName];
    const data = XLSX.utils.sheet_to_json(sheet);

    log.info(`✅ Found ${data.length} members in Excel\n`);

    // Sample Arabic names for realistic data
    const arabicNames = [
      'أحمد محمد الشعيل', 'فاطمة عبدالله الشعيل', 'محمد سالم الشعيل',
      'نورا خالد الشعيل', 'عبدالرحمن أحمد الشعيل', 'مريم عبدالعزيز الشعيل',
      'سعد ناصر الشعيل', 'هند فهد الشعيل', 'خالد عبدالله الشعيل',
      'سارة محمد الشعيل', 'عبدالعزيز سالم الشعيل', 'ريم أحمد الشعيل'
    ];

    // Process and upload members to existing 'members' table
    log.info('📤 Uploading to members table...');
    const membersToUpload = [];

    for (let i = 0; i < Math.min(data.length, 50); i++) { // Upload first 50 for testing
      const row = data[i];

      const memberData = {
        membership_number: row['رقم العضوية'] || `SH-${10001 + i}`,
        full_name: row['الاسم الكامل'] || arabicNames[i % arabicNames.length] || `عضو ${i + 1}`,
        phone: row['رقم الهاتف'] || `050${String(1000000 + i).padStart(7, '0')}`,
        email: `member${i+1}@alshuail.com`,
        tribal_section: 'الشعيل',
        subscription_type: 'annual',
        status: 'active',
        created_at: new Date().toISOString()
      };

      membersToUpload.push(memberData);
    }

    // Upload members
    const { data: uploadedMembers, error: memberError } = await supabase
      .from('members')
      .insert(membersToUpload)
      .select();

    if (memberError) {
      log.error('❌ Error uploading members:', memberError.message);
      log.info('\nTrying upsert instead...');

      // Try upsert if insert fails
      const { data: upsertedMembers, error: upsertError } = await supabase
        .from('members')
        .upsert(membersToUpload, { onConflict: 'membership_number' })
        .select();

      if (upsertError) {
        log.error('❌ Upsert also failed:', upsertError.message);
      } else {
        log.info(`✅ Successfully upserted ${upsertedMembers?.length || 0} members`);
      }
    } else {
      log.info(`✅ Successfully uploaded ${uploadedMembers?.length || 0} members`);
    }

    // Add sample payments for some members
    log.info('\n📤 Adding sample payments...');
    const paymentsToAdd = [];

    if (uploadedMembers && uploadedMembers.length > 0) {
      // Add payments for first 10 members
      for (let i = 0; i < Math.min(10, uploadedMembers.length); i++) {
        const member = uploadedMembers[i];

        // Add a payment for 2024
        paymentsToAdd.push({
          payer_id: member.id,
          amount: 1000 + (i * 500), // Varying amounts
          payment_type: 'contribution',
          payment_method: 'cash',
          category: 'annual_contribution',
          title: 'مساهمة سنوية 2024',
          status: 'completed',
          created_at: new Date().toISOString()
        });
      }

      const { data: payments, error: paymentError } = await supabase
        .from('payments')
        .insert(paymentsToAdd)
        .select();

      if (paymentError) {
        log.error('❌ Error adding payments:', paymentError.message);
      } else {
        log.info(`✅ Added ${payments?.length || 0} sample payments`);
      }
    }

    log.info('\n✅ Upload process completed!');
    log.info('==========================');
    log.info('\n📌 Next steps:');
    log.info('1. Check your Supabase Dashboard > Table Editor');
    log.info('2. Verify the "members" table has data');
    log.info('3. Test the Crisis Dashboard at http://localhost:3002');
    log.info('4. Test Member Statement Search');

  } catch (error) {
    log.error('\n❌ Error:', error.message);
  }
}

// Run the upload
uploadData();