# 💳 Financial Documents Quick API Reference

## 🏦 Bank Statement APIs

### Upload & Process
```javascript
// Upload bank statement
POST /api/bank-statements/upload
Headers: Authorization: Bearer {token}
Body: FormData
{
  file: PDF file (required),
  bank_name: "alrajhi" | "ncb" | "sab" | "riyadbank",
  account_number: "1234567890",
  statement_date: "2024-01-31"
}
Response: {
  success: true,
  document_id: "uuid",
  processing_status: "queued"
}
```

### Retrieve Statements
```javascript
// List bank statements
GET /api/bank-statements?member_id={uuid}&from=2024-01-01&to=2024-12-31
Response: {
  statements: [{
    id: "uuid",
    bank_name_ar: "مصرف الراجحي",
    account_number: "****7890",
    statement_date: "2024-01-31",
    closing_balance: 15000.00
  }]
}

// Get statement details with transactions
GET /api/bank-statements/{id}
Response: {
  id: "uuid",
  bank_name: "alrajhi",
  transactions: [{
    date: "2024-01-15",
    description: "نقاط البيع - كارفور",
    amount: -350.50,
    type: "debit",
    balance: 14649.50
  }]
}
```

## 🧾 Expense Receipt APIs

### Upload with OCR
```javascript
// Upload receipt for OCR
POST /api/receipts/upload-ocr
Headers: Authorization: Bearer {token}
Body: FormData { file: image }
Response: {
  success: true,
  extracted: {
    merchant_name: "كارفور",
    total_amount: 350.50,
    date: "2024-01-15",
    confidence: 0.85,
    items: [{
      item_name: "حليب نادك",
      quantity: 2,
      unit_price: 15.50,
      total: 31.00
    }]
  }
}
```

### Save Receipt
```javascript
// Save receipt data
POST /api/receipts
Body: {
  document_id: "uuid",
  merchant_name: "كارفور", 
  total_amount: 350.50,
  transaction_date: "2024-01-15",
  expense_category: "food",
  payment_method: "credit_card",
  line_items: [...],
  notes: "مشتريات أسبوعية"
}
```

### Query Receipts
```javascript
// Get receipts with filters
GET /api/receipts?
  member_id={uuid}&
  category=food&
  from=2024-01-01&
  to=2024-01-31&
  min_amount=50&
  max_amount=500&
  merchant=كارفور

// Mark for reimbursement
POST /api/receipts/{id}/reimbursement
Body: {
  reason: "مصاريف عمل",
  amount: 350.50
}
```

## 📊 Financial Summary APIs

### Dashboard Data
```javascript
// Get financial summary
GET /api/financial/summary?member_id={uuid}
Response: {
  total_bank_balance: 45000.00,
  total_expenses: 12500.00,
  current_month_expenses: 3200.00,
  reimbursable_amount: 850.00,
  pending_reimbursements: 2,
  expense_by_category: {
    food: 1500.00,
    transport: 800.00,
    shopping: 900.00
  }
}

// Get expense trends
GET /api/financial/trends?member_id={uuid}&period=6months
Response: {
  trends: [{
    month: "2024-01",
    total: 3200.00,
    categories: {...}
  }]
}
```

## 🔧 Processing Queue

### Queue Status
```javascript
// Check processing status
GET /api/processing/status/{document_id}
Response: {
  status: "processing" | "completed" | "failed",
  progress: 75,
  result: {...},
  error: null
}

// Retry failed processing
POST /api/processing/retry/{document_id}
```

## 🏷️ Helper Functions (Backend)

### Bank Statement Extraction
```javascript
// Identify bank from PDF text
const identifyBank = (text) => {
  const banks = {
    alrajhi: /مصرف الراجحي|Al Rajhi Bank/i,
    ncb: /البنك الأهلي|National Commercial Bank/i,
    sab: /ساب|SABB/i,
    riyadbank: /بنك الرياض|Riyad Bank/i
  };
  
  for (const [code, pattern] of Object.entries(banks)) {
    if (pattern.test(text)) return code;
  }
  return 'unknown';
};

// Extract amount patterns
const extractAmount = (text) => {
  const patterns = [
    /SAR\s*([\d,]+\.?\d*)/,
    /ريال\s*([\d,]+\.?\d*)/,
    /([\d,]+\.?\d*)\s*ر\.س/
  ];
  
  for (const pattern of patterns) {
    const match = text.match(pattern);
    if (match) return parseFloat(match[1].replace(/,/g, ''));
  }
  return null;
};
```

