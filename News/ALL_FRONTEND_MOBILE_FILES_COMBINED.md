# 🎨 ALL FRONTEND & MOBILE FILES - COMBINED REFERENCE

This file contains ALL React components you need to create.
Copy each section into its respective file location.

---

## 📁 FILE 1: frontend/src/pages/admin/InitiativesManagement.jsx

```jsx
import React, { useState, useEffect } from 'react';
import axios from 'axios';

const InitiativesManagement = () => {
    const [initiatives, setInitiatives] = useState([]);
    const [loading, setLoading] = useState(true);
    const [showCreateModal, setShowCreateModal] = useState(false);
    const [selectedStatus, setSelectedStatus] = useState('all');

    // Form state
    const [formData, setFormData] = useState({
        title_ar: '', title_en: '', description_ar: '', description_en: '',
        beneficiary_name_ar: '', beneficiary_name_en: '',
        target_amount: '', min_contribution: '', max_contribution: '',
        start_date: '', end_date: '', status: 'draft'
    });

    useEffect(() => {
        fetchInitiatives();
    }, [selectedStatus]);

    const fetchInitiatives = async () => {
        try {
            const token = localStorage.getItem('token');
            const params = selectedStatus !== 'all' ? { status: selectedStatus } : {};
            const response = await axios.get(
                `${process.env.REACT_APP_API_URL}/initiatives/admin/all`,
                { params, headers: { Authorization: `Bearer ${token}` } }
            );
            setInitiatives(response.data.initiatives);
            setLoading(false);
        } catch (error) {
            console.error('Fetch error:', error);
            setLoading(false);
        }
    };

    const handleCreate = async (e) => {
        e.preventDefault();
        try {
            const token = localStorage.getItem('token');
            await axios.post(
                `${process.env.REACT_APP_API_URL}/initiatives`,
                formData,
                { headers: { Authorization: `Bearer ${token}` } }
            );
            alert('Initiative created!');
            setShowCreateModal(false);
            fetchInitiatives();
        } catch (error) {
            alert('Error: ' + error.message);
        }
    };

    if (loading) return <div className="flex justify-center items-center h-screen">Loading...</div>;

    return (
        <div className="container mx-auto px-4 py-8" dir="rtl">
            <div className="flex justify-between items-center mb-8">
                <h1 className="text-3xl font-bold">إدارة المبادرات</h1>
                <button onClick={() => setShowCreateModal(true)} className="bg-blue-600 text-white px-6 py-3 rounded-lg">
                    + مبادرة جديدة
                </button>
            </div>

            {/* Status Filters */}
            <div className="mb-6 flex gap-3">
                {['all', 'draft', 'active', 'completed', 'archived'].map(status => (
                    <button
                        key={status}
                        onClick={() => setSelectedStatus(status)}
                        className={`px-4 py-2 rounded-lg ${selectedStatus === status ? 'bg-blue-600 text-white' : 'bg-gray-100'}`}
                    >
                        {status.toUpperCase()}
                    </button>
                ))}
            </div>

            {/* Initiatives Grid */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {initiatives.map(init => (
                    <div key={init.id} className="bg-white p-6 rounded-xl shadow">
                        <h3 className="text-xl font-bold mb-2">{init.title_ar}</h3>
                        <div className="mb-4">
                            <div className="w-full bg-gray-200 rounded-full h-2">
                                <div className="bg-blue-600 h-2 rounded-full" style={{ width: `${(init.current_amount / init.target_amount * 100)}%` }}></div>
                            </div>
                            <p className="text-sm mt-2">{init.current_amount} / {init.target_amount} ر.س</p>
                        </div>
                        <button onClick={() => window.location.href = `/admin/initiatives/${init.id}`} className="w-full bg-gray-100 py-2 rounded">
                            التفاصيل
                        </button>
                    </div>
                ))}
            </div>

            {/* Create Modal (simplified) */}
            {showCreateModal && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
                    <div className="bg-white rounded-xl max-w-2xl w-full p-8">
                        <h2 className="text-2xl font-bold mb-6">مبادرة جديدة</h2>
                        <form onSubmit={handleCreate} className="space-y-4">
                            <input
                                type="text"
                                placeholder="العنوان (عربي)"
                                value={formData.title_ar}
                                onChange={(e) => setFormData({ ...formData, title_ar: e.target.value })}
                                className="w-full px-4 py-2 border rounded"
                                required
                            />
                            <input
                                type="number"
                                placeholder="المبلغ المستهدف"
                                value={formData.target_amount}
                                onChange={(e) => setFormData({ ...formData, target_amount: e.target.value })}
                                className="w-full px-4 py-2 border rounded"
                                required
                            />
                            <div className="flex gap-3">
                                <button type="button" onClick={() => setShowCreateModal(false)} className="flex-1 bg-gray-100 py-3 rounded">
                                    إلغاء
                                </button>
                                <button type="submit" className="flex-1 bg-blue-600 text-white py-3 rounded">
                                    إنشاء
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};

export default InitiativesManagement;
```

