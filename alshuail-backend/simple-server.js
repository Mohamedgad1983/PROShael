import express from 'express';
import cors from 'cors';
import { getCrisisDashboard } from './src/controllers/crisisController.js';

const app = express();
const PORT = 5001;

// CORS middleware
app.use(cors({
  origin: ['http://localhost:3002', 'http://localhost:3003'],
  credentials: true
}));

app.use(express.json({ limit: '50mb' }));

// Crisis dashboard route
app.get('/api/crisis/dashboard', getCrisisDashboard);

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'OK', timestamp: new Date().toISOString() });
});

app.listen(PORT, () => {
  console.log(`🚀 Simple Crisis API Server running on http://localhost:${PORT}`);
  console.log(`📊 Crisis Dashboard API: http://localhost:${PORT}/api/crisis/dashboard`);
});