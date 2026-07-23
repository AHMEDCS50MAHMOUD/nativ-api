const express = require('express');
const cors    = require('cors');
const app     = express();

app.use(cors());
app.use(express.json());

// ─── Data ─────────────────────────────────────────────────────
const products = [
  {
    id:            'prod-001',
    name:          'تيشيرت قطن',
    price:         250,
    category:      'تيشيرتات',
    imageUrl:      'https://picsum.photos/400/500',
    stockQuantity: 50,
    isAvailable:   true,
  },
  {
    id:            'prod-002',
    name:          'جينز سليم',
    price:         650,
    category:      'بناطيل',
    imageUrl:      'https://picsum.photos/400/501',
    stockQuantity: 30,
    isAvailable:   true,
  },
];

const orders = [];

// ─── Health ───────────────────────────────────────────────────
app.get('/health', (q, r) =>
  r.json({ status: 'ok', mode: 'MOCK' })
);

// ─── Products ─────────────────────────────────────────────────
app.get('/api/products', (q, r) =>
  r.json({ success: true, count: products.length, data: products })
);

app.get('/api/products/categories', (q, r) =>
  r.json({ success: true, data: [...new Set(products.map(p => p.category))] })
);

app.get('/api/products/:id', (q, r) => {
  const p = products.find(x => x.id === q.params.id);
  p
    ? r.json({ success: true, data: p })
    : r.status(404).json({ success: false, message: 'غير موجود' });
});

// ─── Orders ───────────────────────────────────────────────────
app.post('/api/orders', async (q, r) => {
  const o = {
    id:        'ord-' + Date.now(),
    ...q.body,
    status:    'pending',
    createdAt: new Date().toISOString(),
  };
  orders.push(o);

  // ✅ FCM — بعت notification للأدمن
  try {
    const { sendNewOrderNotification } = require('./src/services/fcm_service');
    await sendNewOrderNotification(o);
  } catch (e) {
    console.log('[FCM] Skipped:', e.message);
  }

  r.status(201).json({ success: true, data: o });
});

app.get('/api/orders', (q, r) =>
  r.json({ success: true, data: orders })
);

app.get('/api/orders/stats', (q, r) =>
  r.json({
    success: true,
    data: {
      total:   orders.length,
      pending: orders.filter(o => o.status === 'pending').length,
    },
  })
);

app.patch('/api/orders/:id/status', (q, r) => {
  const idx = orders.findIndex(o => o.id === q.params.id);
  if (idx === -1)
    return r.status(404).json({ success: false, message: 'الطلب غير موجود' });
  orders[idx].status = q.body.status;
  r.json({ success: true, data: orders[idx] });
});

// ─── Start ────────────────────────────────────────────────────
app.listen(3000, () =>
  console.log('🚀 API running on http://localhost:3000')
);