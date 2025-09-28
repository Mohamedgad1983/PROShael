# 💰 Bank Statements & Expense Receipts Implementation Guide

## 📊 Overview

This guide covers the implementation of financial document processing for:
- **Bank Statements** - Monthly/quarterly statements with transaction extraction
- **Expense Receipts** - Individual receipts with OCR and categorization

---

## 🏦 Bank Statements Implementation

### **1. Upload Flow**

```javascript
// Frontend: BankStatementUploader.jsx
import { useState } from 'react';
import { useDropzone } from 'react-dropzone';

const BankStatementUploader = () => {
  const [processing, setProcessing] = useState(false);
  
  const onDrop = async (acceptedFiles) => {
    const file = acceptedFiles[0];
    
    // 1. Upload to storage
    const formData = new FormData();
    formData.append('file', file);
    formData.append('category', 'bank_statements');
    formData.append('metadata', JSON.stringify({
      bank_name: selectedBank,
      account_number: accountNumber,
      statement_date: statementDate
    }));
    
    // 2. Upload and trigger processing
    const response = await fetch('/api/documents/upload', {
      method: 'POST',
      body: formData
    });
    
    // 3. Document will be queued for processing automatically
  };
  
  return (
    <div className="bank-statement-uploader">
      <select value={selectedBank} onChange={e => setSelectedBank(e.target.value)}>
        <option value="">اختر البنك</option>
        <option value="alrajhi">مصرف الراجحي</option>
        <option value="ncb">البنك الأهلي</option>
        <option value="sab">ساب</option>
        <option value="riyadbank">بنك الرياض</option>
      </select>
      
      <Dropzone onDrop={onDrop} accept={{'application/pdf': ['.pdf']}}>
        {({getRootProps, getInputProps}) => (
          <div {...getRootProps()} className="dropzone">
            <input {...getInputProps()} />
            <p>اسحب كشف الحساب هنا أو انقر للاختيار</p>
          </div>
        )}
      </Dropzone>
    </div>
  );
};
```

### **2. Backend Processing**

```javascript
// bankStatementProcessor.js
const processBankStatement = async (documentId, filePath) => {
  try {
    // 1. Extract text from PDF
    const pdfText = await extractPDFText(filePath);
    
    // 2. Identify bank format
    const bank = identifyBank(pdfText);
    
    // 3. Extract data based on bank format
    const extractedData = await extractBankData(bank, pdfText);
    
    // 4. Save to bank_statements table
    const statement = await saveBankStatement({
      document_id: documentId,
      bank_name: extractedData.bankName,
      account_number: extractedData.accountNumber,
      period_start: extractedData.periodStart,
      period_end: extractedData.periodEnd,
      opening_balance: extractedData.openingBalance,
      closing_balance: extractedData.closingBalance,
      transactions: extractedData.transactions
    });
    
    // 5. Update processing queue
    await updateProcessingStatus(documentId, 'completed', statement);
    
  } catch (error) {
    await updateProcessingStatus(documentId, 'failed', null, error.message);
  }
};

// Bank identification patterns
const BANK_PATTERNS = {
  alrajhi: /مصرف الراجحي|Al Rajhi Bank/i,
  ncb: /البنك الأهلي|National Commercial Bank/i,
  sab: /البنك السعودي البريطاني|Saudi British Bank/i,
  riyadbank: /بنك الرياض|Riyad Bank/i
};

// Extract transactions
const extractTransactions = (text, bankFormat) => {
  const transactions = [];
  const patterns = BANK_TRANSACTION_PATTERNS[bankFormat];
  
  // Extract based on bank-specific patterns
  const lines = text.split('\n');
  lines.forEach(line => {
    const match = line.match(patterns.transaction);
    if (match) {
      transactions.push({
        date: match[1],
        description: match[2],
        amount: parseFloat(match[3]),
        type: parseFloat(match[3]) > 0 ? 'credit' : 'debit',
        balance: parseFloat(match[4])
      });
    }
  });
  
  return transactions;
};
```

### **3. Bank Statement Viewer**

