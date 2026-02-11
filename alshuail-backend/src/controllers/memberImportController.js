import { query, getClient } from '../services/database.js';
import ExcelJS from 'exceljs';
import bcrypt from 'bcryptjs';
import { v4 as uuidv4 } from 'uuid';
import { log } from '../utils/logger.js';

// Helper function to generate 6-digit password
function generateTempPassword() {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

// Helper function to generate 8-character registration token
function generateRegistrationToken() {
  const chars = 'ABCDEFGHIJKLMNPQRSTUVWXYZ123456789'; // Excluded confusing characters
  let result = '';
  for (let i = 0; i < 8; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
}

// Helper function to validate and clean Arabic text
function cleanArabicText(text) {
  if (!text) {return '';}
  return text.toString().trim()
    .replace(/[\u200F\u200E\u202A\u202B\u202C\u202D\u202E]/g, '') // Remove RTL/LTR marks
    .replace(/\s+/g, ' '); // Normalize whitespace
}

// Helper function to validate phone number
function validatePhoneNumber(phone) {
  if (!phone) {return null;}
  const cleanPhone = phone.toString().replace(/\D/g, '');

  // Saudi phone number validation (starts with 05 and 10 digits total)
  if (cleanPhone.match(/^05\d{8}$/)) {
    return cleanPhone;
  }

  // International format (966 followed by 5 and 8 digits)
  if (cleanPhone.match(/^9665\d{8}$/)) {
    return cleanPhone;
  }

  // Try to fix common formats
  if (cleanPhone.startsWith('5') && cleanPhone.length === 9) {
    return `0${cleanPhone}`;
  }

  return null;
}

// Helper function to generate next membership number
async function getNextMembershipNumber() {
  try {
    const result = await query(
      `SELECT membership_number FROM members
       WHERE membership_number LIKE '1%'
       ORDER BY membership_number DESC
       LIMIT 1`
    );

    if (result.rows && result.rows.length > 0) {
      const lastNumber = parseInt(result.rows[0].membership_number);
      return (lastNumber + 1).toString();
    }

    return '10001'; // Start from 10001
  } catch (error) {
    log.error('Error getting next membership number', { error: error.message });
    return '10001';
  }
}

export const importMembersFromExcel = async (req, res) => {
  let batchId = null;

  try {
    // Validate file upload
    if (!req.file) {
      return res.status(400).json({
        success: false,
        error: 'لم يتم رفع ملف Excel'
      });
    }

    // Validate file type
    const allowedMimeTypes = [
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'application/vnd.ms-excel'
    ];

    if (!allowedMimeTypes.includes(req.file.mimetype)) {
      return res.status(400).json({
        success: false,
        error: 'نوع الملف غير مدعوم. يجب أن يكون ملف Excel (.xlsx or .xls)'
      });
    }

    // Check file size (10MB limit)
    if (req.file.size > 10 * 1024 * 1024) {
      return res.status(400).json({
        success: false,
        error: 'حجم الملف كبير جداً. الحد الأقصى 10 ميجابايت'
      });
    }

    // Parse Excel file with ExcelJS (secure alternative to xlsx)
    const workbook = new ExcelJS.Workbook();
    await workbook.xlsx.load(req.file.buffer);
    const worksheet = workbook.worksheets[0];

    // Convert worksheet to JSON
    const jsonData = [];
    const headerRow = worksheet.getRow(1);
    const headers = [];
    headerRow.eachCell((cell, colNumber) => {
      headers[colNumber] = cell.value;
    });

    worksheet.eachRow((row, rowNumber) => {
      if (rowNumber === 1) {return;} // Skip header row
      const rowData = {};
      row.eachCell((cell, colNumber) => {
        if (headers[colNumber]) {
          rowData[headers[colNumber]] = cell.value;
        }
      });
      if (Object.keys(rowData).length > 0) {
        jsonData.push(rowData);
      }
    });

    if (!jsonData || jsonData.length === 0) {
      return res.status(400).json({
        success: false,
        error: 'الملف فارغ أو لا يحتوي على بيانات صحيحة'
      });
    }

    // Create import batch record
    batchId = uuidv4();
    await query(
      `INSERT INTO excel_import_batches (id, filename, total_records, status)
       VALUES ($1, $2, $3, $4)`,
      [batchId, req.file.originalname, jsonData.length, 'processing']
    );

    let successfulImports = 0;
    let failedImports = 0;
    const errors = [];
    const importedMembers = [];

    // Process each row
    for (let i = 0; i < jsonData.length; i++) {
      try {
        const row = jsonData[i];
        const rowNum = i + 2; // Excel row number (accounting for header)

        // Extract data from Excel columns
        const fullNameArabic = cleanArabicText(row['الاسم الكامل'] || row['Full Name Arabic'] || row['الاسم']);
        const phone = validatePhoneNumber(row['الهاتف'] || row['Phone'] || row['رقم الهاتف']);
        const whatsapp = validatePhoneNumber(row['الواتساب'] || row['WhatsApp'] || row['رقم الواتساب']) || phone;
        const membershipNumber = row['رقم العضوية'] || row['Membership Number'];

        // Validation
        if (!fullNameArabic) {
          errors.push({ row: rowNum, error: 'الاسم الكامل مطلوب' });
          failedImports++;
          continue;
        }

        if (!phone) {
          errors.push({ row: rowNum, error: 'رقم هاتف صحيح مطلوب' });
          failedImports++;
          continue;
        }

        // Check for duplicate phone number
        const existingMemberResult = await query(
          'SELECT id, phone FROM members WHERE phone = $1',
          [phone]
        );

        if (existingMemberResult.rows && existingMemberResult.rows.length > 0) {
          errors.push({ row: rowNum, error: `رقم الهاتف ${phone} موجود مسبقاً` });
          failedImports++;
          continue;
        }

        // Generate membership number if not provided
        let finalMembershipNumber = membershipNumber;
        if (!finalMembershipNumber) {
          finalMembershipNumber = await getNextMembershipNumber();
        }

        // Check for duplicate membership number
        const existingMembershipResult = await query(
          'SELECT id, membership_number FROM members WHERE membership_number = $1',
          [finalMembershipNumber]
        );

        if (existingMembershipResult.rows && existingMembershipResult.rows.length > 0) {
          finalMembershipNumber = await getNextMembershipNumber();
        }

        // Generate temporary password and hash it
        const tempPassword = generateTempPassword();
        const hashedTempPassword = await bcrypt.hash(tempPassword, 12);

        // Create member record
        const newMemberResult = await query(
          `INSERT INTO members (
            full_name, phone, whatsapp_number, membership_number,
            temp_password, excel_import_batch, profile_completed,
            membership_status, membership_date
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
          RETURNING *`,
          [
            fullNameArabic,
            phone,
            whatsapp,
            finalMembershipNumber,
            hashedTempPassword,
            batchId,
            false,
            'active',
            new Date().toISOString().split('T')[0]
          ]
        );

        const newMember = newMemberResult.rows[0];

        // Generate registration token
        let registrationToken;
        let tokenExists = true;

        // Ensure unique token
        while (tokenExists) {
          registrationToken = generateRegistrationToken();
          const existingTokenResult = await query(
            'SELECT id FROM member_registration_tokens WHERE token = $1',
            [registrationToken]
          );
          tokenExists = existingTokenResult.rows && existingTokenResult.rows.length > 0;
        }

        // Create registration token record
        const expiryDate = new Date();
        expiryDate.setDate(expiryDate.getDate() + 30); // 30 days expiry

        await query(
          `INSERT INTO member_registration_tokens (
            member_id, token, temp_password, expires_at, is_used
          ) VALUES ($1, $2, $3, $4, $5)`,
          [newMember.id, registrationToken, tempPassword, expiryDate.toISOString(), false]
        );

        importedMembers.push({
          ...newMember,
          registration_token: registrationToken,
          temp_password: tempPassword
        });

        successfulImports++;

      } catch (rowError) {
        log.error('Error processing row', { row: i + 2, error: rowError.message });
        errors.push({
          row: i + 2,
          error: rowError.message || 'خطأ في معالجة البيانات'
        });
        failedImports++;
      }
    }

    // Update batch status
    const batchStatus = failedImports > 0 ? 'completed_with_errors' : 'completed';
    await query(
      `UPDATE excel_import_batches
       SET successful_imports = $1,
           failed_imports = $2,
           status = $3,
           error_details = $4,
           completed_at = $5
       WHERE id = $6`,
      [
        successfulImports,
        failedImports,
        batchStatus,
        errors.length > 0 ? JSON.stringify(errors) : null,
        new Date().toISOString(),
        batchId
      ]
    );

    // Return response
    res.json({
      success: true,
      data: {
        batch_id: batchId,
        total_records: jsonData.length,
        successful_imports: successfulImports,
        failed_imports: failedImports,
        imported_members: importedMembers,
        errors: errors
      },
      message: `تم استيراد ${successfulImports} عضو بنجاح${failedImports > 0 ? ` مع ${failedImports} خطأ` : ''}`
    });

  } catch (error) {
    log.error('Import error', { error: error.message });

    // Update batch status to failed if batch was created
    if (batchId) {
      await query(
        `UPDATE excel_import_batches
         SET status = $1,
             error_details = $2,
             completed_at = $3
         WHERE id = $4`,
        ['failed', JSON.stringify([{ error: error.message }]), new Date().toISOString(), batchId]
      );
    }

    res.status(500).json({
      success: false,
      error: error.message || 'فشل في استيراد البيانات من Excel'
    });
  }
};

export const getImportHistory = async (req, res) => {
  try {
    const { page = 1, limit = 10 } = req.query;
    const offset = (page - 1) * limit;

    const result = await query(
      `SELECT * FROM excel_import_batches
       ORDER BY created_at DESC
       LIMIT $1 OFFSET $2`,
      [limit, offset]
    );

    const countResult = await query('SELECT COUNT(*) as count FROM excel_import_batches');
    const count = parseInt(countResult.rows[0].count);

    res.json({
      success: true,
      data: result.rows || [],
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total: count,
        pages: Math.ceil(count / limit)
      }
    });

  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message || 'فشل في جلب تاريخ الاستيراد'
    });
  }
};

export const getImportBatchDetails = async (req, res) => {
  try {
    const { batchId } = req.params;

    const batchResult = await query(
      'SELECT * FROM excel_import_batches WHERE id = $1',
      [batchId]
    );

    if (!batchResult.rows || batchResult.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'دفعة الاستيراد غير موجودة'
      });
    }

    const batch = batchResult.rows[0];

    // Get members imported in this batch
    const membersResult = await query(
      `SELECT id, full_name, phone, membership_number, profile_completed, created_at
       FROM members
       WHERE excel_import_batch = $1
       ORDER BY created_at DESC`,
      [batchId]
    );

    res.json({
      success: true,
      data: {
        batch_info: batch,
        imported_members: membersResult.rows || []
      }
    });

  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message || 'فشل في جلب تفاصيل دفعة الاستيراد'
    });
  }
};
