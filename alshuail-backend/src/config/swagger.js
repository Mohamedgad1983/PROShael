import swaggerJsdoc from 'swagger-jsdoc';

const options = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'Al-Shuail Family Fund API',
      version: '2.0.0',
      description: 'واجهة برمجة تطبيقات صندوق عائلة الشعيل - API Documentation',
      contact: {
        name: 'Support',
        email: 'support@alshailfund.com',
        url: 'https://alshailfund.com'
      }
    },
    servers: [
      { url: 'https://api.alshailfund.com', description: 'Production' },
      { url: 'http://localhost:5001', description: 'Development' }
    ],
    tags: [
      { name: 'Health', description: 'System health checks' },
      { name: 'Auth', description: 'Authentication and login' },
      { name: 'Members', description: 'Member management' },
      { name: 'Subscriptions', description: 'Subscriptions' },
      { name: 'Payments', description: 'Payments' },
      { name: 'Dashboard', description: 'Dashboard stats' },
      { name: 'Storage', description: 'File management' }
    ],
    components: {
      securitySchemes: {
        bearerAuth: {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT'
        }
      }
    },
    security: [{ bearerAuth: [] }]
  },
  apis: ['./src/routes/*.js', './server.js']
};

export default swaggerJsdoc(options);
