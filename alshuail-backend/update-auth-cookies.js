import fs from 'fs';

const filePath = './src/routes/auth.js';
let content = fs.readFileSync(filePath, 'utf8');

// Update login endpoint to use cookies
const oldLoginResponse = `    return res.json({
      success: true,
      token: result.token,
      user: result.user
    });`;

const newLoginResponse = `    // Set token in httpOnly cookie
    setAuthCookie(res, result.token);

    return res.json({
      success: true,
      // Don't send token in response body for security
      user: result.user,
      message: 'تم تسجيل الدخول بنجاح'
    });`;

content = content.replace(oldLoginResponse, newLoginResponse);

// Add logout endpoint if it doesn't exist
if (!content.includes('router.post(\'/logout\'')) {
  const logoutEndpoint = `
// Logout endpoint to clear auth cookie
router.post('/logout', (req, res) => {
  clearAuthCookie(res);
  res.json({
    success: true,
    message: 'تم تسجيل الخروج بنجاح'
  });
});
`;

  // Add before the export statement
  content = content.replace('export default router;', logoutEndpoint + '\nexport default router;');
}

// Update handleMemberLogin function
const oldMemberLoginResponse = `    res.json({
      success: true,
      token: memberToken,
      user: userData,
      message: 'تم تسجيل الدخول بنجاح'
    });`;

const newMemberLoginResponse = `    // Set token in httpOnly cookie
    setAuthCookie(res, memberToken);

    res.json({
      success: true,
      // Don't send token in response body for security
      user: userData,
      message: 'تم تسجيل الدخول بنجاح'
    });`;

content = content.replace(oldMemberLoginResponse, newMemberLoginResponse);

// Also update the other member login success responses
const oldTestMemberResponse = `      return res.json({
        success: true,
        token: memberToken,
        user: userData,
        mockMode: true,
        message: 'تم تسجيل الدخول بنجاح'
      });`;

const newTestMemberResponse = `      // Set token in httpOnly cookie
      setAuthCookie(res, memberToken);

      return res.json({
        success: true,
        // Don't send token in response body for security
        user: userData,
        mockMode: true,
        message: 'تم تسجيل الدخول بنجاح'
      });`;

content = content.replace(oldTestMemberResponse, newTestMemberResponse);

fs.writeFileSync(filePath, content);
console.log('✅ Auth routes updated with cookie support');