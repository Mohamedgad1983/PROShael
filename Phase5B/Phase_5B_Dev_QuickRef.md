# 🚀 Phase 5B Quick Reference Card

## 🔗 Essential Links
- **Supabase Project:** `[your-project-url]`
- **Storage Bucket:** `member-documents`
- **API Base URL:** `/api/v1/`

## 📦 Key Dependencies
```bash
# Frontend
npm install react-d3-tree      # Family tree
npm install react-pdf          # PDF viewer
npm install tesseract.js       # OCR
npm install react-dropzone     # File upload

# Backend  
npm install multer            # File handling
npm install sharp             # Image processing
npm install pdf-parse         # PDF text extraction
```

## 🗄️ Database Tables Quick Reference

### Core Tables Created in Phase 5B:
1. `family_relationships` - Family connections
2. `family_tree_positions` - Visualization data
3. `documents_metadata` - Document info
4. `document_categories` - Document types
5. `document_access_logs` - Access tracking
6. `family_assets` - Asset registry
7. `inheritance_plans` - Distribution plans
8. `family_branches` - Branch management

## 🔑 API Endpoints Summary

### Family Tree
```javascript
GET    /api/family-tree/:memberId
POST   /api/family-tree/relationships
PUT    /api/family-tree/positions
DELETE /api/family-tree/relationships/:id
```

### Documents
```javascript
POST   /api/documents/upload
GET    /api/documents
GET    /api/documents/:id
DELETE /api/documents/:id
POST   /api/documents/:id/share
```

### Assets
```javascript
POST   /api/assets
GET    /api/assets
PUT    /api/assets/:id
GET    /api/inheritance/calculate
```

## 🎨 UI Components Tree
```
FamilyManagement/
├── FamilyTreeTab
│   └── FamilyTreeVisualization
├── DocumentsTab
│   ├── DocumentUploader
│   └── DocumentGrid
├── AssetsTab
│   ├── AssetForm
│   └── InheritanceCalculator
└── BranchesTab
    └── BranchDashboard
```

## 💾 Storage Structure
```
member-documents/
└── {user_id}/
    └── {category}/
        └── {timestamp}_{filename}
```

## 🔐 Key Security Policies
```sql
-- Document access
owner_id = auth.uid() OR auth.uid() = ANY(shared_with)

-- Admin access
auth.jwt()->>'role' IN ('admin', 'super_admin')

-- Financial manager access  
auth.jwt()->>'role' IN ('admin', 'financial_manager')
```

## 🌍 Arabic Translations Key Terms
```javascript
const TERMS = {
  familyTree: 'شجرة العائلة',
  documents: 'المستندات',
  assets: 'الأصول',
  inheritance: 'الميراث',
  branch: 'فرع',
  generation: 'جيل',
  relationship: 'صلة القرابة'
}
```

## ⚡ Performance Tips

1. **Family Tree**: Load max 3 generations initially
2. **Documents**: Lazy load thumbnails
3. **Search**: Use database full-text search
4. **Images**: Compress before upload (max 2MB)
5. **Caching**: Cache family tree for 5 minutes

## 🐛 Common Gotchas

1. **Arabic Text**: Always set `dir="rtl"`
2. **Dates**: Store both Gregorian and Hijri
3. **File Paths**: Sanitize filenames for Arabic
4. **Relationships**: Prevent circular references
5. **RLS**: Test with different user roles

## 📊 Test Data

```javascript
// Sample family relationship
{
  member_from: "uuid-father",
  member_to: "uuid-child", 
  relationship_type: "father",
  relationship_name_ar: "أب"
}

// Sample document metadata
{
  document_name: "شهادة ميلاد",
  category_id: "uuid-legal",
  file_type: "pdf",
  owner_id: "uuid-member"
}
```

## 🚨 Error Codes
- `FAM001`: Invalid relationship type
- `FAM002`: Circular relationship detected
- `DOC001`: File size exceeded
- `DOC002`: Invalid file type
- `AST001`: Invalid asset type
- `AST002`: Inheritance calculation error

## 📱 Mobile Breakpoints
- Desktop: > 1024px (full tree view)
- Tablet: 768px - 1024px (simplified tree)
- Mobile: < 768px (vertical list view)

## 🎯 Acceptance Criteria Checklist
- [ ] Tree loads in < 3 seconds
- [ ] Arabic OCR > 80% accuracy  
- [ ] Documents searchable
- [ ] Inheritance calculator accurate
- [ ] Mobile responsive
- [ ] All tests passing

---

**Remember:** 
- Test with Arabic data
- Check RTL layouts
- Validate Hijri dates
- Monitor performance
- Document edge cases

**Support:** Slack #phase5b-dev