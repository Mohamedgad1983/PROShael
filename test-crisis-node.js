// Test Crisis Dashboard API call using Node.js

const API_URL = 'http://localhost:3001';

async function testCrisisFetch() {
    console.log('🔍 Testing Crisis Dashboard API...');
    console.log('📡 API URL:', API_URL);

    const url = `${API_URL}/api/crisis/dashboard`;
    console.log('🔍 Full URL:', url);

    try {
        const response = await fetch(url, {
            method: 'GET',
            headers: {
                'Content-Type': 'application/json',
                'Accept': 'application/json'
            }
        });

        console.log('📡 Response Status:', response.status);
        console.log('📡 Response OK:', response.ok);

        const contentType = response.headers.get('content-type');
        console.log('📡 Content-Type:', contentType);

        if (!contentType || !contentType.includes('application/json')) {
            const text = await response.text();
            console.error('❌ ERROR: Not JSON!');
            console.error('Received:', text.substring(0, 200));
            return;
        }

        const data = await response.json();
        console.log('✅ SUCCESS! Data received:');
        console.log('  - Total Members:', data.data?.statistics?.totalMembers || data.statistics?.totalMembers);
        console.log('  - Compliant:', data.data?.statistics?.compliantMembers || data.statistics?.compliantMembers);
        console.log('  - Non-Compliant:', data.data?.statistics?.nonCompliantMembers || data.statistics?.nonCompliantMembers);
        console.log('  - Members Array Length:', data.data?.members?.length || data.members?.length);

    } catch (error) {
        console.error('❌ FETCH ERROR:', error.message);
        console.error('Full error:', error);
    }
}

testCrisisFetch();