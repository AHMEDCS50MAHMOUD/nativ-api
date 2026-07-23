const express = require('express');
const cors    = require('cors');
const app     = express();

app.use(cors());
app.use(express.json());

// ─── Data ─────────────────────────────────────────────────────
const products = [
  {
    id:            'prod-001',
    name:          'تيشيرت قطن كلاسيك',
    description:   'تيشيرت قطن 100% مريح للاستخدام اليومي',
    price:         250,
    category:      'تيشيرتات',
    imageUrl:      'https://images.unsplash.com/photo-1521572163474-6864f9cf17ab?w=400',
    stockQuantity: 50,
    isAvailable:   true,
    createdAt:     new Date().toISOString(),
  },
  {
    id:            'prod-002',
    name:          'جينز سليم فيت',
    description:   'جينز عالي الجودة بقصة سليم فيت مريحة',
    price:         650,
    category:      'بناطيل',
    imageUrl:      'https://images.unsplash.com/photo-1542272454315-4c01d7abdf4a?w=400',
    stockQuantity: 30,
    isAvailable:   true,
    createdAt:     new Date().toISOString(),
  },
  {
    id:            'prod-003',
    name:          'هوديه شتوية',
    description:   'هوديه دافية بقماش فليس ناعم',
    price:         450,
    category:      'هوديات',
    imageUrl:      'https://images.unsplash.com/photo-1556821840-3a63f15732ce?w=400',
    stockQuantity: 20,
    isAvailable:   true,
    createdAt:     new Date().toISOString(),
  },
  {
    id:            'prod-004',
    name:          'جاكيت كاجوال',
    description:   'جاكيت خفيف مناسب لكل المواسم',
    price:         799,
    category:      'جاكيتات',
    imageUrl:      'https://images.unsplash.com/photo-1591047139829-d91aecb6caea?w=400',
    stockQuantity: 15,
    isAvailable:   true,
    createdAt:     new Date().toISOString(),
  },
  {
    id:            'prod-005',
    name:          'شورت رياضي',
    description:   'شورت رياضي مريح للجيم والرياضة',
    price:         180,
    category:      'بناطيل',
    imageUrl:      'https://images.unsplash.com/photo-1562886812-a17f57044cc1?w=400',
    stockQuantity: 40,
    isAvailable:   true,
    createdAt:     new Date().toISOString(),
  },
];

const orders = [];
let nextId = 6;

// ─── Health ───────────────────────────────────────────────────
app.get('/health', (q, r) =>
  r.json({ status: 'ok', mode: 'MOCK', productsCount: products.length })
);

// ─── Products ─────────────────────────────────────────────────
app.get('/api/products', (q, r) => {
  let result = [...products];
  if (q.query.category)             result = result.filter(p => p.category === q.query.category);
  if (q.query.available === 'true') result = result.filter(p => p.isAvailable);
  if (q.query.search) {
    const s = q.query.search.toLowerCase();
    result = result.filter(p =>
      p.name.toLowerCase().includes(s) ||
      (p.description || '').toLowerCase().includes(s)
    );
  }
  r.json({ success: true, count: result.length, data: result });
});

app.get('/api/products/categories', (q, r) =>
  r.json({ success: true, data: [...new Set(products.map(p => p.category))] })
);

app.get('/api/products/:id', (q, r) => {
  const p = products.find(x => x.id === q.params.id);
  p ? r.json({ success: true, data: p })
    : r.status(404).json({ success: false, message: 'المنتج غير موجود' });
});

// ✅ POST — إضافة منتج جديد
app.post('/api/products', (q, r) => {
  const { name, description, price, category, imageUrl, stockQuantity } = q.body;
  if (!name || !price || !category) {
    return r.status(422).json({ success: false, message: 'name, price, category مطلوبة' });
  }
  const product = {
    id:            `prod-${String(nextId++).padStart(3, '0')}`,
    name,
    description:   description || '',
    price:         Number(price),
    category,
    imageUrl:      imageUrl || 'https://picsum.photos/400/500',
    stockQuantity: Number(stockQuantity) || 0,
    isAvailable:   Number(stockQuantity) > 0,
    createdAt:     new Date().toISOString(),
  };
  products.unshift(product);
  r.status(201).json({ success: true, message: 'تم إضافة المنتج', data: product });
});

// ✅ PUT — تعديل منتج
app.put('/api/products/:id', (q, r) => {
  const idx = products.findIndex(p => p.id === q.params.id);
  if (idx === -1) return r.status(404).json({ success: false, message: 'المنتج غير موجود' });
  const updates = q.body;
  if (updates.stockQuantity !== undefined) {
    updates.isAvailable = Number(updates.stockQuantity) > 0;
  }
  products[idx] = { ...products[idx], ...updates, updatedAt: new Date().toISOString() };
  r.json({ success: true, message: 'تم تحديث المنتج', data: products[idx] });
});

// ✅ DELETE — حذف منتج
app.delete('/api/products/:id', (q, r) => {
  const idx = products.findIndex(p => p.id === q.params.id);
  if (idx === -1) return r.status(404).json({ success: false, message: 'المنتج غير موجود' });
  products.splice(idx, 1);
  r.json({ success: true, message: 'تم حذف المنتج' });
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
  try {
    const { sendNewOrderNotification } = require('./src/services/fcm_service');
    await sendNewOrderNotification(o);
  } catch (e) {
    console.log('[FCM] Skipped:', e.message);
  }
  r.status(201).json({ success: true, message: 'تم استلام طلبك!', data: o });
});

app.get('/api/orders', (q, r) => {
  let result = [...orders];
  if (q.query.status) result = result.filter(o => o.status === q.query.status);
  r.json({ success: true, total: result.length, data: result });
});

app.get('/api/orders/stats', (q, r) =>
  r.json({
    success: true,
    data: {
      total:        orders.length,
      pending:      orders.filter(o => o.status === 'pending').length,
      confirmed:    orders.filter(o => o.status === 'confirmed').length,
      shipped:      orders.filter(o => o.status === 'shipped').length,
      delivered:    orders.filter(o => o.status === 'delivered').length,
      cancelled:    orders.filter(o => o.status === 'cancelled').length,
      totalRevenue: orders.filter(o => o.status === 'delivered').reduce((s, o) => s + (o.totalAmount || 0), 0),
    },
  })
);

app.get('/api/orders/:id', (q, r) => {
  const o = orders.find(x => x.id === q.params.id);
  o ? r.json({ success: true, data: o })
    : r.status(404).json({ success: false, message: 'الطلب غير موجود' });
});

app.patch('/api/orders/:id/status', (q, r) => {
  const idx = orders.findIndex(o => o.id === q.params.id);
  if (idx === -1) return r.status(404).json({ success: false, message: 'الطلب غير موجود' });
  orders[idx].status    = q.body.status;
  orders[idx].updatedAt = new Date().toISOString();
  r.json({ success: true, message: 'تم تحديث حالة الطلب', data: orders[idx] });
});

// ─── Start ────────────────────────────────────────────────────
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log('🛍️  NATIV API running');
  console.log(`📡  http://localhost:${PORT}`);
  console.log(`📦  Products: ${products.length}`);
});