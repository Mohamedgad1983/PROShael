import { useState, useEffect } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { ArrowRight, Users, Phone, User } from 'lucide-react'
import BottomNav from '../components/BottomNav'
import api from '../utils/api'

// Branch data mapping
const branchesData = {
  'dfff73f9-a476-43fb-9c8d-4ba2f580070a': { name: 'رشود', count: 173 },
  '54b7118b-ce86-4c66-8e55-95a5357dbf34': { name: 'رشيد', count: 34 },
  'c3ab2d1b-fd53-4a6c-8ef8-18efa2d5dada': { name: 'الدغيش', count: 32 },
  '2da3bcc6-9a5c-4bbf-9c81-99ca4d80a204': { name: 'العيد', count: 28 },
  '498b3b4d-9249-4dff-b136-f21b9effdffb': { name: 'العقاب', count: 25 },
  'f82b5bc7-17b4-4db0-9292-7b2335637b2f': { name: 'الاحيمر', count: 21 },
  'b1084893-b715-4af0-930b-386deb96fbfb': { name: 'الرشيد', count: 15 },
  'a236726c-5351-4054-8af1-96ccccc0bb1b': { name: 'الشبيعان', count: 5 },
  'e8a0ee25-daf1-4599-82b2-38e8778e9f29': { name: 'المسعود', count: 4 },
  'e014043d-fa23-428c-a967-d6cd973808b8': { name: 'الشامخ', count: 10 },
}

const BranchDetail = () => {
  const navigate = useNavigate()
  const { branchId } = useParams()
  const [loading, setLoading] = useState(true)
  const [members, setMembers] = useState([])
  const [error, setError] = useState(null)

  const branch = branchesData[branchId] || { name: 'غير معروف', count: 0 }

  useEffect(() => {
    const fetchMembers = async () => {
      try {
        setLoading(true)
        const response = await api.get(`/family-tree/branch/${branchId}/members`)
        if (response.data && response.data.members) {
          setMembers(response.data.members)
        }
      } catch (err) {
        console.error('Error fetching members:', err)
        setError('تعذر تحميل أعضاء الفخذ')
      } finally {
        setLoading(false)
      }
    }

    if (branchId) {
      fetchMembers()
    }
  }, [branchId])

  return (
    <div className="min-h-screen bg-gray-50 pb-24">
      {/* Header */}
      <div className="page-header-with-back">
        <div
          className="back-btn"
          onClick={() => navigate('/family-tree')}
        >
          <ArrowRight size={20} className="text-white" />
        </div>
        <h2 className="text-xl font-bold">فخذ {branch.name}</h2>
      </div>

      {/* Content */}
      <div className="page-content">
        {/* Stats */}
        <div className="stat-card mb-5 animate-fadeIn">
          <div className="flex items-center justify-between">
            <div>
              <div className="stat-value">{members.length || branch.count}</div>
              <div className="stat-label">عدد الأعضاء</div>
            </div>
            <Users size={40} className="text-primary-500 opacity-50" />
          </div>
        </div>

        {/* Members List */}
        {loading ? (
          <div className="text-center py-10">
            <div className="animate-spin w-8 h-8 border-4 border-primary-500 border-t-transparent rounded-full mx-auto mb-3"></div>
            <p className="text-gray-500">جاري تحميل الأعضاء...</p>
          </div>
        ) : error ? (
          <div className="text-center py-10 text-gray-400">
            <Users size={48} className="mx-auto mb-3 opacity-50" />
            <p>{error}</p>
            <p className="text-sm mt-2">عدد الأعضاء المسجلين: {branch.count}</p>
          </div>
        ) : members.length === 0 ? (
          <div className="text-center py-10 text-gray-400">
            <Users size={48} className="mx-auto mb-3 opacity-50" />
            <p>لا يوجد أعضاء مسجلين</p>
            <p className="text-sm mt-2">عدد الأعضاء: {branch.count}</p>
          </div>
        ) : (
          <div className="space-y-3">
            {members.map((member, index) => (
              <div
                key={member.id}
                className="section-card animate-fadeIn"
                style={{ animationDelay: `${index * 0.05}s` }}
              >
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-primary-100 flex items-center justify-center">
                    <User size={20} className="text-primary-600" />
                  </div>
                  <div className="flex-1">
                    <p className="font-medium text-gray-800">{member.full_name_ar || member.name}</p>
                    <p className="text-sm text-gray-500">
                      {member.membership_number && `رقم العضوية: ${member.membership_number}`}
                    </p>
                  </div>
                  {member.phone && (
                    <a
                      href={`tel:${member.phone}`}
                      className="w-9 h-9 rounded-full bg-green-100 flex items-center justify-center"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <Phone size={16} className="text-green-600" />
                    </a>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Bottom Navigation */}
      <BottomNav />
    </div>
  )
}

export default BranchDetail
