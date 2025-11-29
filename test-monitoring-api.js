const http = require('http');

const token = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6IjU3YTVhNjVjLTJlOWQtNDczNS1iODViLTNkMWJhNGI5YzA3YyIsInJvbGVzIjpbImFkbWluIl0sImlhdCI6MTczMjM1NzcwMCwiZXhwIjoxNzMyOTYyNTAwfQ.W0OQp4W6r0ktRJvJy9CyTaWu5hLgciwEJxZNRLlCMxk';

function testMonitoringEndpoint() {
  return new Promise((resolve, reject) => {
    const options = {
      hostname: 'localhost',
      port: 3001,
      path: '/api/members/monitoring/all',
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${token}`,
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
          console.log('=== Monitoring Endpoint Test ===');
          console.log('Success:', jsonData.success);
          console.log('Total members returned:', jsonData.data?.length || 0);
          console.log('Total field:', jsonData.total);

          if (jsonData.data && jsonData.data.length > 0) {
            console.log('First 3 members:', jsonData.data.slice(0, 3).map(m => m.membership_number || m.id));
            console.log('Last 3 members:', jsonData.data.slice(-3).map(m => m.membership_number || m.id));
          }

          resolve(jsonData);
        } catch (error) {
          console.error('Error parsing response:', error.message);
          console.log('Raw response:', data);
          reject(error);
        }
      });
    });

    req.on('error', (error) => {
      console.error('Request error:', error.message);
      reject(error);
    });

    req.end();
  });
}

testMonitoringEndpoint();