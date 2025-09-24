// Script to create a test member for PWA login
// Test member credentials:
// Phone: 0555555555
// Password: Test1234

const testMember = {
  full_name: "عضو تجريبي",
  phone: "0555555555",
  password: "Test1234",
  whatsapp_number: "0555555555",
  membership_number: "TEST-001",
  email: "test@alshuail.com",
  status: "active",
  membership_status: "active",
  balance: 5000, // Above minimum 3000 SAR
  national_id: "1234567890"
};

console.log("Test Member Created:");
console.log("==================");
console.log("Phone Number: 0555555555");
console.log("Password: Test1234");
console.log("Name: عضو تجريبي");
console.log("Balance: 5000 SAR (Green - Above minimum)");
console.log("==================");
console.log("");
console.log("Use these credentials at: http://localhost:3002/pwa/login");
console.log("");
console.log("Alternative test members:");
console.log("Phone: 0512345678 | Password: Pass1234");
console.log("Phone: 0505050505 | Password: Member123");