import fetch from 'node-fetch';

async function testMobileLogin() {
    const apiUrl = 'https://proshael.onrender.com/api/auth/member-login';
    const testPhone = '0555555555';
    const testPassword = '123456';

    console.log('\n=== Testing Mobile Login API ===');
    console.log('URL:', apiUrl);
    console.log('Phone:', testPhone);
    console.log('Password:', testPassword);

    try {
        const response = await fetch(apiUrl, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                phone: testPhone,
                password: testPassword
            })
        });

        const data = await response.json();

        console.log('\n=== API Response ===');
        console.log('Status:', response.status);
        console.log('Response:', JSON.stringify(data, null, 2));

        if (data.success) {
            console.log('\n✅ LOGIN SUCCESSFUL!');
            console.log('Token:', data.token ? data.token.substring(0, 50) + '...' : 'No token');
            console.log('User:', data.user);
        } else {
            console.log('\n❌ LOGIN FAILED');
            console.log('Error:', data.error);
        }

    } catch (error) {
        console.error('\n❌ API Request Failed:', error.message);
    }
}

testMobileLogin();