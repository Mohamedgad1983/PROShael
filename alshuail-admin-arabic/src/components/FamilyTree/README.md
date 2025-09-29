# Family Tree Component

## Overview
A comprehensive family tree visualization component for the Al-Shuail Family Management System that provides interactive tree navigation, member details, and export capabilities.

## Features

### 🌳 Interactive Tree Visualization
- **react-d3-tree Integration**: Uses react-d3-tree for smooth, interactive tree rendering
- **Zoom & Pan**: Native zoom and pan functionality for large family trees
- **Expand/Collapse**: Click nodes to expand/collapse branches
- **Drag Support**: Drag to reposition the tree view
- **Responsive Design**: Adapts to different screen sizes

### 🔍 Search & Navigation
- **Real-time Search**: Search by name, member ID, or phone number
- **Highlight Results**: Visual highlighting of search matches
- **Smart Filtering**: Debounced search for smooth performance
- **Arabic Support**: Full RTL support for Arabic text

### 👤 Member Information
- **Node Details**: Each node shows name, member ID, and balance
- **Relationship Types**: Different colors for spouses, children, parents
- **Click for Details**: Click any node to view complete member information
- **Modal Interface**: Clean modal popup with comprehensive member data

### 📤 Export Capabilities
- **Image Export**: Export tree as PNG image using html2canvas
- **PDF Export**: Generate PDF documents with jsPDF
- **High Quality**: 2x scale for crisp export quality
- **Background Preservation**: Maintains glassmorphism styling in exports

### 🎨 Design System
- **Glassmorphism UI**: Premium Apple-inspired design with blur effects
- **Smooth Animations**: CSS transitions and keyframe animations
- **Color Coding**: Visual distinction for different relationship types
- **Loading States**: Elegant loading animations and skeletons

## API Integration

### Endpoints Used
```javascript
// Get family tree structure
GET /api/family-tree/tree/:memberId
GET /api/family-tree/tree (for root member)

// Get member relationships
GET /api/family-tree/relationships/:memberId

// Add new relationship (future feature)
POST /api/family-tree/relationships
```

### Authentication
- Uses JWT tokens from localStorage
- Supports both 'token' and 'auth_token' keys
- Automatic error handling for auth failures

### Data Structure
Expected API response format:
```javascript
{
  success: true,
  data: {
    id: "member_id",
    name: "Member Name",
    memberId: "M001",
    phoneNumber: "+966501234567",
    balance: 5000,
    children: [...],
    parents: [...],
    spouse: {...},
    siblings: [...]
  }
}
```

## Component Architecture

### Main Component: `FamilyTree.jsx`
- **State Management**: React hooks for tree data, search, modals
- **API Integration**: Fetch and transform family tree data
- **Event Handling**: Node clicks, search, export functions
- **Responsive Logic**: Mobile/desktop adaptations

### Styling: `FamilyTree.css`
- **Glassmorphism Effects**: backdrop-filter and transparency
- **Arabic Typography**: Cairo and Tajawal font integration
- **Responsive Breakpoints**: Mobile-first design approach
- **Dark Theme**: Gradient backgrounds with proper contrast

### Tree Transformation
```javascript
const transformDataForD3 = (memberData) => {
  // Converts backend format to D3-compatible structure
  // Handles children, parents, spouses, siblings
  // Adds visual attributes for styling
}
```

## Usage

### Integration in Dashboard
```javascript
// Added to StyledDashboard menu items
{ id: 'family-tree', label: '🌳 شجرة العائلة', icon: UserPlusIcon }

// Rendered conditionally
{activeSection === 'family-tree' && <FamilyTree />}
```

### Routing
```javascript
// Added route in App.tsx
<Route path="/family-tree" element={<AdminDashboard />} />
```

## Customization

### Node Styling
- Edit `renderCustomNodeElement` function for node appearance
- Modify CSS classes for colors and effects
- Adjust node sizes in `treeConfig`

### Search Behavior
- Modify `handleSearch` function for different search criteria
- Add fuzzy matching or advanced filters
- Customize highlight styling

### Export Options
- Adjust export quality in `html2canvas` options
- Modify PDF layout and sizing
- Add watermarks or headers

## Performance Considerations

### Optimization Features
- **Debounced Search**: 300ms delay to reduce API calls
- **Lazy Loading**: Components load on demand
- **Memoization**: useCallback for expensive operations
- **Efficient Rendering**: D3 handles large datasets efficiently

### Memory Management
- **Cleanup**: useEffect cleanup functions
- **Event Listeners**: Proper removal on unmount
- **Large Trees**: Pagination or virtualization for huge families

## Browser Support

### Modern Browsers
- **Chrome/Edge**: Full support with hardware acceleration
- **Firefox**: Complete functionality with minor CSS differences
- **Safari**: iOS and macOS compatible
- **Mobile**: Touch gestures and responsive design

### Feature Requirements
- **ES6+**: Modern JavaScript features required
- **Canvas API**: For export functionality
- **CSS Grid/Flexbox**: For responsive layouts
- **SVG**: For D3 tree rendering

## Accessibility

### Screen Reader Support
- **ARIA Labels**: Proper semantic markup
- **Keyboard Navigation**: Focus management
- **Alt Text**: Descriptive labels for visual elements
- **Color Contrast**: WCAG compliant color schemes

### Mobile Accessibility
- **Touch Targets**: Minimum 44px touch areas
- **Zoom Support**: Pinch-to-zoom compatibility
- **Voice Control**: Compatible with mobile assistants

## Future Enhancements

### Planned Features
- **Relationship Management**: Add/edit relationships via UI
- **Tree Layouts**: Multiple layout options (horizontal, radial)
- **Advanced Filtering**: Filter by generation, gender, location
- **Collaboration**: Real-time multi-user editing
- **AI Insights**: Automatic relationship suggestions

### Technical Improvements
- **Virtualization**: Handle 1000+ member trees
- **Caching**: Client-side tree caching
- **Offline Support**: PWA functionality
- **Performance**: WebGL rendering for large trees

## Dependencies

### Core Libraries
- `react-d3-tree@3.6.6`: Tree visualization
- `html2canvas@1.4.1`: Image export
- `jspdf@3.0.3`: PDF generation
- `@heroicons/react@2.2.0`: Icons

### Peer Dependencies
- `react@19.1.1`: React framework
- `react-dom@19.1.1`: DOM bindings

## Troubleshooting

### Common Issues
1. **Tree Not Rendering**: Check API response format
2. **Export Fails**: Verify html2canvas compatibility
3. **Search Not Working**: Check Arabic text encoding
4. **Performance Issues**: Consider tree size limitations

### Debug Mode
Enable console logging for debugging:
```javascript
// Add to component for debugging
console.log('Tree data:', treeData);
console.log('Search results:', highlightedNodes);
```

## Contributing

### Code Style
- Follow existing naming conventions
- Use Arabic comments where appropriate
- Maintain RTL layout standards
- Test on mobile devices

### Testing
- Verify with different family structures
- Test export functionality
- Check search with Arabic text
- Validate responsive behavior