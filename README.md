# Al-Shuail Family Admin Dashboard

A premium, Apple-inspired admin system with member management, financial tracking, and document handling capabilities. Features glassmorphism design, sophisticated animations, and full RTL support for Arabic interface.

## Features

- **Member Management**: Complete CRUD operations with premium UI
- **Financial Tracking**: Comprehensive payment and subscription management
- **Document Management**: Secure document storage and retrieval
- **Arabic RTL Support**: Full right-to-left layout support
- **Premium Design**: Apple-inspired glassmorphism with sophisticated animations

## Tech Stack

### Frontend
- React 19.1.1 with TypeScript
- Tailwind CSS v4
- Apple-inspired design system

### Backend
- Node.js with ES Modules
- Express.js
- Supabase (PostgreSQL)
- JWT Authentication

## Getting Started

### Prerequisites
- Node.js 18+
- npm or yarn
- Supabase account

### Installation

1. Clone the repository:
```bash
git clone https://github.com/Mohamedgad1983/PROShael.git
cd PROShael
```

2. Install backend dependencies:
```bash
cd alshuail-backend
npm install
```

3. Install frontend dependencies:
```bash
cd ../alshuail-admin-arabic
npm install
```

4. Set up environment variables:

Backend (.env):
```
PORT=3001
SUPABASE_URL=your_supabase_url
SUPABASE_KEY=your_supabase_key
JWT_SECRET=your_jwt_secret
```

Frontend (.env):
```
REACT_APP_API_URL=http://localhost:3001
PORT=3002
```

### Running the Application

1. Start the backend server:
```bash
cd alshuail-backend
npm run dev
```

2. Start the frontend:
```bash
cd alshuail-admin-arabic
npm start
```

The application will be available at http://localhost:3002

## Project Structure

```
PROShael/
├── alshuail-admin-arabic/    # Frontend React application
│   ├── src/
│   │   ├── components/       # UI components
│   │   ├── services/         # API services
│   │   └── styles/           # CSS and design system
│   └── public/
├── alshuail-backend/         # Backend Node.js application
│   ├── src/
│   │   ├── controllers/     # Request handlers
│   │   ├── routes/          # API routes
│   │   ├── services/        # Business logic
│   │   ├── middleware/      # Auth & validation
│   │   └── config/          # Configuration
│   └── package.json
└── CLAUDE.md                # AI development guide
```

## Documentation

See `CLAUDE.md` for detailed development guidelines and architecture documentation.

## License

Private repository - All rights reserved