```jsx
// BankStatementViewer.jsx
const BankStatementViewer = ({ statementId }) => {
  const [statement, setStatement] = useState(null);
  const [view, setView] = useState('summary'); // 'summary' or 'transactions'
  
  useEffect(() => {
    fetchStatement();
  }, [statementId]);
  
  return (
    <div className="bank-statement-viewer">
      {/* Summary View */}
      <div className="statement-header">
        <h3>{statement.bank_name_ar}</h3>
        <p>رقم الحساب: {statement.account_number}</p>
        <p>الفترة: {statement.period_start} - {statement.period_end}</p>
      </div>
      
      <div className="balance-summary">
        <div className="balance-card">
          <label>الرصيد الافتتاحي</label>
          <span>{formatCurrency(statement.opening_balance)}</span>
        </div>
        <div className="balance-card">
          <label>الرصيد الختامي</label>
          <span>{formatCurrency(statement.closing_balance)}</span>
        </div>
      </div>
      
      {/* Transactions Table */}
      <table className="transactions-table">
        <thead>
          <tr>
            <th>التاريخ</th>
            <th>الوصف</th>
            <th>مدين</th>
            <th>دائن</th>
            <th>الرصيد</th>
          </tr>
        </thead>
        <tbody>
          {statement.transactions.map((tx, i) => (
            <tr key={i}>
              <td>{formatDate(tx.date)}</td>
              <td>{tx.description}</td>
              <td>{tx.type === 'debit' ? formatCurrency(tx.amount) : '-'}</td>
              <td>{tx.type === 'credit' ? formatCurrency(tx.amount) : '-'}</td>
              <td>{formatCurrency(tx.balance)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};
```

---

## 🧾 Expense Receipts Implementation

### **1. Receipt Upload & OCR**

```javascript
// ReceiptUploader.jsx
const ReceiptUploader = () => {
  const [preview, setPreview] = useState(null);
  const [extractedData, setExtractedData] = useState(null);
  
  const processReceipt = async (file) => {
    // 1. Show preview
    const reader = new FileReader();
    reader.onloadend = () => setPreview(reader.result);
    reader.readAsDataURL(file);
    
    // 2. Upload for OCR
    const formData = new FormData();
    formData.append('file', file);
    formData.append('category', 'expense_receipts');
    
    const response = await fetch('/api/receipts/upload-ocr', {
      method: 'POST',
      body: formData
    });
    
    const data = await response.json();
    setExtractedData(data.extracted);
  };
  
  return (
    <div className="receipt-uploader">
      <div className="upload-section">
        <Dropzone onDrop={files => processReceipt(files[0])}>
          {({getRootProps, getInputProps}) => (
            <div {...getRootProps()} className="dropzone">
              <input {...getInputProps()} />
              <Camera size={48} />
              <p>التقط صورة أو ارفع الإيصال</p>
            </div>
          )}
        </Dropzone>
      </div>
      
      {extractedData && (
        <ReceiptDataEditor 
          data={extractedData}
          onSave={handleSave}
        />
      )}
    </div>
  );
};
```

### **2. OCR Processing**

```javascript
// receiptOCR.js
const Tesseract = require('tesseract.js');
const sharp = require('sharp');

const processReceiptOCR = async (imagePath) => {
  // 1. Preprocess image for better OCR
  const processedImage = await preprocessImage(imagePath);
  
  // 2. Run OCR with Arabic language
  const { data: { text, confidence } } = await Tesseract.recognize(
    processedImage,
    'ara+eng', // Arabic + English
    {
      logger: m => console.log(m)
    }
  );
  
  // 3. Extract structured data
  const extracted = extractReceiptData(text);
  
  // 4. Enhance with AI/patterns
  const enhanced = await enhanceWithPatterns(extracted, text);
  
  return {
    raw_text: text,
    confidence: confidence,
    extracted_data: enhanced
  };
};

// Preprocessing for better OCR
const preprocessImage = async (imagePath) => {
  return await sharp(imagePath)
    .grayscale()
    .normalize()
    .sharpen()
    .resize(2000, null, { 
      withoutEnlargement: true 
    })
    .toBuffer();
};

// Extract structured data from text
const extractReceiptData = (text) => {
  const data = {
    merchant_name: null,
    total_amount: null,
    date: null,
    items: []
  };
  
  // Merchant name patterns
  const merchantMatch = text.match(/(?:شركة|مؤسسة|محل)\s+([^\n]+)/);
  if (merchantMatch) data.merchant_name = merchantMatch[1].trim();
  
  // Total amount patterns (Arabic & English)
  const totalPatterns = [
    /المجموع\s*:?\s*([\d,]+\.?\d*)/,
    /الإجمالي\s*:?\s*([\d,]+\.?\d*)/,
    /Total\s*:?\s*([\d,]+\.?\d*)/i,
    /المبلغ\s*:?\s*([\d,]+\.?\d*)/
  ];
  
  for (const pattern of totalPatterns) {
    const match = text.match(pattern);
    if (match) {
      data.total_amount = parseFloat(match[1].replace(/,/g, ''));
      break;
    }
  }
  
  // Date extraction
  const dateMatch = text.match(/(\d{1,2}[-/]\d{1,2}[-/]\d{2,4})/);
  if (dateMatch) data.date = parseDate(dateMatch[1]);
  
  // Extract line items
  const itemPattern = /(.+?)\s+(\d+)\s+x\s+([\d.]+)\s+([\d.]+)/g;
  let match;
  while ((match = itemPattern.exec(text)) !== null) {
    data.items.push({
      item_name: match[1].trim(),
      quantity: parseInt(match[2]),
      unit_price: parseFloat(match[3]),
      total: parseFloat(match[4])
    });
  }
  
  return data;
};
```

