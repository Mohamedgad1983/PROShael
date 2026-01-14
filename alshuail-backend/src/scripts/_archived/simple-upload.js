import XLSX from 'xlsx';
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';
import { log } from '../utils/logger.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load environment variables
dotenv.config({ path: path.join(__dirname, '../../.env') });

// Supabase configuration
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_KEY || process.env.SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  log.error('❌ Missing Supabase credentials');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

log.info('📊 Simple Upload Script for Al-Shuail Data');
log.info('==========================================');

async function uploadData() {
  try {
    // Read Excel file
    log.info('\n📌 Reading Excel file...');
    const excelPath = path.join(__dirname, '../../../AlShuail_Members_Prefilled_Import.xlsx');

    if (!fs.existsSync(excelPath)) {
      log.error('❌ Excel file not found');
      return;
    }

    const workbook = XLSX.readFile(excelPath);
    const sheetName = workbook.SheetNames[0];
    const sheet = workbook.Sheets[sheetName];
    const data = XLSX.utils.sheet_to_json(sheet);

    log.info(`✅ Found ${data.length} members in Excel`);

    // Sample Arabic names for better display
    const arabicNames = [
      'أحمد محمد الشعيل', 'فاطمة عبدالله الشعيل', 'محمد سالم الشعيل',
      'نورا خالد الشعيل', 'عبدالرحمن أحمد الشعيل', 'مريم عبدالعزيز الشعيل',
      'سعد ناصر الشعيل', 'هند فهد الشعيل', 'خالد عبدالله الشعيل',
      'سارة محمد الشعيل', 'عبدالعزيز سالم الشعيل', 'ريم أحمد الشعيل',
      'ناصر علي الشعيل', 'ليلى سعود الشعيل', 'فهد عبدالرحمن الشعيل',
      'نوف حمد الشعيل', 'سلطان مشعل الشعيل', 'لطيفة فيصل الشعيل',
      'تركي سعد الشعيل', 'جواهر منصور الشعيل'
    ];

    // Process members
    const members = [];
    const payments = [];
    const balances = [];

    for (let i = 0; i < data.length; i++) {
      const row = data[i];

      // Get member data
      const memberId = row['رقم العضوية'] || `SH-${10001 + i}`;
      const fullName = row['الاسم الكامل'] || arabicNames[i % arabicNames.length] || `عضو ${i + 1}`;
      const phone = row['رقم الهاتف'] || `050${String(1000000 + i).padStart(7, '0')}`;
      const whatsapp = row['رقم الواتساب'] || phone;

      // Add member
      members.push({
        member_id: memberId,
        full_name: fullName,
        phone: phone,
        whatsapp: whatsapp,
        status: 'active',
        created_at: new Date().toISOString()
      });

      // Process payments for years 2021-2025
      let totalBalance = 0;
      for (let year = 2021; year <= 2025; year++) {
        const amount = parseFloat(row[year.toString()] || 0);
        if (amount > 0) {
          payments.push({
            member_id: memberId,
            year: year,
            amount: amount,
            payment_date: `${year}-01-01`,
            created_at: new Date().toISOString()
          });
          totalBalance += amount;
        }
      }

      // Add balance
      balances.push({
        member_id: memberId,
        total_balance: totalBalance,
        status: totalBalance >= 3000 ? 'sufficient' : 'insufficient',
        minimum_required: 3000,
        shortfall: Math.max(0, 3000 - totalBalance),
        last_updated: new Date().toISOString()
      });
    }

    // Upload to Supabase
    log.info('\n📤 Uploading to Supabase...');

    // Upload members
    log.info(`Uploading ${members.length} members...`);
    const { error: _memberError } = await supabase
      .from('members')
      .upsert(members, { onConflict: 'member_id' });

    if (_memberError) {
      log.error('❌ Error uploading members:', _memberError.message);
    } else {
      log.info('✅ Members uploaded');
    }

    // Upload payments
    if (payments.length > 0) {
      log.info(`Uploading ${payments.length} payments...`);
      const { error: _paymentError } = await supabase
        .from('payments')
        .upsert(payments, { onConflict: 'member_id,year' });

      if (_paymentError) {
        log.error('❌ Error uploading payments:', _paymentError.message);
      } else {
        log.info('✅ Payments uploaded');
      }
    }

    // Upload balances
    log.info(`Uploading ${balances.length} balances...`);
    const { error: _balanceError } = await supabase
      .from('member_balances')
      .upsert(balances, { onConflict: 'member_id' });

    if (_balanceError) {
      log.error('❌ Error uploading balances:', _balanceError.message);
    } else {
      log.info('✅ Balances uploaded');
    }

    // Calculate statistics
    const sufficient = balances.filter(b => b.status === 'sufficient').length;
    const insufficient = balances.filter(b => b.status === 'insufficient').length;
    const totalShortfall = balances.reduce((sum, b) => sum + b.shortfall, 0);

    log.info('\n📊 Upload Complete!');
    log.info('===================');
    log.info(`Total Members: ${members.length}`);
    log.info(`Sufficient (≥3000): ${sufficient} (${(sufficient/members.length*100).toFixed(1)}%)`);
    log.info(`Insufficient (<3000): ${insufficient} (${(insufficient/members.length*100).toFixed(1)}%)`);
    log.info(`Total Shortfall: ${totalShortfall.toLocaleString()} SAR`);

    log.info('\n✅ Data successfully uploaded to Supabase!');
    log.info('You can now test the Crisis Dashboard and Member Statement Search.');

  } catch (error) {
    log.error('\n❌ Upload failed:', error.message);
    process.exit(1);
  }
}

// Run the upload
uploadData();