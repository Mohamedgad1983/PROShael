import dotenv from 'dotenv';
import { createClient } from '@supabase/supabase-js';
import bcrypt from 'bcrypt';
import readline from 'readline';

dotenv.config();

// Initialize Supabase client
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

const question = (query) => new Promise((resolve) => rl.question(query, resolve));

async function createSuperAdmin() {
  try {
    log.info('========================================');
    log.info('إنشاء حساب مدير عام جديد');
    log.info('Create New Super Admin Account');
    log.info('========================================\n');

    // Get user input
    const fullName = await question('أدخل الاسم الكامل بالعربية (Full Name in Arabic): ');
    const phone = await question('أدخل رقم الهاتف مع رمز الدولة (Phone with country code +965/+966): ');
    const password = await question('أدخل كلمة المرور (Password): ');

    // Validate phone format
    const phoneRegex = /^(\+965|\+966)[0-9]{8,9}$/;
    if (!phoneRegex.test(phone)) {
      log.error('❌ رقم الهاتف غير صحيح! يجب أن يبدأ بـ +965 أو +966');
      log.error('Invalid phone format! Must start with +965 or +966');
      rl.close();
      return;
    }

    // Hash the password
    const hashedPassword = await bcrypt.hash(password, 12);

    // Check if user already exists
    const { data: existingUser } = await supabase
      .from('members')
      .select('id')
      .eq('phone', phone)
      .single();

    if (existingUser) {
      log.info('\n⚠️ المستخدم موجود بالفعل، سيتم تحديث البيانات...');
      log.info('User already exists, updating...\n');

      // Update existing user to super admin
      const { data, error } = await supabase
        .from('members')
        .update({
          full_name: fullName,
          password_hash: hashedPassword,
          role: 'super_admin',
          is_active: true,
          updated_at: new Date().toISOString()
        })
        .eq('phone', phone)
        .select()
        .single();

      if (error) {
        log.error('❌ خطأ في التحديث:', error.message);
        log.error('Update error:', error.message);
      } else {
        log.info('\n✅ تم تحديث المستخدم كمدير عام بنجاح!');
        log.info('User updated as super admin successfully!\n');
        log.info('========================================');
        log.info('بيانات الدخول / Login Credentials:');
        log.info('========================================');
        log.info(`الهاتف (Phone): ${phone}`);
        log.info(`كلمة المرور (Password): ${password}`);
        log.info(`الصلاحية (Role): super_admin`);
        log.info('========================================');
      }
    } else {
      // Create new super admin
      const { data, error } = await supabase
        .from('members')
        .insert([{
          phone: phone,
          full_name: fullName,
          password_hash: hashedPassword,
          role: 'super_admin',
          is_active: true,
          member_status: 'active',
          country_code: phone.startsWith('+965') ? '+965' : '+966',
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        }])
        .select()
        .single();

      if (error) {
        log.error('❌ خطأ في الإنشاء:', error.message);
        log.error('Creation error:', error.message);
      } else {
        log.info('\n✅ تم إنشاء حساب المدير العام بنجاح!');
        log.info('Super admin account created successfully!\n');
        log.info('========================================');
        log.info('بيانات الدخول / Login Credentials:');
        log.info('========================================');
        log.info(`الاسم (Name): ${fullName}`);
        log.info(`الهاتف (Phone): ${phone}`);
        log.info(`كلمة المرور (Password): ${password}`);
        log.info(`الصلاحية (Role): super_admin`);
        log.info('========================================');
      }
    }

    // Test the login
    log.info('\n🔧 اختبار تسجيل الدخول...');
    log.info('Testing login...\n');

    const { data: loginTest } = await supabase
      .from('members')
      .select('*')
      .eq('phone', phone)
      .single();

    if (loginTest) {
      const passwordMatch = await bcrypt.compare(password, loginTest.password_hash);
      if (passwordMatch) {
        log.info('✅ تسجيل الدخول يعمل بشكل صحيح!');
        log.info('Login test successful!');
      } else {
        log.info('⚠️ كلمة المرور لا تطابق');
        log.info('Password mismatch');
      }
    }

    log.info('\n========================================');
    log.info('يمكنك الآن تسجيل الدخول من الموقع:');
    log.info('You can now login at:');
    log.info('http://localhost:3002');
    log.info('========================================\n');

  } catch (error) {
    log.error('❌ خطأ غير متوقع:', error);
    log.error('Unexpected error:', error);
  } finally {
    rl.close();
  }
}

// Run the script
createSuperAdmin();