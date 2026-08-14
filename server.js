const express = require('express');
const cors = require('cors');
const path = require('path');
const db = require('./database');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());

// Serve static frontend files
app.use(express.static(__dirname));

// Auth Login
app.post('/api/auth/login', (req, res) => {
  const { staffId, pin } = req.body;
  // Simple staff authentication logic
  if (!staffId || !pin) {
    return res.status(400).json({ success: false, message: 'Staff ID and PIN required' });
  }
  return res.json({ success: true, message: 'Authenticated successfully', staff: { id: staffId, name: 'Staff' } });
});

// GET Tables
app.get('/api/tables', (req, res) => {
  db.all("SELECT * FROM tables ORDER BY id", [], (err, rows) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json(rows);
  });
});

// UPDATE Table Status
app.patch('/api/tables/:id', (req, res) => {
  const { status, current_order } = req.body;
  const tableId = req.params.id;
  db.run(
    "UPDATE tables SET status = ?, current_order = ? WHERE id = ?",
    [status, current_order !== undefined ? current_order : null, tableId],
    function(err) {
      if (err) return res.status(500).json({ error: err.message });
      res.json({ success: true, updated: this.changes });
    }
  );
});

// GET Menu Items
app.get('/api/menu', (req, res) => {
  db.all("SELECT * FROM menu_items", [], (err, rows) => {
    if (err) return res.status(500).json({ error: err.message });
    
    // Group menu items by category
    const menuObj = {};
    rows.forEach(item => {
      if (!menuObj[item.category]) menuObj[item.category] = [];
      const itemObj = {
        name: item.name,
        icon: item.icon,
        full: item.full
      };
      if (item.half !== null && item.half !== undefined) itemObj.half = item.half;
      if (item.quarter !== null && item.quarter !== undefined) itemObj.quarter = item.quarter;
      menuObj[item.category].push(itemObj);
    });
    res.json(menuObj);
  });
});

// GET Orders
app.get('/api/orders', (req, res) => {
  db.all("SELECT * FROM orders ORDER BY created_at DESC", [], (err, rows) => {
    if (err) return res.status(500).json({ error: err.message });

    const grouped = {
      requested: [],
      active: [],
      billed: []
    };

    rows.forEach(r => {
      const orderObj = {
        table: r.table_name,
        order: r.order_number,
        items: JSON.parse(r.items_json),
        amount: r.amount,
        gst_amount: r.gst_amount,
        discount_amount: r.discount_amount,
        total_amount: r.total_amount,
        payment_method: r.payment_method,
        time: r.time_str,
        date: r.date_str,
        state: r.status === 'requested' ? 'served' : (r.status === 'active' ? 'ready' : 'billed'),
        status: r.status
      };
      if (grouped[r.status]) {
        grouped[r.status].push(orderObj);
      }
    });

    res.json(grouped);
  });
});

// CREATE Order
app.post('/api/orders', (req, res) => {
  const { table, items, amount, gst_amount, discount_amount, total_amount, status } = req.body;
  const order_number = Math.floor(10 + Math.random() * 90);
  const now = new Date();
  const time_str = now.toLocaleTimeString('en-GB');
  const date_str = now.toLocaleDateString('en-GB');
  const orderStatus = status || 'active';

  db.run(
    `INSERT INTO orders (order_number, table_name, items_json, amount, gst_amount, discount_amount, total_amount, time_str, date_str, status)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [order_number, table, JSON.stringify(items), amount, gst_amount || 0, discount_amount || 0, total_amount || amount, time_str, date_str, orderStatus],
    function(err) {
      if (err) return res.status(500).json({ error: err.message });

      // If assigned to table, mark table occupied
      db.run("UPDATE tables SET status = 'occupied', current_order = ? WHERE name = ? OR id = ?", [order_number, table, table]);

      res.json({
        success: true,
        order: {
          table,
          order: order_number,
          items,
          amount,
          gst_amount: gst_amount || 0,
          discount_amount: discount_amount || 0,
          total_amount: total_amount || amount,
          time: time_str,
          date: date_str,
          state: orderStatus === 'requested' ? 'served' : 'ready',
          status: orderStatus
        }
      });
    }
  );
});

// SETTLE Order
app.post('/api/orders/:order_number/settle', (req, res) => {
  const orderNo = req.params.order_number;
  const { payment_method, gst_amount, discount_amount, total_amount } = req.body;

  db.run(
    `UPDATE orders SET status = 'billed', payment_method = ?, gst_amount = ?, discount_amount = ?, total_amount = ? WHERE order_number = ?`,
    [payment_method, gst_amount, discount_amount, total_amount, orderNo],
    function(err) {
      if (err) return res.status(500).json({ error: err.message });

      // Set corresponding table status back to available
      db.get("SELECT table_name FROM orders WHERE order_number = ?", [orderNo], (err, row) => {
        if (!err && row && row.table_name) {
          db.run("UPDATE tables SET status = 'available', current_order = NULL WHERE name = ? OR id = ?", [row.table_name, row.table_name]);
        }
      });

      res.json({ success: true, message: `Order #${orderNo} settled via ${payment_method}` });
    }
  );
});

app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'index (4).html'));
});

if (process.env.NODE_ENV !== 'production' && !process.env.VERCEL) {
  app.listen(PORT, () => {
    console.log(`T Clock POS Server running on http://localhost:${PORT}`);
  });
}

module.exports = app;
