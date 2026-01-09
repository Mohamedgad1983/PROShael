// Script to generate temp_members import SQL
const fs = require('fs');

// All 345 temp_members data extracted from Supabase
const members = [
  {id: '3707d97e-7d2d-4849-8c5e-74fbc2766e40', num: '10001', name: 'ابراهيم فلاح العايد', phone: '+96550010001', email: 'member10001@alshuail.family'},
  {id: '54c27835-898f-429c-a8bf-441ace4a6157', num: '10002', name: 'ابراهيم نواش غضبان', phone: '+96550010002', email: 'member10002@alshuail.family'},
  {id: '510cd748-ef69-41a5-bd2e-d27cf79fe07f', num: '10003', name: 'احمد حمود سعود الثابت', phone: '+96550010003', email: 'member10003@alshuail.family'},
  {id: '7e529906-c098-4f08-8e45-7e03993e5205', num: '10004', name: 'احمد خشمان فريح العقاب', phone: '+96550010004', email: 'member10004@alshuail.family'},
  {id: '64faf249-1092-4a8e-ad73-e647f99a60b3', num: '10005', name: 'احمد سعود سعد  الرشود', phone: '+96550010005', email: 'member10005@alshuail.family'},
  // Will be populated with all 345 records
];

// Generate SQL
let sql = '-- temp_members import for VPS PostgreSQL\n';
sql += '-- Generated: ' + new Date().toISOString() + '\n\n';

members.forEach(m => {
  const name = m.name.replace(/'/g, "''");
  sql += `INSERT INTO temp_members (id, membership_number, full_name, phone, email, status, created_at) VALUES ('${m.id}', '${m.num}', '${name}', '${m.phone}', '${m.email}', 'active', '2025-10-02 19:54:53.187252+00') ON CONFLICT (id) DO NOTHING;\n`;
});

fs.writeFileSync('D:\\PROShael\\temp_members.sql', sql);
console.log('SQL file created with', members.length, 'records');
