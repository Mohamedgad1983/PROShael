const http = require('http');

function testLimit(limit) {
  return new Promise((resolve, reject) => {
    const options = {
      hostname: 'localhost',
      port: 3001,
      path: `/api/members?limit=${limit}&page=1`,
      method: 'GET',
      headers: {
        'Authorization': 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6IjU3YTVhNjVjLTJlOWQtNDczNS1iODViLTNkMWJhNGI5YzA3YyIsInJvbGVzIjpbImFkbWluIl0sImlhdCI6MTczMjM1NzcwMCwiZXhwIjoxNzMyOTYyNTAwfQ.W0OQp4W6r0ktRJvJy9CyTaWu5hLgciwEJxZNRLlCMxk',
        'Content-Type': 'application/json'
      }
    };

    const req = http.request(options, (res) => {
      let data = '';

      res.on('data', (chunk) => {
        data += chunk;
      });

      res.on('end', () => {
        try {
          const jsonData = JSON.parse(data);
          console.log(`Limit ${limit} - Returned: ${jsonData.data?.length || 0} members, Total: ${jsonData.pagination?.total || 0}`);
          resolve(jsonData);
        } catch (error) {
          console.error(`Error parsing response for limit ${limit}:`, error.message);
          reject(error);
        }
      });
    });

    req.on('error', (error) => {
      console.error(`Error with limit ${limit}:`, error.message);
      reject(error);
    });

    req.end();
  });
}

async function testAPILimit() {
  console.log('Testing API with different limits...\n');

  try {
    await testLimit(50);
    await testLimit(100);
    await testLimit(200);
    await testLimit(347);
    await testLimit(500);
    await testLimit(1000);
  } catch (error) {
    console.error('Test failed:', error.message);
  }

  console.log('\n=== Summary ===');
  console.log('If all tests return only 100 members despite different limits,');
  console.log('there is a hardcoded limit somewhere in the backend or Supabase.');
}

testAPILimit();