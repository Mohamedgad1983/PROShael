import fs from 'fs';

const filePath = './src/controllers/paymentsController.js';
let content = fs.readFileSync(filePath, 'utf8');

// Replace the createPayment function with validated version
const oldFunction = `export const createPayment = async (req, res) => {
  try {
    const currentDate = new Date();
    const hijriData = HijriDateManager.convertToHijri(currentDate);

    // Auto-generate Hijri dates for new payments
    const paymentDataWithHijri = {
      ...req.body,
      hijri_date_string: hijriData.hijri_date_string,
      hijri_year: hijriData.hijri_year,
      hijri_month: hijriData.hijri_month,
      hijri_day: hijriData.hijri_day,
      hijri_month_name: hijriData.hijri_month_name
    };

    const result = await PaymentProcessingService.createPayment(paymentDataWithHijri);`;

const newFunction = `export const createPayment = async (req, res) => {
  try {
    // Extract user ID from JWT token
    let userId = null;
    if (req.headers.authorization) {
      try {
        const token = req.headers.authorization.replace('Bearer ', '');
        const decoded = jwt.verify(token, JWT_SECRET);
        userId = decoded.id;
      } catch (err) {
        log.warn('Could not extract user ID from token for rate limiting');
      }
    }

    // Validate payment data
    const validation = validatePayment({
      amount: req.body.amount,
      currency: req.body.currency || 'SAR',
      method: req.body.payment_method || req.body.method,
      description: req.body.description
    }, userId);

    if (!validation.valid) {
      return res.status(400).json({
        success: false,
        errors: validation.errors,
        error: validation.errors[0].errorAr || validation.errors[0].error
      });
    }

    const currentDate = new Date();
    const hijriData = HijriDateManager.convertToHijri(currentDate);

    // Auto-generate Hijri dates for new payments
    const paymentDataWithHijri = {
      ...req.body,
      hijri_date_string: hijriData.hijri_date_string,
      hijri_year: hijriData.hijri_year,
      hijri_month: hijriData.hijri_month,
      hijri_day: hijriData.hijri_day,
      hijri_month_name: hijriData.hijri_month_name
    };

    const result = await PaymentProcessingService.createPayment(paymentDataWithHijri);`;

content = content.replace(oldFunction, newFunction);

// Now update the processPayment function
const oldProcessFunction = `export const processPayment = async (req, res) => {
  try {
    const { id } = req.params;
    const { method } = req.body;

    const result = await PaymentProcessingService.processPayment(id, method);`;

const newProcessFunction = `export const processPayment = async (req, res) => {
  try {
    const { id } = req.params;
    const { method, amount } = req.body;

    // Extract user ID for rate limiting
    let userId = null;
    if (req.headers.authorization) {
      try {
        const token = req.headers.authorization.replace('Bearer ', '');
        const decoded = jwt.verify(token, JWT_SECRET);
        userId = decoded.id;
      } catch (err) {
        log.warn('Could not extract user ID from token for rate limiting');
      }
    }

    // Validate payment if amount is provided
    if (amount !== undefined) {
      const validation = validatePayment({
        amount: amount,
        currency: 'SAR',
        method: method,
        description: req.body.description
      }, userId);

      if (!validation.valid) {
        return res.status(400).json({
          success: false,
          errors: validation.errors,
          error: validation.errors[0].errorAr || validation.errors[0].error
        });
      }
    }

    const result = await PaymentProcessingService.processPayment(id, method);`;

content = content.replace(oldProcessFunction, newProcessFunction);

fs.writeFileSync(filePath, content);
console.log('✅ Payment controller updated with validation');