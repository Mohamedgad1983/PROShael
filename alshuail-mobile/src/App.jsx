import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom'
import { useState, useEffect, createContext, useContext } from 'react'
import { DataCacheProvider } from './contexts/DataCacheContext'
import Login from './pages/Login'
import Dashboard from './pages/Dashboard'
import FamilyTree from './pages/FamilyTree'
import BranchDetail from './pages/BranchDetail'
import Notifications from './pages/Notifications'
import Profile from './pages/Profile'
import Payments from './pages/Payments'
import MemberCard from './pages/MemberCard'
import Initiatives from './pages/Initiatives'
import News from './pages/News'
import Settings from './pages/Settings'
import ProfileWizard from './pages/ProfileWizard'
import SubscriptionDetail from './pages/SubscriptionDetail'
import Statement from './pages/Statement'
import Events from './pages/Events'

// New Payment System Pages
import PaymentCenter from './pages/PaymentCenter'
import SubscriptionPayment from './pages/SubscriptionPayment'
import DiyaPayment from './pages/DiyaPayment'
import InitiativePayment from './pages/InitiativePayment'
import BankTransferPayment from './pages/BankTransferPayment'
import PaymentHistory from './pages/PaymentHistory'
import PrivacyPolicy from './pages/PrivacyPolicy'

// Auth Context
export const AuthContext = createContext(null)

export const useAuth = () => useContext(AuthContext)

// Protected Route Component
const ProtectedRoute = ({ children }) => {
  const { user, loading } = useAuth()
  
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center gradient-primary">
        <div className="spinner"></div>
      </div>
    )
  }
  
  if (!user) {
    return <Navigate to="/login" replace />
  }
  
  return children
}

function App() {
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    // Check if user is logged in
    const savedUser = localStorage.getItem('alshuail_user')
    if (savedUser) {
      try {
        setUser(JSON.parse(savedUser))
      } catch (e) {
        localStorage.removeItem('alshuail_user')
      }
    }
    setLoading(false)
  }, [])

  const login = (userData) => {
    setUser(userData)
    localStorage.setItem('alshuail_user', JSON.stringify(userData))
  }

  const updateUser = (newData) => {
    const updatedUser = { ...user, ...newData }
    setUser(updatedUser)
    localStorage.setItem('alshuail_user', JSON.stringify(updatedUser))
  }

  const logout = () => {
    setUser(null)
    localStorage.removeItem('alshuail_user')
    localStorage.removeItem('alshuail_token')
  }

  return (
    <AuthContext.Provider value={{ user, login, logout, updateUser, loading }}>
      <DataCacheProvider>
        <Router>
          <div className="min-h-screen bg-gray-50 font-cairo">
            <Routes>
              {/* Public Routes */}
              <Route path="/privacy" element={<PrivacyPolicy />} />
              <Route path="/login" element={<Login />} />
              
              {/* Protected Routes */}
              <Route path="/" element={
                <ProtectedRoute>
                  <Dashboard />
                </ProtectedRoute>
              } />
              <Route path="/dashboard" element={
                <ProtectedRoute>
                  <Dashboard />
                </ProtectedRoute>
              } />
              <Route path="/family-tree" element={
                <ProtectedRoute>
                  <FamilyTree />
                </ProtectedRoute>
              } />
              <Route path="/family-tree/:branchId" element={
                <ProtectedRoute>
                  <BranchDetail />
                </ProtectedRoute>
              } />
              <Route path="/notifications" element={
                <ProtectedRoute>
                  <Notifications />
                </ProtectedRoute>
              } />
              <Route path="/profile" element={
                <ProtectedRoute>
                  <Profile />
                </ProtectedRoute>
              } />
              
              {/* Old Payments Route (kept for compatibility) */}
              <Route path="/payments" element={
                <ProtectedRoute>
                  <Payments />
                </ProtectedRoute>
              } />
              <Route path="/subscriptions/:year" element={
                <ProtectedRoute>
                  <SubscriptionDetail />
                </ProtectedRoute>
              } />

              {/* NEW: Payment Center Routes */}
              <Route path="/payment-center" element={
                <ProtectedRoute>
                  <PaymentCenter />
                </ProtectedRoute>
              } />
              <Route path="/payment/subscription" element={
                <ProtectedRoute>
                  <SubscriptionPayment />
                </ProtectedRoute>
              } />
              <Route path="/payment/diya" element={
                <ProtectedRoute>
                  <DiyaPayment />
                </ProtectedRoute>
              } />
              <Route path="/payment/initiative" element={
                <ProtectedRoute>
                  <InitiativePayment />
                </ProtectedRoute>
              } />
              <Route path="/payment/bank-transfer" element={
                <ProtectedRoute>
                  <BankTransferPayment />
                </ProtectedRoute>
              } />
              <Route path="/payments/history" element={
                <ProtectedRoute>
                  <PaymentHistory />
                </ProtectedRoute>
              } />

              {/* Events & Occasions */}
              <Route path="/events" element={
                <ProtectedRoute>
                  <Events />
                </ProtectedRoute>
              } />

              {/* Other Routes */}
              <Route path="/member-card" element={
                <ProtectedRoute>
                  <MemberCard />
                </ProtectedRoute>
              } />
              <Route path="/initiatives" element={
                <ProtectedRoute>
                  <Initiatives />
                </ProtectedRoute>
              } />
              <Route path="/news" element={
                <ProtectedRoute>
                  <News />
                </ProtectedRoute>
              } />
              <Route path="/settings" element={
                <ProtectedRoute>
                  <Settings />
                </ProtectedRoute>
              } />
              <Route path="/profile-wizard" element={
                <ProtectedRoute>
                  <ProfileWizard />
                </ProtectedRoute>
              } />
              <Route path="/statement" element={
                <ProtectedRoute>
                  <Statement />
                </ProtectedRoute>
              } />

              {/* Catch all - redirect to dashboard */}
              <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
          </div>
        </Router>
      </DataCacheProvider>
    </AuthContext.Provider>
  )
}

export default App
