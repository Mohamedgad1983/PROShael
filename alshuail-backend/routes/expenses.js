const express = require('express');
const router = express.Router();
const {
  getAllExpenses,
  createExpense,
  updateExpenseApproval
} = require('../controllers/expensesController');

// Get all expenses
router.get('/', getAllExpenses);

// Create new expense
router.post('/', createExpense);

// Update expense approval status
router.put('/:id/approval', updateExpenseApproval);
router.patch('/:id/approval', updateExpenseApproval);

module.exports = router;