### **3. Receipt Data Editor**

```jsx
// ReceiptDataEditor.jsx
const ReceiptDataEditor = ({ data, onSave }) => {
  const [formData, setFormData] = useState(data);
  const [category, setCategory] = useState('');
  
  return (
    <div className="receipt-editor">
      <h3>تحقق من البيانات المستخرجة</h3>
      
      <div className="form-group">
        <label>اسم المتجر</label>
        <input 
          type="text"
          value={formData.merchant_name || ''}
          onChange={e => setFormData({...formData, merchant_name: e.target.value})}
          dir="rtl"
        />
      </div>
      
      <div className="form-group">
        <label>التاريخ</label>
        <input 
          type="date"
          value={formData.date || ''}
          onChange={e => setFormData({...formData, date: e.target.value})}
        />
      </div>
      
      <div className="form-group">
        <label>المبلغ الإجمالي</label>
        <input 
          type="number"
          value={formData.total_amount || ''}
          onChange={e => setFormData({...formData, total_amount: parseFloat(e.target.value)})}
          step="0.01"
        />
        <span className="currency">ريال</span>
      </div>
      
      <div className="form-group">
        <label>التصنيف</label>
        <select value={category} onChange={e => setCategory(e.target.value)}>
          <option value="">اختر التصنيف</option>
          <option value="food">طعام وشراب</option>
          <option value="transport">مواصلات</option>
          <option value="shopping">تسوق</option>
          <option value="healthcare">صحة</option>
          <option value="family_events">مناسبات عائلية</option>
        </select>
      </div>
      
      {/* Line items editor */}
      <div className="items-section">
        <h4>تفاصيل المشتريات</h4>
        {formData.items?.map((item, index) => (
          <div key={index} className="item-row">
            <input 
              value={item.item_name}
              onChange={e => updateItem(index, 'item_name', e.target.value)}
              placeholder="اسم المنتج"
            />
            <input 
              type="number"
              value={item.quantity}
              onChange={e => updateItem(index, 'quantity', parseInt(e.target.value))}
              placeholder="الكمية"
            />
            <input 
              type="number"
              value={item.unit_price}
              onChange={e => updateItem(index, 'unit_price', parseFloat(e.target.value))}
              placeholder="سعر الوحدة"
              step="0.01"
            />
          </div>
        ))}
      </div>
      
      <div className="actions">
        <button onClick={() => onSave({...formData, expense_category: category})}>
          حفظ الإيصال
        </button>
      </div>
    </div>
  );
};
```

### **4. Financial Dashboard Integration**

```jsx
// FinancialDashboard.jsx
const FinancialDashboard = ({ memberId }) => {
  const [summary, setSummary] = useState(null);
  const [recentExpenses, setRecentExpenses] = useState([]);
  const [monthlyTrend, setMonthlyTrend] = useState([]);
  
  return (
    <div className="financial-dashboard">
      {/* Summary Cards */}
      <div className="summary-grid">
        <SummaryCard 
          title="إجمالي المصروفات"
          value={summary?.total_expenses}
          icon="trending-down"
          color="red"
        />
        <SummaryCard 
          title="رصيد البنوك"
          value={summary?.total_bank_balance}
          icon="bank"
          color="green"
        />
        <SummaryCard 
          title="مصروفات الشهر"
          value={summary?.current_month_expenses}
          icon="calendar"
          color="blue"
        />
        <SummaryCard 
          title="قابل للاسترداد"
          value={summary?.reimbursable_amount}
          icon="refresh"
          color="orange"
        />
      </div>
      
      {/* Expense Category Chart */}
      <div className="chart-section">
        <h3>توزيع المصروفات حسب الفئة</h3>
        <ExpensePieChart data={categoryData} />
      </div>
      
      {/* Recent Receipts */}
      <div className="recent-receipts">
        <h3>آخر الإيصالات</h3>
        <ReceiptsList receipts={recentExpenses} />
      </div>
      
      {/* Bank Statements Timeline */}
      <div className="statements-timeline">
        <h3>كشوف الحساب</h3>
        <StatementTimeline statements={bankStatements} />
      </div>
    </div>
  );
};
```

