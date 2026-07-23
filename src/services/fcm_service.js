// src/services/fcm_service.js
// بيبعت FCM notification للأدمن لما ييجي أوردر جديد

let admin;
try {
  admin = require('firebase-admin');
} catch {
  admin = null;
}

async function sendNewOrderNotification(order) {
  // لو Firebase مش configured → تخطي
  if (!admin || !admin.apps || admin.apps.length === 0) {
    console.log('[FCM] Mock mode — skipping notification');
    return;
  }

  try {
    await admin.messaging().send({
      topic: 'nativ_admin',         // كل الأدمن اللي subscribe
      notification: {
        title: '🛍️ طلب جديد — NATIV',
        body:  `${order.customerName} — ${order.totalAmount} جنيه`,
      },
      data: {
        orderId:      order.id?.toString() ?? '',
        customerName: order.customerName ?? '',
        totalAmount:  order.totalAmount?.toString() ?? '0',
        type:         'new_order',
      },
      android: {
        priority: 'high',
        notification: {
          color:        '#C9A84C',   // NATIV Gold
          channelId:    'nativ_orders',
          clickAction:  'FLUTTER_NOTIFICATION_CLICK',
        },
      },
      apns: {
        payload: { aps: { sound: 'default', badge: 1 } },
      },
    });
    console.log(`[FCM] ✅ Notification sent for order: ${order.id}`);
  } catch (err) {
    console.error('[FCM] Failed to send notification:', err.message);
  }
}

module.exports = { sendNewOrderNotification };