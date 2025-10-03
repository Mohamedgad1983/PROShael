import express from 'express';
import {
  getAllExpenses,
  createExpense,
  updateExpenseApproval
} from '../controllers/expensesController.js';

const router = express.Router();

// Get all expenses
router.get('/', getAllExpenses);

// Create new expense
router.post('/', createExpense);

// Update expense approval status
router.put('/:id/approval', updateExpenseApproval);
router.patch('/:id/approval', updateExpenseApproval);

export default router;