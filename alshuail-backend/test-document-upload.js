/**
 * Document Upload E2E Test
 * Tests the complete document upload flow A-Z
 */

import FormData from 'form-data';
import fetch from 'node-fetch';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Configuration
const API_BASE = 'https://proshael.onrender.com/api';
const TEST_PHONE = '0555555555'; // Test member phone
const TEST_PASSWORD = 'Test@123'; // Test member password

// Test results
const results = {
  tests: [],
  passed: 0,
  failed: 0,
  startTime: Date.now()
};

function logTest(name, status, details = '') {
  const result = { name, status, details, timestamp: new Date().toISOString() };
  results.tests.push(result);

  if (status === 'PASS') {
    results.passed++;
    console.log(`✅ ${name}`);
  } else {
    results.failed++;
    console.log(`❌ ${name}`);
  }

  if (details) {
    console.log(`   ${details}`);
  }
}

// Helper: Create test PDF
function createTestPDF() {
  const testFile = path.join(__dirname, 'test-document.pdf');
  const pdfContent = `%PDF-1.4
1 0 obj
<<
/Type /Catalog
/Pages 2 0 R
>>
endobj
2 0 obj
<<
/Type /Pages
/Kids [3 0 R]
/Count 1
>>
endobj
3 0 obj
<<
/Type /Page
/Parent 2 0 R
/Resources <<
/Font <<
/F1 <<
/Type /Font
/Subtype /Type1
/BaseFont /Helvetica
>>
>>
>>
/MediaBox [0 0 612 792]
/Contents 4 0 R
>>
endobj
4 0 obj
<<
/Length 44
>>
stream
BT
/F1 12 Tf
100 700 Td
(Test Document) Tj
ET
endstream
endobj
xref
0 5
0000000000 65535 f
0000000009 00000 n
0000000058 00000 n
0000000115 00000 n
0000000317 00000 n
trailer
<<
/Size 5
/Root 1 0 R
>>
startxref
408
%%EOF`;

  fs.writeFileSync(testFile, pdfContent);
  return testFile;
}

// Step 1: Check API Health
async function testAPIHealth() {
  try {
    const response = await fetch(`${API_BASE}/health`);
    const data = await response.json();

    if (response.ok && data.status === 'healthy') {
      logTest('API Health Check', 'PASS', `Status: ${data.status}`);
      return true;
    } else {
      logTest('API Health Check', 'FAIL', `Unexpected response: ${JSON.stringify(data)}`);
      return false;
    }
  } catch (error) {
    logTest('API Health Check', 'FAIL', error.message);
    return false;
  }
}

