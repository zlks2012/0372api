const { load, save, hashPassword, generateApiKey, generateId } = require("./db");

function json(res, status, data) {
  res.writeHead(status, { "Content-Type": "application/json; charset=utf-8", "Access-Control-Allow-Origin": "*" });
  res.end(JSON.stringify(data));
}

function readBody(req) {
  return new Promise((resolve) => {
    let body = "";
    req.on("data", (c) => (body += c));
    req.on("end", () => { try { resolve(body ? JSON.parse(body) : {}); } catch { resolve({}); } });
  });
}

function ok(res, data) { json(res, 200, { code: 0, data, message: "success" }); }
function list(res, items, total, page, pageSize) { json(res, 200, { code: 0, data: { items, total: total ?? items.length, page: page || 1, page_size: pageSize || 20, pages: Math.ceil((total ?? items.length) / (pageSize || 20)) }, message: "success" }); }

function handleAdmin(req, res, p, method) {
  const url = new URL(req.url, `http://${req.headers.host}`);
  const db = load();
  const segments = p.replace("/api/v1/admin/", "").split("/").filter(Boolean);

  // === Dashboard ===
  if (p === "/api/v1/admin/dashboard/stats" && method === "GET") {
    return ok(res, {
      total_users: db.users.length,
      total_requests: db.usageLogs.length,
      total_tokens: 0,
      total_revenue: 0,
      active_users: db.users.filter((u) => u.status === "active").length,
    });
  }
  if (p === "/api/v1/admin/dashboard/realtime" && method === "GET")
    return ok(res, { requests_per_minute: 0, active_users: 0, error_rate: 0 });
  if (p === "/api/v1/admin/dashboard/trend" && method === "GET")
    return ok(res, []);
  if (p === "/api/v1/admin/dashboard/models" && method === "GET")
    return ok(res, []);
  if (p === "/api/v1/admin/dashboard/users-ranking" && method === "GET")
    return ok(res, []);
  if (p === "/api/v1/admin/dashboard/users-trend" && method === "GET")
    return ok(res, []);
  if (p === "/api/v1/admin/dashboard/snapshot-v2" && method === "GET")
    return ok(res, {});

  // === Users ===
  if (p === "/api/v1/admin/users" && method === "GET") {
    const users = db.users.map((u) => ({
      id: u.id, email: u.email, username: u.username, role: u.role,
      balance: u.balance, quota: u.quota, used_quota: u.used_quota,
      group: u.group || "default", status: u.status, created_at: u.created_at,
      api_key_count: (db.apiKeys || []).filter(k => k.user_id === u.id).length,
      concurrency: 0, max_concurrency: 5,
      last_login_at: u.last_login_at || u.created_at,
      is_admin: u.role === "admin",
      display_name: u.username,
    }));
    return list(res, users, users.length);
  }
  if (p === "/api/v1/admin/users" && method === "POST") {
    return readBody(req).then((body) => {
      if (!body.email || !body.password) return json(res, 400, { code: 400, message: "email and password required" });
      if (db.users.find((u) => u.email === body.email)) return json(res, 409, { code: 409, message: "email exists" });
      const user = {
        id: db.nextUserId++, email: body.email, username: body.username || body.email.split("@")[0],
        password_hash: hashPassword(body.password), role: body.role || "user",
        balance: body.balance || 0, quota: body.quota || 500000, used_quota: 0,
        group: body.group || "default", status: "active", created_at: new Date().toISOString(),
      };
      db.users.push(user); save(db);
      return ok(res, { id: user.id, email: user.email, username: user.username });
    });
  }
  const userIdMatch = p.match(/^\/api\/v1\/admin\/users\/(\d+)$/);
  if (userIdMatch && method === "GET") {
    const u = db.users.find((x) => x.id === parseInt(userIdMatch[1]));
    if (!u) return json(res, 404, { code: 404, message: "not found" });
    delete u.password_hash;
    return ok(res, u);
  }
  if (userIdMatch && method === "PUT") {
    return readBody(req).then((body) => {
      const u = db.users.find((x) => x.id === parseInt(userIdMatch[1]));
      if (!u) return json(res, 404, { code: 404, message: "not found" });
      if (body.balance !== undefined) u.balance = body.balance;
      if (body.status !== undefined) u.status = body.status;
      if (body.role !== undefined) u.role = body.role;
      if (body.group !== undefined) u.group = body.group;
      if (body.quota !== undefined) u.quota = body.quota;
      save(db);
      delete u.password_hash;
      return ok(res, u);
    });
  }
  if (userIdMatch && method === "DELETE") {
    const idx = db.users.findIndex((x) => x.id === parseInt(userIdMatch[1]));
    if (idx < 0) return json(res, 404, { code: 404, message: "not found" });
    db.users.splice(idx, 1); save(db);
    return ok(res, { deleted: true });
  }

  // === Groups ===
  if (p === "/api/v1/admin/groups" && method === "GET") { const enriched = db.groups.map(g => ({ ...g, platform: g.platform || "openai", group_type: g.group_type || "api", access_type: g.access_type || "public", account_count: (db.channels || []).filter(c => c.group === g.name).length, usage_summary: { total_requests: 0, total_tokens: 0 } })); return list(res, enriched); }
  if (p === "/api/v1/admin/groups/all" && method === "GET") { const enriched = db.groups.map(g => ({ ...g, platform: g.platform || "openai", group_type: g.group_type || "api", access_type: g.access_type || "public" })); return list(res, enriched); }
  if (p === "/api/v1/admin/groups" && method === "POST") {
    return readBody(req).then((body) => {
      const group = { id: db.groups.length + 1, name: body.name, description: body.description || "", ratio: body.ratio || 1, models: body.models || [], status: body.status || "enabled", platform: body.platform || "openai", group_type: body.group_type || "api", access_type: body.access_type || "public", sort_order: db.groups.length + 1 };
      db.groups.push(group); save(db);
      return ok(res, group);
    });
  }

  // === System ===
  if (p === "/api/v1/admin/system/version" && method === "GET") {
    return json(res, 200, { code: 0, data: { current_version: "1.0.0", latest_version: "1.0.0", has_update: false }, message: "success" });
  }
  if (p === "/api/v1/admin/system/check-updates" && method === "GET") {
    return json(res, 200, { code: 0, data: { has_update: false }, message: "success" });
  }

  // === Upstream Accounts ===
  if (p === "/api/v1/admin/accounts" && method === "GET") {
    const accounts = (db.channels || []).map(c => ({
      id: c.id, name: c.name, platform: c.type || "openai",
      base_url: c.base_url, api_key: c.api_key ? "***" : "",
      models: c.models || [], group: c.group || "default",
      status: c.status || "enabled", priority: c.priority || 0,
      weight: c.weight || 1, account_type: c.type || "openai",
      created_at: c.created_at
    }));
    return list(res, accounts);
  }

  // === Channels ===
  if (p === "/api/v1/admin/channels" && method === "GET") return list(res, db.channels);
  if (p === "/api/v1/admin/channels" && method === "POST") {
    return readBody(req).then((body) => {
      const ch = { id: db.nextChannelId++, name: body.name, type: body.type || "openai", platform: body.platform || body.type || "openai", base_url: body.base_url, api_key: body.api_key, models: body.models || [], group: body.group || "default", priority: body.priority || 0, weight: body.weight || 1, status: body.status || "enabled", created_at: new Date().toISOString() };
      db.channels.push(ch); save(db);
      return ok(res, ch);
    });
  }

  // === Announcements ===
  if (p === "/api/v1/admin/announcements" && method === "GET") return list(res, db.announcements);
  if (p === "/api/v1/admin/announcements" && method === "POST") {
    return readBody(req).then((body) => {
      const ann = { id: db.announcements.length + 1, title: body.title, content: body.content, created_at: new Date().toISOString() };
      db.announcements.push(ann); save(db);
      return ok(res, ann);
    });
  }

  // === API Keys ===
  if (p === "/api/v1/admin/api-keys" && method === "GET") return list(res, db.apiKeys);

  // === Audit Logs ===
  if (p === "/api/v1/admin/audit-logs" && method === "GET") return list(res, []);

  // === Channel CRUD by ID ===
  const chMatch = p.match(/^\/api\/v1\/admin\/channels\/(\d+)$/);
  if (chMatch && method === "GET") {
    const ch = db.channels.find(c => c.id === parseInt(chMatch[1]));
    return ch ? ok(res, ch) : json(res, 404, { code: 404, message: "not found" });
  }
  if (chMatch && method === "PUT") {
    return readBody(req).then(body => {
      const ch = db.channels.find(c => c.id === parseInt(chMatch[1]));
      if (!ch) return json(res, 404, { code: 404, message: "not found" });
      Object.assign(ch, body);
      save(db);
      return ok(res, ch);
    });
  }
  if (chMatch && method === "DELETE") {
    const idx = db.channels.findIndex(c => c.id === parseInt(chMatch[1]));
    if (idx < 0) return json(res, 404, { code: 404, message: "not found" });
    db.channels.splice(idx, 1); save(db);
    return ok(res, { deleted: true });
  }

  // === Group CRUD by ID ===
  const grMatch = p.match(/^\/api\/v1\/admin\/groups\/(\d+)$/);
  if (grMatch && method === "GET") {
    const g = db.groups.find(g => g.id === parseInt(grMatch[1]));
    return g ? ok(res, g) : json(res, 404, { code: 404, message: "not found" });
  }
  if (grMatch && method === "PUT") {
    return readBody(req).then(body => {
      const g = db.groups.find(g => g.id === parseInt(grMatch[1]));
      if (!g) return json(res, 404, { code: 404, message: "not found" });
      Object.assign(g, body);
      save(db);
      return ok(res, g);
    });
  }
  if (grMatch && method === "DELETE") {
    const idx = db.groups.findIndex(g => g.id === parseInt(grMatch[1]));
    if (idx < 0) return json(res, 404, { code: 404, message: "not found" });
    db.groups.splice(idx, 1); save(db);
    return ok(res, { deleted: true });
  }

  // === Announcement CRUD by ID ===
  const annMatch = p.match(/^\/api\/v1\/admin\/announcements\/(\d+)$/);
  if (annMatch && method === "PUT") {
    return readBody(req).then(body => {
      const a = db.announcements.find(a => a.id === parseInt(annMatch[1]));
      if (!a) return json(res, 404, { code: 404, message: "not found" });
      Object.assign(a, body); save(db);
      return ok(res, a);
    });
  }
  if (annMatch && method === "DELETE") {
    const idx = db.announcements.findIndex(a => a.id === parseInt(annMatch[1]));
    if (idx < 0) return json(res, 404, { code: 404, message: "not found" });
    db.announcements.splice(idx, 1); save(db);
    return ok(res, { deleted: true });
  }

  // === Settings ===
  if (p === "/api/v1/admin/settings" && method === "GET") {
    return ok(res, db.settings || {});
  }
  if (p === "/api/v1/admin/settings" && method === "PUT") {
    return readBody(req).then(body => {
      db.settings = { ...db.settings, ...body };
      save(db);
      return ok(res, db.settings);
    });
  }

  // === Redeem Codes ===
  if (!db.redeemCodes) db.redeemCodes = [];
  if (p === "/api/v1/admin/redeem-codes" && method === "GET") return list(res, db.redeemCodes);
  if (p === "/api/v1/admin/redeem-codes/generate" && method === "POST") {
    return readBody(req).then(body => {
      const count = body.count || 1;
      const codes = [];
      for (let i = 0; i < count; i++) {
        const code = { id: db.redeemCodes.length + 1, code: generateId().toUpperCase(), amount: body.amount || 10, status: "unused", created_at: new Date().toISOString() };
        db.redeemCodes.push(code);
        codes.push(code);
      }
      save(db);
      return ok(res, codes);
    });
  }

  // === Redeem Code Stats ===
  if (p === "/api/v1/admin/redeem-codes/stats" && method === "GET") {
    const total = db.redeemCodes ? db.redeemCodes.length : 0;
    const used = db.redeemCodes ? db.redeemCodes.filter(r => r.status === "used").length : 0;
    const unused = total - used;
    return ok(res, { total, used, unused });
  }

  // === Promo Codes ===
  if (!db.promoCodes) db.promoCodes = [];
  if (p === "/api/v1/admin/promo-codes" && method === "GET") return list(res, db.promoCodes);
  if (p === "/api/v1/admin/promo-codes" && method === "POST") {
    return readBody(req).then(body => {
      const pc = { id: db.promoCodes.length + 1, code: generateId().toUpperCase(), discount: body.discount || 0.1, max_uses: body.max_uses || 100, used: 0, status: "active", created_at: new Date().toISOString() };
      db.promoCodes.push(pc); save(db);
      return ok(res, pc);
    });
  }

  // === Payment ===
  if (p === "/api/v1/admin/payment/channels" && method === "GET") {
    return list(res, [
      { id: 1, name: "alipay", label: "支付宝", enabled: true },
      { id: 2, name: "wxpay", label: "微信支付", enabled: true },
    ]);
  }
  if (p === "/api/v1/admin/payment/plans" && method === "GET") {
    return list(res, db.plans || []);
  }

  // === Ops Dashboard ===
  if (p.includes("/admin/ops/dashboard") && method === "GET") return ok(res, {});
  if (p === "/api/v1/admin/ops/alert-rules" && method === "GET") return list(res, []);
  if (p === "/api/v1/admin/ops/system-logs" && method === "GET") return list(res, []);

  // === Data Management ===
  if (p === "/api/v1/admin/backups" && method === "GET") return list(res, []);

  // === Compliance ===
  if (p === "/api/v1/admin/compliance" && method === "GET") return ok(res, { required: false });

  // === User Concurrency ===
  if (p === "/api/v1/admin/ops/user-concurrency" && method === "GET") {
    const users = db.users.map(u => ({
      id: u.id, username: u.username, email: u.email,
      concurrency: u.concurrency || 0,
      max_concurrency: u.max_concurrency || 5,
      status: u.status || "active"
    }));
    return list(res, users);
  }

  // === Ingress Whitelist ===
  if (!db.whitelist) db.whitelist = [];
  if (p === "/api/v1/admin/ingress-whitelist/current-ip" && method === "GET") {
    return ok(res, { ip: "127.0.0.1" });
  }
  if (p === "/api/v1/admin/ingress-whitelist" && method === "GET") {
    return list(res, db.whitelist);
  }
  if (p === "/api/v1/admin/ingress-whitelist" && method === "POST") {
    return readBody(req).then(body => {
      if (!body.ip) return json(res, 400, { code: 400, message: "ip required" });
      const entry = { id: db.whitelist.length + 1, ip: body.ip, note: body.note || "", created_at: new Date().toISOString() };
      db.whitelist.push(entry); save(db);
      return ok(res, entry);
    });
  }
  const wlMatch = p.match(/^\/api\/v1\/admin\/ingress-whitelist\/(\d+)$/);
  if (wlMatch && method === "DELETE") {
    const idx = db.whitelist.findIndex(w => w.id === parseInt(wlMatch[1]));
    if (idx < 0) return json(res, 404, { code: 404, message: "not found" });
    db.whitelist.splice(idx, 1); save(db);
    return ok(res, { deleted: true });
  }

  // === Generic empty list for remaining GET endpoints ===
  if (method === "GET") return list(res, []);
  if (method === "POST" || method === "PUT") return ok(res, {});
  if (method === "DELETE") return ok(res, { deleted: true });

  return json(res, 404, { code: 404, message: "not found" });
}

module.exports = { handleAdmin };
