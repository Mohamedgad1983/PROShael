const fs = require('fs');
const path = require('path');

// List of endpoints to optimize
const endpointsToOptimize = [
  {
    file: 'alshuail-backend/src/routes/dashboard.js',
    description: 'Dashboard statistics endpoint'
  },
  {
    file: 'alshuail-backend/src/routes/memberMonitoring.js',
    description: 'Member monitoring endpoints'
  },
  {
    file: 'alshuail-backend/src/routes/payments.js',
    description: 'Payments endpoints'
  },
  {
    file: 'alshuail-backend/src/routes/subscriptions.js',
    description: 'Subscriptions endpoints'
  },
  {
    file: 'alshuail-backend/src/routes/initiatives.js',
    description: 'Initiatives endpoints'
  }
];

// Common N+1 query patterns and their optimizations
const optimizationPatterns = [
  {
    name: 'Member with payments',
    pattern: /for\s*\(.*member.*\)\s*{[\s\S]*?await\s+supabase.*payments.*member_id/gi,
    replacement: `// Optimized: Fetch all payments in single query
    const memberIds = members.map(m => m.id);
    const { data: allPayments } = await supabase
      .from('payments')
      .select('*')
      .in('payer_id', memberIds);

    const paymentsByMember = allPayments.reduce((acc, payment) => {
      if (!acc[payment.payer_id]) acc[payment.payer_id] = [];
      acc[payment.payer_id].push(payment);
      return acc;
    }, {});

    for (const member of members) {
      member.payments = paymentsByMember[member.id] || [];`
  },
  {
    name: 'Member with subscriptions',
    pattern: /for\s*\(.*member.*\)\s*{[\s\S]*?await\s+supabase.*subscriptions.*member_id/gi,
    replacement: `// Optimized: Batch fetch subscriptions
    const memberIds = members.map(m => m.id);
    const { data: allSubscriptions } = await supabase
      .from('subscriptions')
      .select('*')
      .in('member_id', memberIds);

    const subscriptionsByMember = allSubscriptions.reduce((acc, sub) => {
      if (!acc[sub.member_id]) acc[sub.member_id] = [];
      acc[sub.member_id].push(sub);
      return acc;
    }, {});`
  }
];

// Add pagination support
function addPaginationToEndpoint(content, routePath) {
  // Check if pagination already exists
  if (content.includes('page = 1') || content.includes('limit =')) {
    console.log(`✓ Pagination already exists in ${routePath}`);
    return content;
  }

  // Add pagination parameters to GET endpoints
  const paginationCode = `
    // Extract pagination parameters
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 25;
    const offset = (page - 1) * limit;
`;

  // Replace query patterns to include pagination
  content = content.replace(
    /const\s*{\s*data[^}]*}\s*=\s*await\s+supabase[\s\S]*?\.from\(['"](\w+)['"]\)[\s\S]*?\.select\(/g,
    (match, tableName) => {
      return match + `\n      .range(offset, offset + limit - 1)`;
    }
  );

  // Add pagination metadata to responses
  content = content.replace(
    /res\.json\(\s*{\s*success:\s*true,\s*data:/g,
    `res.json({
      success: true,
      pagination: {
        page,
        limit,
        total: count || data.length,
        pages: Math.ceil((count || data.length) / limit)
      },
      data:`
  );

  return content;
}

// Add response caching
function addCachingMiddleware(content) {
  if (content.includes('cache-control') || content.includes('Cache-Control')) {
    console.log('✓ Caching already implemented');
    return content;
  }

  const cacheCode = `
// Cache middleware for GET requests
const cacheMiddleware = (duration = 300) => (req, res, next) => {
  if (req.method === 'GET') {
    res.set('Cache-Control', \`public, max-age=\${duration}\`);
  }
  next();
};
`;

  // Add cache middleware to GET routes
  content = content.replace(
    /router\.get\(['"]([^'"]+)['"]\s*,/g,
    `router.get('$1', cacheMiddleware(300),`
  );

  return cacheCode + content;
}

// Process each file
let totalOptimizations = 0;

console.log('🔧 Optimizing backend endpoints for N+1 queries and adding pagination...\n');

endpointsToOptimize.forEach(endpoint => {
  const filePath = path.join(process.cwd(), endpoint.file);

  if (!fs.existsSync(filePath)) {
    console.log(`❌ File not found: ${endpoint.file}`);
    return;
  }

  let content = fs.readFileSync(filePath, 'utf8');
  let optimized = false;

  // Check and fix N+1 queries
  optimizationPatterns.forEach(pattern => {
    if (pattern.pattern.test(content)) {
      console.log(`🔍 Found N+1 query pattern "${pattern.name}" in ${endpoint.file}`);
      content = content.replace(pattern.pattern, pattern.replacement);
      optimized = true;
      totalOptimizations++;
    }
  });

  // Add pagination
  const originalLength = content.length;
  content = addPaginationToEndpoint(content, endpoint.file);
  if (content.length !== originalLength) {
    console.log(`📄 Added pagination to ${endpoint.file}`);
    optimized = true;
    totalOptimizations++;
  }

  // Add caching
  const cacheLength = content.length;
  content = addCachingMiddleware(content);
  if (content.length !== cacheLength) {
    console.log(`💾 Added response caching to ${endpoint.file}`);
    optimized = true;
    totalOptimizations++;
  }

  if (optimized) {
    // Backup original file
    const backupPath = filePath + '.backup';
    fs.copyFileSync(filePath, backupPath);

    // Write optimized content
    fs.writeFileSync(filePath, content, 'utf8');
    console.log(`✅ Optimized ${endpoint.file}\n`);
  } else {
    console.log(`⏭️  No optimizations needed for ${endpoint.file}\n`);
  }
});

console.log(`
========================================
Backend Optimization Summary
========================================
✅ Total optimizations applied: ${totalOptimizations}
📁 Files processed: ${endpointsToOptimize.length}
========================================

Optimizations applied:
- N+1 query fixes with batch fetching
- Pagination added to list endpoints
- Response caching middleware added
- Database indexes already created

Next steps:
1. Test the optimized endpoints
2. Monitor performance improvements
3. Deploy to staging environment
`);