// Step 2: Login as test member
async function testLogin() {
  try {
    const response = await fetch(`${API_BASE}/auth/member-login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        phone: TEST_PHONE,
        password: TEST_PASSWORD
      })
    });

    const data = await response.json();

    if (response.ok && data.success && data.token) {
      logTest('Member Login', 'PASS', `Token received for member: ${data.member?.full_name || 'Unknown'}`);
      return data.token;
    } else {
      logTest('Member Login', 'FAIL', data.message || 'Login failed');
      return null;
    }
  } catch (error) {
    logTest('Member Login', 'FAIL', error.message);
    return null;
  }
}

// Step 3: Get document categories
async function testGetCategories(token) {
  try {
    const response = await fetch(`${API_BASE}/documents/config/categories`, {
      headers: { 'Authorization': `Bearer ${token}` }
    });

    const data = await response.json();

    if (response.ok && data.success && Array.isArray(data.data)) {
      logTest('Get Document Categories', 'PASS', `Found ${data.data.length} categories`);
      return data.data;
    } else {
      logTest('Get Document Categories', 'FAIL', JSON.stringify(data));
      return null;
    }
  } catch (error) {
    logTest('Get Document Categories', 'FAIL', error.message);
    return null;
  }
}

// Step 4: Upload document
async function testUploadDocument(token, testFilePath) {
  try {
    const form = new FormData();
    form.append('document', fs.createReadStream(testFilePath));
    form.append('title', 'Test Document Upload');
    form.append('description', 'E2E Test Document for Storage Policies');
    form.append('category', 'national_id');

    const response = await fetch(`${API_BASE}/documents/upload`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        ...form.getHeaders()
      },
      body: form
    });

    const data = await response.json();

    if (response.ok && data.success) {
      logTest('Upload Document', 'PASS', `Document ID: ${data.data?.id}, Path: ${data.data?.file_path}`);
      return data.data;
    } else {
      logTest('Upload Document', 'FAIL', data.message || JSON.stringify(data));
      return null;
    }
  } catch (error) {
    logTest('Upload Document', 'FAIL', error.message);
    return null;
  }
}

// Step 5: Get member's documents
async function testGetDocuments(token) {
  try {
    const response = await fetch(`${API_BASE}/documents/member`, {
      headers: { 'Authorization': `Bearer ${token}` }
    });

    const data = await response.json();

    if (response.ok && data.success) {
      logTest('Get Member Documents', 'PASS', `Found ${data.data?.length || 0} documents`);
      return data.data;
    } else {
      logTest('Get Member Documents', 'FAIL', JSON.stringify(data));
      return null;
    }
  } catch (error) {
    logTest('Get Member Documents', 'FAIL', error.message);
    return null;
  }
}

// Step 6: Get single document (with signed URL)
async function testGetSingleDocument(token, documentId) {
  try {
    const response = await fetch(`${API_BASE}/documents/${documentId}`, {
      headers: { 'Authorization': `Bearer ${token}` }
    });

    const data = await response.json();

    if (response.ok && data.success && data.data) {
      const hasSignedUrl = !!data.data.signed_url;
      logTest('Get Single Document', 'PASS', `Document retrieved, Signed URL: ${hasSignedUrl ? 'Yes' : 'No'}`);
      return data.data;
    } else {
      logTest('Get Single Document', 'FAIL', JSON.stringify(data));
      return null;
    }
  } catch (error) {
    logTest('Get Single Document', 'FAIL', error.message);
    return null;
  }
}

// Step 7: Test document access via signed URL
async function testDocumentAccess(signedUrl) {
  try {
    const response = await fetch(signedUrl, { method: 'HEAD' });

    if (response.ok) {
      logTest('Access Document via Signed URL', 'PASS', `Status: ${response.status}, Size: ${response.headers.get('content-length')} bytes`);
      return true;
    } else {
      logTest('Access Document via Signed URL', 'FAIL', `Status: ${response.status}`);
      return false;
    }
  } catch (error) {
    logTest('Access Document via Signed URL', 'FAIL', error.message);
    return false;
  }
}

// Step 8: Delete document
async function testDeleteDocument(token, documentId) {
  try {
    const response = await fetch(`${API_BASE}/documents/${documentId}`, {
      method: 'DELETE',
      headers: { 'Authorization': `Bearer ${token}` }
    });

    const data = await response.json();

    if (response.ok && data.success) {
      logTest('Delete Document', 'PASS', 'Document deleted successfully');
      return true;
    } else {
      logTest('Delete Document', 'FAIL', data.message || JSON.stringify(data));
      return false;
    }
  } catch (error) {
    logTest('Delete Document', 'FAIL', error.message);
    return false;
  }
}

// Main test flow
async function runTests() {
  console.log('\n🚀 Starting Document Upload E2E Tests\n');
  console.log(`API Base: ${API_BASE}`);
  console.log(`Test Member: ${TEST_PHONE}\n`);

  // Create test file
  console.log('📄 Creating test PDF file...');
  const testFilePath = createTestPDF();
  console.log(`✓ Test file created: ${testFilePath}\n`);

  // Run tests
  const healthOk = await testAPIHealth();
  if (!healthOk) {
    console.log('\n⚠️  API is not healthy. Stopping tests.');
    return;
  }

  const token = await testLogin();
  if (!token) {
    console.log('\n⚠️  Login failed. Stopping tests.');
    return;
  }

  const categories = await testGetCategories(token);

  const uploadedDoc = await testUploadDocument(token, testFilePath);
  if (!uploadedDoc) {
    console.log('\n⚠️  Upload failed. Skipping remaining tests.');
  } else {
    const documents = await testGetDocuments(token);

    const singleDoc = await testGetSingleDocument(token, uploadedDoc.id);
    if (singleDoc && singleDoc.signed_url) {
      await testDocumentAccess(singleDoc.signed_url);
    }

    await testDeleteDocument(token, uploadedDoc.id);
  }

  // Cleanup
  try {
    fs.unlinkSync(testFilePath);
    console.log('\n🧹 Cleaned up test file');
  } catch (e) {
    // Ignore cleanup errors
  }

  // Print summary
  const duration = ((Date.now() - results.startTime) / 1000).toFixed(2);
  console.log('\n' + '='.repeat(60));
  console.log('📊 TEST SUMMARY');
  console.log('='.repeat(60));
  console.log(`Total Tests: ${results.tests.length}`);
  console.log(`✅ Passed: ${results.passed}`);
  console.log(`❌ Failed: ${results.failed}`);
  console.log(`⏱️  Duration: ${duration}s`);
  console.log('='.repeat(60));

  if (results.failed === 0) {
    console.log('\n🎉 ALL TESTS PASSED! Document upload functionality is working correctly.');
  } else {
    console.log('\n⚠️  Some tests failed. Please review the errors above.');
  }

  console.log('\n');
  process.exit(results.failed === 0 ? 0 : 1);
}

// Run
runTests().catch(error => {
  console.error('\n❌ Fatal error:', error);
  process.exit(1);
});
