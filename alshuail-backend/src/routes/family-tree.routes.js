// Family Tree Routes
import express from 'express';
import * as familyTreeController from '../controllers/family-tree.controller.js';
import { protect } from '../middleware/auth.js';

const router = express.Router();

// Family tree endpoints
router.get('/',
  protect,
  familyTreeController.getFullTree
);

router.get('/search',
  protect,
  familyTreeController.searchMembers
);

router.get('/stats',
  protect,
  familyTreeController.getTreeStats
);

// New endpoints for HTML-based family tree interface
router.get('/branches',
  protect,
  familyTreeController.getBranches
);

router.get('/generations',
  protect,
  familyTreeController.getGenerations
);

router.get('/members',
  protect,
  familyTreeController.getMembers
);

router.get('/relationships',
  protect,
  familyTreeController.getRelationships
);

router.get('/:memberId/relationships',
  protect,
  familyTreeController.getMemberRelationships
);

// Admin endpoints for clan management
router.post('/approve-member/:memberId',
  protect,
  familyTreeController.approveMember
);

router.post('/reject-member/:memberId',
  protect,
  familyTreeController.rejectMember
);

// Member assignment endpoints
router.get('/unassigned-members',
  protect,
  familyTreeController.getUnassignedMembers
);

router.post('/assign-member',
  protect,
  familyTreeController.assignMemberToBranch
);

router.post('/bulk-assign',
  protect,
  familyTreeController.bulkAssignMembers
);

export default router;
