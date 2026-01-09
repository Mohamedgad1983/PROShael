/**
 * Ultramsg WhatsApp Integration Test Script
 * صندوق عائلة شعيل العنزي
 * 
 * Run: node test-ultramsg.js
 */

import fetch from 'node-fetch';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

const API_BASE = process.env.API_BASE || 'http://localhost:5001';

console.log('╔══════════════════════════════════════════════════════════════╗');
console.log('║       🧪 ULTRAMSG WHATSAPP INTEGRATION TEST                  ║');
console.log('║           صندوق عائلة شعيل العنزي                            ║');
console.log('╚══════════════════════════════════════════════════════════════╝');
console.log();

// Colors for console output
const colors = {
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  reset: '\x1b[0m',
  bold: '\x1b[1m'
};

async function testWhatsAppStatus() {
  console.log(`${colors.blue}📡 Testing WhatsApp Service Status...${colors.reset}`);
  
  try {
    const response = await fetch(`${API_BASE}/api/otp/status`);
    const data = await response.json();
    
    console.log('   Response:', JSON.stringify(data, null, 2));
    
    if (data.success && data.whatsapp?.success) {
      console.log(`${colors.green}   ✅ WhatsApp is CONNECTED${colors.reset}`);
      console.log(`   📱 Phone: ${data.whatsapp.phone || 'N/A'}`);
      return true;
    } else if (data.testMode) {
      console.log(`${colors.yellow}   ⚠️ Running in TEST MODE (OTP: 123456)${colors.reset}`);
      return 'test';
    } else {
      console.log(`${colors.red}   ❌ WhatsApp NOT configured${colors.reset}`);
      return false;
    }
  } catch (error) {
    console.log(`${colors.red}   ❌ Error: ${error.message}${colors.reset}`);
    return false;
  }
}

async function testOTPSend(phone) {
  console.log(`\n${colors.blue}📤 Testing OTP Send to: ${phone}${colors.reset}`);
  
  try {
    const response = await fetch(`${API_BASE}/api/otp/send`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ phone })
    });
    
    const data = await response.json();
    
    console.log('   Response:', JSON.stringify(data, null, 2));
    
    if (data.success) {
      console.log(`${colors.green}   ✅ OTP Sent Successfully!${colors.reset}`);
      if (data.testOtp) {
        console.log(`${colors.yellow}   📌 Test OTP: ${data.testOtp}${colors.reset}`);
      }
      return true;
    } else {
      console.log(`${colors.red}   ❌ Failed: ${data.message}${colors.reset}`);
      return false;
    }
  } catch (error) {
    console.log(`${colors.red}   ❌ Error: ${error.message}${colors.reset}`);
    return false;
  }
}

async function testOTPVerify(phone, otp) {
  console.log(`\n${colors.blue}🔐 Testing OTP Verify: ${phone} with OTP: ${otp}${colors.reset}`);
  
  try {
    const response = await fetch(`${API_BASE}/api/otp/verify`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ phone, otp })
    });
    
    const data = await response.json();
    
    console.log('   Response:', JSON.stringify(data, null, 2));
    
    if (data.success) {
      console.log(`${colors.green}   ✅ OTP Verified!${colors.reset}`);
      console.log(`   👤 User: ${data.user?.name || 'Unknown'}`);
      console.log(`   🎫 Token: ${data.token ? 'Generated' : 'Missing'}`);
      return true;
    } else {
      console.log(`${colors.red}   ❌ Failed: ${data.message}${colors.reset}`);
      return false;
    }
  } catch (error) {
    console.log(`${colors.red}   ❌ Error: ${error.message}${colors.reset}`);
    return false;
  }
}

async function checkEnvConfig() {
  console.log(`\n${colors.blue}⚙️ Environment Configuration:${colors.reset}`);
  
  const ultramsgId = process.env.ULTRAMSG_INSTANCE_ID;
  const ultramsgToken = process.env.ULTRAMSG_TOKEN;
  const useTestOtp = process.env.USE_TEST_OTP;
  
  console.log(`   ULTRAMSG_INSTANCE_ID: ${ultramsgId ? colors.green + '✓ Set' + colors.reset : colors.red + '✗ Missing' + colors.reset}`);
  console.log(`   ULTRAMSG_TOKEN: ${ultramsgToken ? colors.green + '✓ Set' + colors.reset : colors.red + '✗ Missing' + colors.reset}`);
  console.log(`   USE_TEST_OTP: ${useTestOtp || 'not set (defaults to true in dev)'}`);
  
  if (!ultramsgId || !ultramsgToken) {
    console.log(`\n${colors.yellow}   ⚠️ Ultramsg not configured - will run in test mode${colors.reset}`);
    console.log(`   📝 To configure, add to .env:`);
    console.log(`      ULTRAMSG_INSTANCE_ID=your_instance_id`);
    console.log(`      ULTRAMSG_TOKEN=your_token`);
  }
}

async function runAllTests() {
  console.log(`\n${colors.bold}🚀 Starting Integration Tests...${colors.reset}\n`);
  console.log(`   API Base: ${API_BASE}`);
  console.log(`   Time: ${new Date().toISOString()}\n`);
  
  // Check env config
  await checkEnvConfig();
  
  // Test 1: WhatsApp Status
  console.log('\n' + '─'.repeat(60));
  const statusResult = await testWhatsAppStatus();
  
  // Test 2: OTP Send (use test phone)
  console.log('\n' + '─'.repeat(60));
  const testPhone = process.argv[2] || '0501234567';
  const sendResult = await testOTPSend(testPhone);
  
  // Test 3: OTP Verify (only if send succeeded)
  if (sendResult) {
    console.log('\n' + '─'.repeat(60));
    const testOtp = process.argv[3] || '123456';
    await testOTPVerify(testPhone, testOtp);
  }
  
  // Summary
  console.log('\n' + '═'.repeat(60));
  console.log(`${colors.bold}📊 TEST SUMMARY${colors.reset}`);
  console.log('═'.repeat(60));
  console.log(`   WhatsApp Status: ${statusResult ? (statusResult === 'test' ? '⚠️ Test Mode' : '✅ Connected') : '❌ Failed'}`);
  console.log(`   OTP Send: ${sendResult ? '✅ Success' : '❌ Failed'}`);
  console.log('\n');
  
  if (statusResult === false) {
    console.log(`${colors.yellow}💡 Next Steps:${colors.reset}`);
    console.log('   1. Sign up at https://ultramsg.com');
    console.log('   2. Create an instance and scan QR code');
    console.log('   3. Add ULTRAMSG_INSTANCE_ID and ULTRAMSG_TOKEN to .env');
    console.log('   4. Restart the server and run this test again');
    console.log('\n');
  }
}

// Run tests
runAllTests().catch(console.error);