### Receipt OCR Helpers
```javascript
// Preprocess image for better OCR
const preprocessReceiptImage = async (imagePath) => {
  return await sharp(imagePath)
    .grayscale()
    .normalize()
    .sharpen()
    .threshold(128)
    .toBuffer();
};

// Extract receipt date
const extractReceiptDate = (text) => {
  const patterns = [
    /(\d{1,2}[-/]\d{1,2}[-/]\d{4})/,
    /(\d{4}[-/]\d{1,2}[-/]\d{1,2})/,
    /التاريخ:\s*([^\n]+)/
  ];
  
  for (const pattern of patterns) {
    const match = text.match(pattern);
    if (match) return parseDate(match[1]);
  }
  return null;
};
```

## 🎨 Frontend Components

### Bank Statement Viewer
```jsx
import { BankStatementViewer } from '@/components/Financial';

<BankStatementViewer 
  statementId={statementId}
  showTransactions={true}
  downloadEnabled={true}
  onClose={() => {}}
/>
```

### Receipt Scanner
```jsx
import { ReceiptScanner } from '@/components/Financial';

<ReceiptScanner
  onCapture={handleReceiptCapture}
  onExtracted={handleExtractedData}
  category="food"
  enableFlash={true}
/>
```

### Expense Chart
```jsx
import { ExpenseAnalytics } from '@/components/Financial';

<ExpenseAnalytics
  memberId={memberId}
  period="month"
  chartType="pie"
  categories={['food', 'transport', 'shopping']}
/>
```

## 🔒 Security Headers

```javascript
// Required headers for financial endpoints
{
  'Authorization': 'Bearer {jwt_token}',
  'X-Member-ID': '{member_uuid}',
  'X-Request-ID': '{unique_request_id}',
  'X-Timestamp': '2024-01-15T10:30:00Z'
}
```

## 📱 Mobile Specific

### Camera Permissions (React Native)
```javascript
// iOS Info.plist
<key>NSCameraUsageDescription</key>
<string>نحتاج إلى الكاميرا لتصوير الإيصالات</string>

// Android Manifest
<uses-permission android:name="android.permission.CAMERA" />
<uses-feature android:name="android.hardware.camera.autofocus" />
```

### Receipt Quick Capture
```javascript
// Quick capture for mobile
const quickCapture = async () => {
  const { status } = await Camera.requestCameraPermissionsAsync();
  if (status === 'granted') {
    const photo = await cameraRef.current.takePictureAsync({
      quality: 0.8,
      base64: true
    });
    uploadReceipt(photo);
  }
};
```

## 🚨 Error Codes

| Code | Description | Action |
|------|-------------|--------|
| FIN001 | Invalid bank statement format | Check PDF format |
| FIN002 | OCR confidence too low | Manual entry required |
| FIN003 | Duplicate receipt detected | Check existing receipts |
| FIN004 | Processing timeout | Retry processing |
| FIN005 | Invalid amount format | Verify number format |
| FIN006 | Missing required fields | Complete all fields |
| FIN007 | File size exceeded | Compress file |
| FIN008 | Unsupported file type | Use PDF/JPG/PNG |

## 🎯 Quick Testing

```bash
# Test bank statement upload
curl -X POST https://api.example.com/api/bank-statements/upload \
  -H "Authorization: Bearer {token}" \
  -F "file=@statement.pdf" \
  -F "bank_name=alrajhi" \
  -F "account_number=1234567890"

# Test receipt OCR
curl -X POST https://api.example.com/api/receipts/upload-ocr \
  -H "Authorization: Bearer {token}" \
  -F "file=@receipt.jpg"
```

---

**Remember:** Always handle Arabic text with `dir="rtl"` and use proper currency formatting for SAR amounts!