/**
 * Socket.io Real-time Service
 * بديل Supabase Real-time
 */

import { Server } from 'socket.io';

let io = null;

// Initialize Socket.io
export const initializeSocket = (server) => {
  io = new Server(server, {
    cors: {
      origin: [
        'https://alshailfund.com',
        'https://app.alshailfund.com',
        'https://alshuail-admin.pages.dev',
        'http://localhost:3000',
        'http://localhost:3002'
      ],
      methods: ['GET', 'POST'],
      credentials: true
    }
  });

  io.on('connection', (socket) => {
    console.log(`✅ [Socket.io] متصل: ${socket.id}`);

    // انضمام لغرفة
    socket.on('join-room', (room) => {
      socket.join(room);
      console.log(`📥 ${socket.id} انضم للغرفة: ${room}`);
    });

    // انضمام لغرفة العضو
    socket.on('join-member-room', (memberId) => {
      socket.join(`member-${memberId}`);
      console.log(`👤 ${socket.id} انضم لغرفة العضو: ${memberId}`);
    });

    // انضمام المديرين
    socket.on('join-admin', () => {
      socket.join('admins');
      console.log(`🔑 ${socket.id} انضم لغرفة المديرين`);
    });

    socket.on('disconnect', () => {
      console.log(`❌ [Socket.io] انقطع: ${socket.id}`);
    });
  });

  console.log('🚀 [Socket.io] Real-time server initialized');
  return io;
};

export const getIO = () => {
  if (!io) throw new Error('Socket.io not initialized');
  return io;
};

// إرسال للكل
export const emitToAll = (event, data) => {
  if (io) io.emit(event, { ...data, timestamp: new Date().toISOString() });
};

// إرسال لغرفة
export const emitToRoom = (room, event, data) => {
  if (io) io.to(room).emit(event, { ...data, timestamp: new Date().toISOString() });
};

// إرسال لعضو محدد
export const emitToMember = (memberId, event, data) => {
  if (io) io.to(`member-${memberId}`).emit(event, { ...data, timestamp: new Date().toISOString() });
};

// ═══════════════════════════════════════
// أحداث Real-time (مثل Supabase)
// ═══════════════════════════════════════

// تغيير في الأعضاء
export const notifyMemberChange = (action, member) => {
  emitToAll('member-change', { action, data: member });
  console.log(`📡 Member ${action}: ${member.id || member.full_name_ar}`);
};

// تغيير في المدفوعات
export const notifyPaymentChange = (action, payment) => {
  emitToAll('payment-change', { action, data: payment });
  if (payment.member_id) {
    emitToMember(payment.member_id, 'my-payment-update', { action, data: payment });
  }
};

// تغيير في الاشتراكات
export const notifySubscriptionChange = (action, subscription) => {
  emitToAll('subscription-change', { action, data: subscription });
  if (subscription.member_id) {
    emitToMember(subscription.member_id, 'my-subscription-update', { action, data: subscription });
  }
};

// تغيير في الفعاليات
export const notifyActivityChange = (action, activity) => {
  emitToAll('activity-change', { action, data: activity });
};

// إشعار جديد لعضو
export const notifyNewNotification = (memberId, notification) => {
  emitToMember(memberId, 'new-notification', { data: notification });
};

// إعلان عام للجميع
export const broadcastAnnouncement = (announcement) => {
  emitToAll('announcement', { data: announcement });
};

// تحديث Dashboard
export const notifyDashboardUpdate = () => {
  emitToRoom('admins', 'dashboard-update', { refresh: true });
};

export default {
  initializeSocket,
  getIO,
  emitToAll,
  emitToRoom,
  emitToMember,
  notifyMemberChange,
  notifyPaymentChange,
  notifySubscriptionChange,
  notifyActivityChange,
  notifyNewNotification,
  broadcastAnnouncement,
  notifyDashboardUpdate
};
