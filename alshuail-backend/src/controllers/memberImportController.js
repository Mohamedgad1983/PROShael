import { supabase } from '../config/database.js';
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
    return `0${  cleanPhone}`;
  }

  return null;
}

// Helper function to generate next membership number
async function getNextMembershipNumber() {
  try {
    const { data: lastMember, error } = await supabase
      .from('members')
      .select('membership_number')
      .like('membership_number', '1%')
      .order('membership_number', { ascending: false })
      .limit(1);

    if (error) {throw error;}

    if (lastMember && lastMember.length > 0) {
      const lastNumber = parseInt(lastMember[0].membership_number);
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
    const { error: _batchError } = await supabase
      .from('excel_import_batches')
      .insert({
        id: batchId,
        filename: req.file.originalname,
        total_records: jsonData.length,
        status: 'processing'
      });

    if (_batchError) {throw _batchError;}

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
        const { data: existingMember } = await supabase
          .from('members')
          .select('id, phone')
          .eq('phone', phone)
          .single();

        if (existingMember) {
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
        const { data: existingMembershipNumber } = await supabase
          .from('members')
          .select('id, membership_number')
          .eq('membership_number', finalMembershipNumber)
          .single();

        if (existingMembershipNumber) {
          finalMembershipNumber = await getNextMembershipNumber();
        }

        // Generate temporary password and hash it
        const tempPassword = generateTempPassword();
        const hashedTempPassword = await bcrypt.hash(tempPassword, 12);

        // Create member record
        const memberData = {
          full_name: fullNameArabic,
          phone: phone,
          whatsapp_number: whatsapp,
          membership_number: finalMembershipNumber,
          temp_password: hashedTempPassword,
          excel_import_batch: batchId,
          profile_completed: false,
          membership_status: 'active',
          membership_date: new Date().toISOString().split('T')[0]
        };

        const { data: newMember, error: _memberError } = await supabase
          .from('members')
          .insert(memberData)
          .select()
          .single();

        if (_memberError) {throw _memberError;}

        // Generate registration token
        let registrationToken;
        let tokenExists = true;

        // Ensure unique token
        while (tokenExists) {
          registrationToken = generateRegistrationToken();
          const { data: existingToken } = await supabase
            .from('member_registration_tokens')
            .select('id')
            .eq('token', registrationToken)
            .single();

          tokenExists = !!existingToken;
        }

        // Create registration token record
        const expiryDate = new Date();
        expiryDate.setDate(expiryDate.getDate() + 30); // 30 days expiry

        const { error: _tokenError } = await supabase
          .from('member_registration_tokens')
          .insert({
            member_id: newMember.id,
            token: registrationToken,
            temp_password: tempPassword, // Store plain text for SMS
            expires_at: expiryDate.toISOString(),
            is_used: false
          });

        if (_tokenError) {throw _tokenError;}

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
    const { error: _updateBatchError } = await supabase
      .from('excel_import_batches')
      .update({
        successful_imports: successfulImports,
        failed_imports: failedImports,
        status: batchStatus,
        error_details: errors.length > 0 ? errors : null,
        completed_at: new Date().toISOString()
      })
      .eq('id', batchId);

    if (_updateBatchError) {
      log.error('Error updating batch status', { error: _updateBatchError.message });
    }

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
      await supabase
        .from('excel_import_batches')
        .update({
          status: 'failed',
          error_details: [{ error: error.message }],
          completed_at: new Date().toISOString()
        })
        .eq('id', batchId);
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

    const { data: importHistory, error } = await supabase
      .from('excel_import_batches')
      .select('*')
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    if (error) {throw error;}

    const { count } = await supabase
      .from('excel_import_batches')
      .select('*', { count: 'exact', head: true });

    res.json({
      success: true,
      data: importHistory || [],
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total: count || 0,
        pages: Math.ceil((count || 0) / limit)
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

    const { data: batch, error: _batchError } = await supabase
      .from('excel_import_batches')
      .select('*')
      .eq('id', batchId)
      .single();

    if (_batchError) {throw _batchError;}

    if (!batch) {
      return res.status(404).json({
        success: false,
        error: 'دفعة الاستيراد غير موجودة'
      });
    }

    // Get members imported in this batch
    const { data: members, error: _membersError } = await supabase
      .from('members')
      .select('id, full_name, phone, membership_number, profile_completed, created_at')
      .eq('excel_import_batch', batchId)
      .order('created_at', { ascending: false });

    if (_membersError) {throw _membersError;}

    res.json({
      success: true,
      data: {
        batch_info: batch,
        imported_members: members || []
      }
    });

  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message || 'فشل في جلب تفاصيل دفعة الاستيراد'
    });
  }
};