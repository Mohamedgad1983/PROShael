import React, { useState, useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import './ActivitiesManager.css';

const ActivitiesManager = () => {
  const { user, token } = useAuth();
  const [activities, setActivities] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [editingActivity, setEditingActivity] = useState(null);

  useEffect(() => {
    loadActivities();
  }, []);

  const loadActivities = async () => {
    try {
      setLoading(true);
      const response = await fetch(`${process.env.REACT_APP_API_URL}/api/activities`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      const data = await response.json();
      if (data.status === 'success') {
        setActivities(data.data.activities || []);
      } else {
        setError(data.message_ar || 'خطأ في تحميل الأنشطة');
      }
    } catch (error) {
      setError('خطأ في الاتصال بالخادم');
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteActivity = async (activityId) => {
    if (!window.confirm('هل أنت متأكد من حذف هذا النشاط؟')) return;

    try {
      const response = await fetch(`${process.env.REACT_APP_API_URL}/api/activities/${activityId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      const data = await response.json();
      if (data.status === 'success') {
        loadActivities(); // Refresh list
      } else {
        setError(data.message_ar || 'خطأ في حذف النشاط');
      }
    } catch (error) {
      setError('خطأ في حذف النشاط');
    }
  };

  const formatDate = (dateString) => {
    if (!dateString) return 'غير محدد';
    return new Date(dateString).toLocaleDateString('ar-SA');
  };

  const getStatusBadge = (status) => {
    const statusConfig = {
      published: { label: 'منشور', class: 'status-published' },
      upcoming: { label: 'قادم', class: 'status-upcoming' },
      ongoing: { label: 'جاري', class: 'status-ongoing' },
      completed: { label: 'مكتمل', class: 'status-completed' },
      cancelled: { label: 'ملغي', class: 'status-cancelled' }
    };

    const config = statusConfig[status] || { label: status, class: 'status-default' };
    return <span className={`status-badge ${config.class}`}>{config.label}</span>;
  };

  if (loading) {
    return (
      <div className="activities-manager" dir="rtl">
        <div className="loading-container">
          <div className="spinner"></div>
          <span>جاري تحميل الأنشطة...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="activities-manager" dir="rtl">
      <div className="activities-header">
        <h2>إدارة الأنشطة</h2>
        <p>نظام إدارة الأنشطة العائلية والخيرية</p>
        <button
          className="btn-primary"
          onClick={() => setShowCreateForm(true)}
        >
          إضافة نشاط جديد
        </button>
      </div>

      {error && (
        <div className="error-message">
          {error}
        </div>
      )}

      <div className="activities-grid">
        {activities.length === 0 ? (
          <div className="empty-state">
            <h3>لا توجد أنشطة</h3>
            <p>ابدأ بإضافة نشاط جديد لعائلة الشعيل</p>
            <button
              className="btn-primary"
              onClick={() => setShowCreateForm(true)}
            >
              إضافة أول نشاط
            </button>
          </div>
        ) : (
          activities.map(activity => (
            <div key={activity.id} className="activity-card">
              <div className="activity-header">
                <h3>{activity.title_ar}</h3>
                {getStatusBadge(activity.status)}
              </div>

              <div className="activity-details">
                <p className="activity-description">{activity.description_ar}</p>

                <div className="activity-meta">
                  {activity.event_date && (
                    <div className="meta-item">
                      <strong>التاريخ:</strong> {formatDate(activity.event_date)}
                    </div>
                  )}
                  {activity.event_location_ar && (
                    <div className="meta-item">
                      <strong>المكان:</strong> {activity.event_location_ar}
                    </div>
                  )}
                  {activity.max_attendees && (
                    <div className="meta-item">
                      <strong>المشاركين:</strong> {activity.current_participants || 0} / {activity.max_attendees}
                    </div>
                  )}
                  {activity.target_amount && (
                    <div className="meta-item">
                      <strong>الهدف المالي:</strong> {activity.target_amount} ريال
                    </div>
                  )}
                  {activity.main_categories && (
                    <div className="meta-item">
                      <strong>الفئة:</strong> {activity.main_categories.name_ar}
                    </div>
                  )}
                </div>
              </div>

              <div className="activity-actions">
                <button
                  className="btn-secondary"
                  onClick={() => setEditingActivity(activity)}
                >
                  تعديل
                </button>
                <button
                  className="btn-danger"
                  onClick={() => handleDeleteActivity(activity.id)}
                >
                  حذف
                </button>
              </div>
            </div>
          ))
        )}
      </div>

      {showCreateForm && (
        <ActivityForm
          onClose={() => setShowCreateForm(false)}
          onSave={() => {
            setShowCreateForm(false);
            loadActivities();
          }}
          token={token}
        />
      )}

      {editingActivity && (
        <ActivityForm
          activity={editingActivity}
          onClose={() => setEditingActivity(null)}
          onSave={() => {
            setEditingActivity(null);
            loadActivities();
          }}
          token={token}
        />
      )}
    </div>
  );
};

// Activity Form Component for Create/Edit
const ActivityForm = ({ activity, onClose, onSave, token }) => {
  const [formData, setFormData] = useState({
    title_ar: activity?.title_ar || '',
    title_en: activity?.title_en || '',
    description_ar: activity?.description_ar || '',
    description_en: activity?.description_en || '',
    main_category_id: activity?.main_category_id || '',
    event_date: activity?.event_date || '',
    event_time: activity?.event_time || '',
    event_location_ar: activity?.event_location_ar || '',
    event_location_en: activity?.event_location_en || '',
    max_attendees: activity?.max_attendees || '',
    target_amount: activity?.target_amount || '',
    min_contribution: activity?.min_contribution || ''
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const url = activity
        ? `${process.env.REACT_APP_API_URL}/api/activities/${activity.id}`
        : `${process.env.REACT_APP_API_URL}/api/activities`;

      const method = activity ? 'PUT' : 'POST';

      // Clean the form data - remove empty strings and convert numbers
      const cleanData = {};
      Object.keys(formData).forEach(key => {
        if (formData[key] !== '') {
          if (key === 'max_attendees' || key === 'target_amount' || key === 'min_contribution') {
            cleanData[key] = parseInt(formData[key]) || 0;
          } else {
            cleanData[key] = formData[key];
          }
        }
      });

      const response = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(cleanData)
      });

      const data = await response.json();
      if (data.status === 'success') {
        onSave();
      } else {
        setError(data.message_ar || 'خطأ في حفظ النشاط');
      }
    } catch (error) {
      setError('خطأ في الاتصال بالخادم');
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  return (
    <div className="modal-overlay">
      <div className="modal-content">
        <div className="modal-header">
          <h3>{activity ? 'تعديل النشاط' : 'إضافة نشاط جديد'}</h3>
          <button className="modal-close" onClick={onClose}>×</button>
        </div>

        <form onSubmit={handleSubmit} className="activity-form">
          <div className="form-row">
            <div className="form-group">
              <label>العنوان بالعربية *</label>
              <input
                type="text"
                name="title_ar"
                value={formData.title_ar}
                onChange={handleInputChange}
                required
              />
            </div>
            <div className="form-group">
              <label>العنوان بالإنجليزية</label>
              <input
                type="text"
                name="title_en"
                value={formData.title_en}
                onChange={handleInputChange}
              />
            </div>
          </div>

          <div className="form-group">
            <label>الوصف بالعربية *</label>
            <textarea
              name="description_ar"
              value={formData.description_ar}
              onChange={handleInputChange}
              rows="3"
              required
            ></textarea>
          </div>

          <div className="form-row">
            <div className="form-group">
              <label>تاريخ الحدث</label>
              <input
                type="date"
                name="event_date"
                value={formData.event_date}
                onChange={handleInputChange}
              />
            </div>
            <div className="form-group">
              <label>وقت الحدث</label>
              <input
                type="time"
                name="event_time"
                value={formData.event_time}
                onChange={handleInputChange}
              />
            </div>
          </div>

          <div className="form-row">
            <div className="form-group">
              <label>المكان (عربي)</label>
              <input
                type="text"
                name="event_location_ar"
                value={formData.event_location_ar}
                onChange={handleInputChange}
              />
            </div>
            <div className="form-group">
              <label>المكان (إنجليزي)</label>
              <input
                type="text"
                name="event_location_en"
                value={formData.event_location_en}
                onChange={handleInputChange}
              />
            </div>
          </div>

          <div className="form-row">
            <div className="form-group">
              <label>العدد الأقصى للمشاركين</label>
              <input
                type="number"
                name="max_attendees"
                value={formData.max_attendees}
                onChange={handleInputChange}
                min="0"
              />
            </div>
            <div className="form-group">
              <label>المبلغ المستهدف (ريال)</label>
              <input
                type="number"
                name="target_amount"
                value={formData.target_amount}
                onChange={handleInputChange}
                min="0"
                step="0.01"
              />
            </div>
          </div>

          {error && (
            <div className="error-message">
              {error}
            </div>
          )}

          <div className="form-actions">
            <button type="button" onClick={onClose} className="btn-secondary">
              إلغاء
            </button>
            <button type="submit" disabled={loading} className="btn-primary">
              {loading ? 'جاري الحفظ...' : (activity ? 'تحديث' : 'إضافة')}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default ActivitiesManager;