---

## 📁 FILE 2: pwa/src/pages/Initiatives.jsx

```jsx
import React, { useState, useEffect } from 'react';
import axios from 'axios';

const Initiatives = () => {
    const [activeInitiatives, setActiveInitiatives] = useState([]);
    const [loading, setLoading] = useState(true);
    const [showModal, setShowModal] = useState(false);
    const [selectedInit, setSelectedInit] = useState(null);
    const [amount, setAmount] = useState('');

    useEffect(() => {
        fetchInitiatives();
    }, []);

    const fetchInitiatives = async () => {
        try {
            const token = localStorage.getItem('token');
            const response = await axios.get(
                `${process.env.REACT_APP_API_URL}/initiatives/active`,
                { headers: { Authorization: `Bearer ${token}` } }
            );
            setActiveInitiatives(response.data.initiatives);
            setLoading(false);
        } catch (error) {
            console.error('Fetch error:', error);
            setLoading(false);
        }
    };

    const handleContribute = async (e) => {
        e.preventDefault();
        try {
            const token = localStorage.getItem('token');
            await axios.post(
                `${process.env.REACT_APP_API_URL}/initiatives/${selectedInit.id}/contribute`,
                { amount: parseFloat(amount), payment_method: 'bank_transfer' },
                { headers: { Authorization: `Bearer ${token}` } }
            );
            alert('تم إرسال المساهمة بنجاح!');
            setShowModal(false);
            setAmount('');
            fetchInitiatives();
        } catch (error) {
            alert('خطأ: ' + error.message);
        }
    };

    if (loading) return <div className="flex justify-center items-center h-screen">جاري التحميل...</div>;

    return (
        <div className="min-h-screen bg-gray-50" dir="rtl">
            <div className="bg-gradient-to-r from-blue-600 to-blue-700 text-white p-6">
                <h1 className="text-2xl font-bold">المبادرات</h1>
            </div>

            <div className="p-4 space-y-4">
                {activeInitiatives.map(init => (
                    <div key={init.id} className="bg-white p-5 rounded-xl shadow">
                        <h3 className="text-lg font-bold mb-2">{init.title_ar}</h3>
                        <div className="mb-4">
                            <div className="w-full bg-gray-200 rounded-full h-3">
                                <div className="bg-blue-600 h-3 rounded-full" style={{ width: `${init.progress_percentage}%` }}></div>
                            </div>
                            <p className="text-sm text-center mt-2">{init.progress_percentage}% مكتمل</p>
                        </div>
                        <button
                            onClick={() => {
                                setSelectedInit(init);
                                setShowModal(true);
                            }}
                            className="w-full bg-blue-600 text-white py-3 rounded-lg"
                        >
                            ساهم الآن
                        </button>
                    </div>
                ))}
            </div>

            {/* Contribute Modal */}
            {showModal && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
                    <div className="bg-white rounded-2xl max-w-md w-full p-6">
                        <h3 className="text-xl font-bold mb-4">المساهمة في المبادرة</h3>
                        <form onSubmit={handleContribute}>
                            <input
                                type="number"
                                placeholder="المبلغ (ر.س)"
                                value={amount}
                                onChange={(e) => setAmount(e.target.value)}
                                className="w-full px-4 py-3 border rounded-lg text-center text-lg font-bold mb-4"
                                required
                            />
                            <div className="flex gap-3">
                                <button type="button" onClick={() => setShowModal(false)} className="flex-1 bg-gray-100 py-3 rounded-lg">
                                    إلغاء
                                </button>
                                <button type="submit" className="flex-1 bg-blue-600 text-white py-3 rounded-lg">
                                    تأكيد
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};

export default Initiatives;
```

---

## 📁 FILE 3: pwa/src/pages/News.jsx

