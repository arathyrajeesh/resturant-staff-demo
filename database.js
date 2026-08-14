const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const dbPath = process.env.VERCEL ? path.join('/tmp', 'pos.db') : path.join(__dirname, 'pos.db');
const db = new sqlite3.Database(dbPath);

db.serialize(() => {
  // Create Tables table
  db.run(`
    CREATE TABLE IF NOT EXISTS tables (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      seats INTEGER NOT NULL,
      zone TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'available',
      current_order INTEGER
    )
  `);

  // Create Menu Items table
  db.run(`
    CREATE TABLE IF NOT EXISTS menu_items (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      category TEXT NOT NULL,
      name TEXT NOT NULL,
      icon TEXT NOT NULL,
      full INTEGER NOT NULL,
      half INTEGER,
      quarter INTEGER
    )
  `);

  // Create Orders table
  db.run(`
    CREATE TABLE IF NOT EXISTS orders (
      order_number INTEGER PRIMARY KEY,
      table_name TEXT NOT NULL,
      items_json TEXT NOT NULL,
      amount REAL NOT NULL,
      gst_amount REAL DEFAULT 0,
      discount_amount REAL DEFAULT 0,
      total_amount REAL NOT NULL,
      payment_method TEXT,
      time_str TEXT NOT NULL,
      date_str TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'ready', -- 'requested', 'active', 'billed'
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);

  // Seed Tables if empty
  db.get("SELECT COUNT(*) as count FROM tables", (err, row) => {
    if (!err && row.count === 0) {
      const initialTables = [
        {id:'1', name:'Table 1', seats:4, zone:'indoor', status:'occupied', current_order:14},
        {id:'2', name:'Table 2', seats:4, zone:'indoor', status:'available', current_order:null},
        {id:'3', name:'Table 3', seats:4, zone:'indoor', status:'occupied', current_order:16},
        {id:'4', name:'Table 4', seats:4, zone:'indoor', status:'available', current_order:null},
        {id:'5', name:'Table 5', seats:4, zone:'indoor', status:'occupied', current_order:13},
        {id:'6', name:'Table 6', seats:4, zone:'indoor', status:'available', current_order:null},
        {id:'7', name:'Table 7', seats:4, zone:'indoor', status:'available', current_order:null},
        {id:'8', name:'Table 8', seats:4, zone:'indoor', status:'available', current_order:null},
        {id:'9', name:'Table 9', seats:4, zone:'indoor', status:'available', current_order:null},
        {id:'T-01', name:'Table 01', seats:4, zone:'terrace', status:'available', current_order:null},
        {id:'T-02', name:'Table 02', seats:4, zone:'terrace', status:'available', current_order:null},
        {id:'T-03', name:'Table 03', seats:4, zone:'terrace', status:'available', current_order:null},
      ];
      const stmt = db.prepare("INSERT INTO tables (id, name, seats, zone, status, current_order) VALUES (?, ?, ?, ?, ?, ?)");
      initialTables.forEach(t => stmt.run(t.id, t.name, t.seats, t.zone, t.status, t.current_order));
      stmt.finalize();
    }
  });

  // Seed Menu Items if empty
  db.get("SELECT COUNT(*) as count FROM menu_items", (err, row) => {
    if (!err && row.count === 0) {
      const initialMenu = [
        {category:'Beverages', name:'Cappuccino', icon:'☕', full:70, half:35, quarter:20},
        {category:'Beverages', name:'Chocolate Milkshake', icon:'🥤', full:400, half:350, quarter:250},
        {category:'Beverages', name:'Filter Coffee', icon:'☕', full:60, half:35, quarter:20},
        {category:'Beverages', name:'Cold Coffee', icon:'🧋', full:300, half:250, quarter:150},

        {category:'Drinks', name:'Fresh Lime Soda', icon:'🍋', full:90, half:60, quarter:40},
        {category:'Drinks', name:'Iced Tea', icon:'🧊', full:110, half:70, quarter:45},
        {category:'Drinks', name:'Mango Shake', icon:'🥭', full:130, half:90, quarter:60},

        {category:'Main Course', name:'Veg Biryani', icon:'🍛', full:220, half:null, quarter:null},
        {category:'Main Course', name:'Paneer Butter Masala', icon:'🧆', full:240, half:null, quarter:null},
        {category:'Main Course', name:'Butter Naan', icon:'🫓', full:40, half:null, quarter:null},

        {category:'Starters', name:'French Fries', icon:'🍟', full:120, half:null, quarter:null},
        {category:'Starters', name:'Veg Spring Rolls', icon:'🥟', full:150, half:null, quarter:null},
        {category:'Starters', name:'Chicken 65', icon:'🍗', full:220, half:null, quarter:null},
      ];
      const stmt = db.prepare("INSERT INTO menu_items (category, name, icon, full, half, quarter) VALUES (?, ?, ?, ?, ?, ?)");
      initialMenu.forEach(m => stmt.run(m.category, m.name, m.icon, m.full, m.half, m.quarter));
      stmt.finalize();
    }
  });

  // Seed Orders if empty
  db.get("SELECT COUNT(*) as count FROM orders", (err, row) => {
    if (!err && row.count === 0) {
      const today = new Date().toLocaleDateString('en-GB');
      const initialOrders = [
        {
          order_number: 16,
          table_name: 'Table 3',
          items_json: JSON.stringify(['2× Chocolate Milkshake']),
          amount: 800,
          gst_amount: 40,
          discount_amount: 0,
          total_amount: 840,
          payment_method: null,
          time_str: '12:24:21',
          date_str: today,
          status: 'requested'
        },
        {
          order_number: 14,
          table_name: 'Table 1',
          items_json: JSON.stringify(['1× Cappuccino', '1× French Fries', '1× Iced Tea']),
          amount: 570,
          gst_amount: 28.5,
          discount_amount: 0,
          total_amount: 598.5,
          payment_method: null,
          time_str: '23:29:18',
          date_str: today,
          status: 'active'
        },
        {
          order_number: 13,
          table_name: 'Table 5',
          items_json: JSON.stringify(['1× Veg Biryani', '1× Cold Coffee']),
          amount: 520,
          gst_amount: 26,
          discount_amount: 0,
          total_amount: 546,
          payment_method: null,
          time_str: '10:52:41',
          date_str: today,
          status: 'active'
        }
      ];
      const stmt = db.prepare("INSERT INTO orders (order_number, table_name, items_json, amount, gst_amount, discount_amount, total_amount, payment_method, time_str, date_str, status) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)");
      initialOrders.forEach(o => stmt.run(o.order_number, o.table_name, o.items_json, o.amount, o.gst_amount, o.discount_amount, o.total_amount, o.payment_method, o.time_str, o.date_str, o.status));
      stmt.finalize();
    }
  });
});

module.exports = db;