---

## 🔌 API Endpoints

### **Bank Statements**
```javascript
// Upload bank statement
POST /api/bank-statements/upload
Body: FormData with file and metadata

// Get bank statements
GET /api/bank-statements?member_id={id}&from={date}&to={date}

// Get statement details with transactions
GET /api/bank-statements/:id

// Manually verify statement
PUT /api/bank-statements/:id/verify

// Export transactions
GET /api/bank-statements/:id/export?format=csv
```

### **Expense Receipts**
```javascript
// Upload receipt with OCR
POST /api/receipts/upload-ocr
Body: FormData with image file

// Save receipt data
POST /api/receipts
Body: { merchant_name, total_amount, date, items, category }

// Get receipts
GET /api/receipts?member_id={id}&category={cat}&from={date}&to={date}

// Update receipt
PUT /api/receipts/:id

// Mark for reimbursement
POST /api/receipts/:id/reimbursement

// Get expense summary
GET /api/expenses/summary?member_id={id}&period={month|year}
```

---

## 🎨 UI Components

### **Mobile-First Receipt Scanner**
```jsx
// MobileReceiptScanner.jsx
const MobileReceiptScanner = () => {
  return (
    <div className="mobile-scanner">
      <video ref={videoRef} className="camera-feed" />
      <button onClick={captureReceipt} className="capture-btn">
        <Camera size={32} />
      </button>
      <div className="guide-overlay">
        <div className="guide-frame" />
        <p>ضع الإيصال داخل الإطار</p>
      </div>
    </div>
  );
};
```

### **Expense Analytics Charts**
```jsx
// Using recharts for visualization
import { PieChart, Pie, Cell, ResponsiveContainer } from 'recharts';

const ExpenseCategoryPie = ({ data }) => {
  const COLORS = {
    food: '#FF6B6B',
    transport: '#4ECDC4',
    shopping: '#45B7D1',
    healthcare: '#F06292',
    family_events: '#FFD54F'
  };
  
  return (
    <ResponsiveContainer width="100%" height={300}>
      <PieChart>
        <Pie
          data={data}
          cx="50%"
          cy="50%"
          labelLine={false}
          label={renderCustomLabel}
          outerRadius={80}
          fill="#8884d8"
          dataKey="value"
        >
          {data.map((entry, index) => (
            <Cell key={`cell-${index}`} fill={COLORS[entry.category]} />
          ))}
        </Pie>
        <Tooltip content={<CustomTooltip />} />
        <Legend 
          formatter={(value) => EXPENSE_CATEGORIES[value]?.name_ar}
        />
      </PieChart>
    </ResponsiveContainer>
  );
};
```

---

## 📱 Mobile App Integration

### **React Native Receipt Camera**
```javascript
import { RNCamera } from 'react-native-camera';

const ReceiptCamera = () => {
  const takePicture = async () => {
    if (camera) {
      const options = { 
        quality: 0.8, 
        base64: true,
        fixOrientation: true 
      };
      const data = await camera.takePictureAsync(options);
      processReceipt(data);
    }
  };
  
  return (
    <View style={styles.container}>
      <RNCamera
        ref={ref => { camera = ref }}
        style={styles.preview}
        type={RNCamera.Constants.Type.back}
        captureAudio={false}
      />
      <TouchableOpacity onPress={takePicture} style={styles.capture}>
        <Text style={styles.captureText}>التقاط الإيصال</Text>
      </TouchableOpacity>
    </View>
  );
};
```

---

## 🔐 Security Considerations

1. **File Validation**
   - Max file size: 10MB for statements, 5MB for receipts
   - Allowed types: PDF for statements, images for receipts
   - Virus scanning before processing

2. **Data Privacy**
   - Encrypt financial data at rest
   - Audit log for all financial document access
   - Auto-delete OCR temp files

3. **Access Control**
   - Members see only their own financial docs
   - Financial managers can view family aggregates
   - Admins have full access

---

## 🧪 Testing Scenarios

1. **Bank Statement Tests**
   - Different bank formats (Rajhi, NCB, etc.)
   - Multi-page statements
   - Arabic/English mixed content
   - Corrupted PDFs

2. **Receipt OCR Tests**
   - Low quality images
   - Handwritten amounts
   - Different receipt formats
   - Multiple currencies

3. **Performance Tests**
   - Bulk upload (10+ files)
   - Large PDF processing
   - Concurrent OCR requests

---

This implementation provides a complete financial document management system integrated with your existing Phase 5B document management infrastructure!