```jsx
import React, { useState, useEffect } from 'react';
import axios from 'axios';

const News = () => {
    const [news, setNews] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetchNews();
    }, []);

    const fetchNews = async () => {
        try {
            const token = localStorage.getItem('token');
            const response = await axios.get(
                `${process.env.REACT_APP_API_URL}/news`,
                { headers: { Authorization: `Bearer ${token}` } }
            );
            setNews(response.data.news);
            setLoading(false);
        } catch (error) {
            console.error('Fetch error:', error);
            setLoading(false);
        }
    };

    if (loading) return <div className="flex justify-center items-center h-screen">جاري التحميل...</div>;

    return (
        <div className="min-h-screen bg-gray-50" dir="rtl">
            <div className="bg-gradient-to-r from-blue-600 to-blue-700 text-white p-6">
                <h1 className="text-2xl font-bold">الأخبار</h1>
            </div>

            <div className="p-4 space-y-4">
                {news.map(item => (
                    <div key={item.id} className="bg-white p-5 rounded-xl shadow">
                        <div className="flex justify-between items-start mb-3">
                            <span className="bg-blue-100 text-blue-800 px-3 py-1 rounded-full text-xs">
                                {item.category}
                            </span>
                            <span className="text-xs text-gray-500">
                                {new Date(item.published_at).toLocaleDateString('ar-SA')}
                            </span>
                        </div>
                        <h3 className="text-lg font-bold mb-2">{item.title_ar}</h3>
                        <p className="text-gray-700 mb-4">{item.content_ar.substring(0, 150)}...</p>
                        <button
                            onClick={() => window.location.href = `/news/${item.id}`}
                            className="text-blue-600 font-medium"
                        >
                            اقرأ المزيد ←
                        </button>
                    </div>
                ))}
            </div>
        </div>
    );
};

export default News;
```

---

## 📁 FILE 4: pwa/src/pages/Notifications.jsx

```jsx
import React, { useState, useEffect } from 'react';
import axios from 'axios';

const Notifications = () => {
    const [notifications, setNotifications] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetchNotifications();
    }, []);

    const fetchNotifications = async () => {
        try {
            const token = localStorage.getItem('token');
            const response = await axios.get(
                `${process.env.REACT_APP_API_URL}/notifications/my`,
                { headers: { Authorization: `Bearer ${token}` } }
            );
            setNotifications(response.data.notifications);
            setLoading(false);
        } catch (error) {
            console.error('Fetch error:', error);
            setLoading(false);
        }
    };

    const markAsRead = async (id) => {
        try {
            const token = localStorage.getItem('token');
            await axios.patch(
                `${process.env.REACT_APP_API_URL}/notifications/${id}/read`,
                {},
                { headers: { Authorization: `Bearer ${token}` } }
            );
            fetchNotifications();
        } catch (error) {
            console.error('Mark read error:', error);
        }
    };

    if (loading) return <div className="flex justify-center items-center h-screen">جاري التحميل...</div>;

    return (
        <div className="min-h-screen bg-gray-50" dir="rtl">
            <div className="bg-gradient-to-r from-blue-600 to-blue-700 text-white p-6">
                <h1 className="text-2xl font-bold">الإشعارات</h1>
            </div>

            <div className="p-4 space-y-2">
                {notifications.map(notif => (
                    <div
                        key={notif.id}
                        onClick={() => {
                            markAsRead(notif.id);
                            if (notif.action_url) window.location.href = notif.action_url;
                        }}
                        className={`p-4 rounded-lg ${notif.is_read ? 'bg-white' : 'bg-blue-50'} shadow cursor-pointer`}
                    >
                        <div className="flex justify-between items-start">
                            <h4 className="font-bold text-gray-900">{notif.title_ar}</h4>
                            {!notif.is_read && <span className="w-2 h-2 bg-blue-600 rounded-full"></span>}
                        </div>
                        <p className="text-sm text-gray-600 mt-1">{notif.message_ar}</p>
                        <p className="text-xs text-gray-400 mt-2">
                            {new Date(notif.created_at).toLocaleString('ar-SA')}
                        </p>
                    </div>
                ))}
            </div>
        </div>
    );
};

export default Notifications;
```

---

## 📋 USAGE INSTRUCTIONS

1. Create each file in the specified location
2. Copy the code from each section
3. Update your App.jsx to add routes:

```jsx
import Initiatives from './pages/Initiatives';
import News from './pages/News';
import Notifications from './pages/Notifications';
import InitiativesManagement from './pages/admin/InitiativesManagement';

// In your routes:
<Route path="/initiatives" element={<Initiatives />} />
<Route path="/news" element={<News />} />
<Route path="/notifications" element={<Notifications />} />
<Route path="/admin/initiatives" element={<InitiativesManagement />} />
```

---

**Note:** These are simplified versions. For full versions with all features, see the individual files in the outputs folder.
