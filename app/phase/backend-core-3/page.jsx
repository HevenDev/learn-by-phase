"use client"
import { useState } from "react";

const concepts = [
  {
    id: 1,
    title: "Layered Architecture",
    tag: "THE BACKBONE",
    color: "#f97316",
    tldr: "Split your backend into 4 layers: Routes → Controllers → Services → Repositories. Each layer has ONE job. This single decision makes your code testable, swappable, and maintainable at any scale.",
    problem: `Most beginner backends look like this: one giant route handler that validates input, queries the database, sends emails, formats responses, and handles errors — all in one function. It works at first. Then it becomes a nightmare. You cannot test it in isolation. You cannot swap PostgreSQL for MongoDB. You cannot reuse the business logic in a background job. You cannot read it three months later.

Layered architecture solves this by forcing every concern into its own layer. Business logic lives in ONE place. Database access lives in ONE place. HTTP handling lives in ONE place. Change the database — only one layer changes. Add a mobile API — controllers handle it, services are untouched. Reuse business logic in a cron job — import the service directly, skip the controller entirely.`,
    analogy: `Think of a HOSPITAL.

ROUTES = Reception desk
  Directs patients to the right department.
  Knows nothing about medicine.

CONTROLLERS = Nurse
  Takes your vitals, records your complaint.
  Passes info to the doctor. Delivers the prescription back.
  Does not diagnose.

SERVICES = Doctor
  ALL the medical expertise lives here.
  "These symptoms → run these tests → prescribe this."
  Knows nothing about where medicines are stored.

REPOSITORY = Pharmacy
  Stores and retrieves medicines (data).
  Knows nothing about why you need it.
  Just fetches and stores.

REAL WORLD IMPACT:
If you switch from PostgreSQL to MongoDB:
  Only the Repository layer changes.
  Controllers, Services, Routes stay exactly the same.

If you want the same order logic in a cron job AND an API:
  The cron job calls OrderService directly.
  No HTTP, no controllers needed.
  Business logic is reused with zero duplication.`,
    deep: `THE 4 LAYERS IN FULL DETAIL:

ROUTES (router layer)
  Job: Map HTTP method + path to controller function
  Also: Attach middleware (auth, rate limiting, body validation)
  Contains: Zero logic. Pure wiring.
  File: src/routes/user.routes.js

CONTROLLERS (HTTP layer)
  Job: Handle HTTP in and out
  Reads: req.body, req.params, req.query, req.headers, req.user
  Calls: Service with clean data
  Sends: res.json() with correct status code
  NEVER: touches database directly
  NEVER: contains business rules
  File: src/controllers/user.controller.js

SERVICES (business logic layer)
  Job: ALL business rules, orchestration, side effects
  Calls: Repository layer and other services
  Handles: transactions, email triggers, cache updates, event emission
  NEVER: knows about HTTP (no req, no res, no status codes)
  CAN BE: called from HTTP handler, cron job, queue worker, CLI script
  File: src/services/user.service.js

REPOSITORIES (data access layer)
  Job: ALL database queries — both PostgreSQL and MongoDB
  Returns: domain objects, not raw DB rows or Mongoose docs
  Hides: SQL/aggregation pipeline internals from services
  Handles: DB-specific errors, translates to domain errors
  ONE per entity: UserRepository, OrderRepository, ProductRepository
  File: src/repositories/user.repository.js

THE DEPENDENCY RULE (never violate this):
  Routes → Controllers → Services → Repositories → Database
  Dependencies ONLY flow downward.
  A Repository NEVER imports a Service.
  A Service NEVER imports a Controller.
  Breaking this creates circular deps and untestable code.

WHAT GOES WHERE (common confusion):

  Q: Email sending — controller or service?
  A: Service. Sending email is a business rule consequence.
     The controller just says order placed — service decides what follows.

  Q: Request body validation — controller or service?
  A: Schema validation (is it the right shape?) → middleware/controller
     Business validation (is this email already taken?) → service

  Q: Format API response — controller or service?
  A: Controller only. Response shape is HTTP concern.

  Q: Database errors — repository or service?
  A: Repository catches DB-level errors, translates to domain errors.
     Service catches domain errors, decides what to do.
     Controller catches all errors, maps to HTTP status codes.`,
    code: `// ═══ BEFORE: THE SPAGHETTI ANTI-PATTERN ════════════

app.post("/api/orders", async (req, res) => {
  // validation + business logic + DB + email + HTTP all mixed
  if (!req.body.userId || !req.body.items?.length) {
    return res.status(400).json({ error: "Invalid" });
  }
  const user = await pgPool.query(
    "SELECT * FROM users WHERE id=$1", [req.body.userId]
  );
  if (!user.rows[0]) return res.status(404).json({ error: "Not found" });

  let total = 0;
  for (const item of req.body.items) {
    const p = await pgPool.query(
      "SELECT * FROM products WHERE id=$1", [item.id]
    );
    if (p.rows[0].stock < item.qty)
      return res.status(400).json({ error: "Out of stock" });
    total += p.rows[0].price * item.qty;
    await pgPool.query(
      "UPDATE products SET stock=stock-$1 WHERE id=$2", [item.qty, item.id]
    );
  }
  const order = await pgPool.query(
    "INSERT INTO orders(user_id,total,status) VALUES($1,$2,'pending') RETURNING *",
    [req.body.userId, total]
  );
  await sendEmail(user.rows[0].email, "Order confirmed");
  res.status(201).json(order.rows[0]);
  // Untestable. Not reusable. Impossible to maintain.
});


// ═══ LAYER 1: ROUTES ════════════════════════════════
/*
  Wiring only — no logic anywhere in this file

  router.post("/",           [authenticate, validateBody(CreateOrderSchema)], OrderController.create);
  router.get("/:id",         [authenticate],                                  OrderController.getById);
  router.patch("/:id/cancel",[authenticate],                                  OrderController.cancel);
  router.get("/",            [authenticate, paginate],                        OrderController.list);
*/


// ═══ LAYER 2: CONTROLLER ════════════════════════════

class OrderController {
  static async create(req, res, next) {
    try {
      // ONLY reads request, calls service, formats response
      const { userId, items, couponCode } = req.body;
      const order = await OrderService.createOrder({
        userId, items, couponCode, requestedBy: req.user.id
      });
      res.status(201).json({ success: true, data: order });
    } catch (err) { next(err); }
  }

  static async getById(req, res, next) {
    try {
      const order = await OrderService.getOrderById(req.params.id, req.user.id);
      res.json({ success: true, data: order });
    } catch (err) { next(err); }
  }

  static async cancel(req, res, next) {
    try {
      const order = await OrderService.cancelOrder(
        req.params.id, req.user.id, req.body.reason
      );
      res.json({ success: true, data: order });
    } catch (err) { next(err); }
  }
}


// ═══ LAYER 3: SERVICE ═══════════════════════════════
// ALL business logic. No req. No res. No HTTP codes.

class OrderService {
  static async createOrder({ userId, items, couponCode, requestedBy }) {
    const user = await UserRepository.findById(userId);
    if (!user) throw new NotFoundError("User not found");
    if (user.status !== "active") throw new BusinessError("Account suspended");

    const stockCheck = await ProductRepository.checkStock(items);
    if (!stockCheck.allAvailable) {
      throw new BusinessError("Out of stock: " + stockCheck.unavailable.join(", "));
    }

    let discount = 0;
    if (couponCode) {
      const coupon = await CouponRepository.findValid(couponCode, userId);
      if (!coupon) throw new BusinessError("Invalid or expired coupon");
      discount = coupon.type === "percent"
        ? stockCheck.subtotal * (coupon.value / 100)
        : Math.min(coupon.value, stockCheck.subtotal);
      await CouponRepository.markUsed(coupon.id, userId);
    }

    const tax = (stockCheck.subtotal - discount) * 0.18;
    const total = stockCheck.subtotal - discount + tax;

    const order = await OrderRepository.createWithTransaction({
      userId, items: stockCheck.items,
      subtotal: stockCheck.subtotal, discount, tax, total, status: "pending"
    });

    // Non-blocking side effects — user does not wait for these
    Promise.allSettled([
      NotificationService.sendOrderConfirmation(user.email, order),
      InventoryService.reserveStock(order.items),
      AnalyticsService.track("order_created", { userId, total })
    ]);

    return order;
    // Notice: pure data returned, no res.json() here
  }

  static async cancelOrder(orderId, requestingUserId, reason) {
    const order = await OrderRepository.findById(orderId);
    if (!order) throw new NotFoundError("Order not found");
    if (order.userId !== requestingUserId) throw new ForbiddenError("Access denied");
    if (!["pending","processing"].includes(order.status)) {
      throw new BusinessError("Cannot cancel order in status: " + order.status);
    }
    const cancelled = await OrderRepository.updateStatus(orderId, "cancelled", { reason });
    Promise.allSettled([
      ProductRepository.restoreStock(order.items),
      PaymentService.initiateRefund(order.paymentId),
      NotificationService.sendCancellationEmail(order.userId, order)
    ]);
    return cancelled;
  }
}


// ═══ LAYER 4: REPOSITORIES ══════════════════════════
// All database access lives here — PostgreSQL AND MongoDB versions

// --- PostgreSQL version ---
class OrderRepositoryPostgres {
  static async createWithTransaction({ userId, items, subtotal, discount, tax, total, status }) {
    const client = await pgPool.connect();
    try {
      await client.query("BEGIN");
      const orderResult = await client.query(
        "INSERT INTO orders(user_id,subtotal,discount,tax,total,status) VALUES($1,$2,$3,$4,$5,$6) RETURNING *",
        [userId, subtotal, discount, tax, total, status]
      );
      const order = orderResult.rows[0];
      for (const item of items) {
        await client.query(
          "INSERT INTO order_items(order_id,product_id,qty,unit_price) VALUES($1,$2,$3,$4)",
          [order.id, item.productId, item.qty, item.price]
        );
      }
      await client.query("COMMIT");
      return { ...order, items };
    } catch (err) {
      await client.query("ROLLBACK");
      throw new DatabaseError("Failed to create order", err);
    } finally {
      client.release();
    }
  }

  static async findById(id) {
    const result = await pgPool.query(
      \`SELECT o.*, json_agg(oi.*) as items
       FROM orders o
       LEFT JOIN order_items oi ON o.id = oi.order_id
       WHERE o.id = $1
       GROUP BY o.id\`,
      [id]
    );
    return result.rows[0] || null;
  }
}

// --- MongoDB version of SAME repository ---
// Service does NOT change at all when you swap this in
class OrderRepositoryMongo {
  static async createWithTransaction({ userId, items, subtotal, discount, tax, total, status }) {
    const session = await mongoose.startSession();
    try {
      session.startTransaction();
      const [order] = await OrderModel.create(
        [{ userId, items, subtotal, discount, tax, total, status }],
        { session }
      );
      await session.commitTransaction();
      return order.toObject();
    } catch (err) {
      await session.abortTransaction();
      throw new DatabaseError("Failed to create order", err);
    } finally {
      session.endSession();
    }
  }

  static async findById(id) {
    const order = await OrderModel.findById(id).populate("items.product").lean();
    return order || null;
  }

  static async updateStatus(id, status, metadata = {}) {
    return OrderModel.findByIdAndUpdate(
      id,
      { status, metadata, updatedAt: new Date() },
      { new: true }
    ).lean();
  }
}`,
    bugs: `// BUG 1: Business logic leaking into controller

class UserControllerBad {
  static async register(req, res, next) {
    try {
      const { email, password } = req.body;
      // BUG: duplicate check is business logic, not HTTP logic
      const existing = await UserRepository.findByEmail(email);
      if (existing) return res.status(409).json({ error: "Email taken" });
      const hashed = await bcrypt.hash(password, 12);
      const user = await UserRepository.create({ email, password: hashed });
      const token = jwt.sign({ userId: user.id }, process.env.JWT_SECRET);
      res.status(201).json({ user, token });
    } catch (err) { next(err); }
  }
}
// Cannot reuse this logic in a CLI import script.
// Cannot test without HTTP context.

class UserControllerGood {
  static async register(req, res, next) {
    try {
      // Controller just passes data down and formats result up
      const { user, token } = await AuthService.register(req.body);
      res.status(201).json({ success: true, data: { user, token } });
    } catch (err) { next(err); }
  }
}


// BUG 2: Direct DB query inside service (skipping repository)

class OrderServiceBad {
  static async getOrder(id) {
    // WRONG: SQL in service — swap to MongoDB and rewrite service too
    const result = await pgPool.query(
      "SELECT * FROM orders WHERE id=$1", [id]
    );
    return result.rows[0];
  }
}

class OrderServiceGood {
  static async getOrder(id) {
    // RIGHT: go through repository — swap DB by swapping repo only
    const order = await OrderRepository.findById(id);
    if (!order) throw new NotFoundError("Order not found");
    return order;
  }
}


// BUG 3: Returning raw DB documents from repository

class UserRepositoryBad {
  static async findById(id) {
    // Returns a Mongoose document — leaks DB internals, includes __v, _id quirks
    return UserModel.findById(id);
  }
}

class UserRepositoryGood {
  static async findById(id) {
    const user = await UserModel.findById(id)
      .select("-passwordHash -__v") // never return password
      .lean(); // plain object, not Mongoose doc
    if (!user) return null;
    // Return a clean domain object
    return {
      id: user._id.toString(),
      name: user.name,
      email: user.email,
      role: user.role,
      status: user.status,
      createdAt: user.createdAt
    };
  }
}`,
    challenge: `// CHALLENGE: Refactor this spaghetti into 4 clean layers.
// Build: ProductController, ProductService,
//        ProductRepositoryPostgres, ProductRepositoryMongo

app.post("/api/products", authenticate, async (req, res) => {
  try {
    if (!req.body.name || !req.body.price || req.body.price <= 0) {
      return res.status(400).json({ error: "Invalid product data" });
    }
    if (req.user.role !== "admin") {
      return res.status(403).json({ error: "Admin only" });
    }
    const existing = await pgPool.query(
      "SELECT id FROM products WHERE name=$1", [req.body.name]
    );
    if (existing.rows[0]) {
      return res.status(409).json({ error: "Product already exists" });
    }
    const slug = req.body.name.toLowerCase().replace(/\s+/g, "-");
    const product = await pgPool.query(
      "INSERT INTO products(name,price,slug,stock,category,created_by) VALUES($1,$2,$3,$4,$5,$6) RETURNING *",
      [req.body.name, req.body.price, slug, req.body.stock||0, req.body.category, req.user.id]
    );
    await pgPool.query(
      "INSERT INTO audit_log(action,entity,entity_id,user_id) VALUES($1,$2,$3,$4)",
      ["product_created", "product", product.rows[0].id, req.user.id]
    );
    await sendSlackNotification("New product: " + req.body.name);
    res.status(201).json(product.rows[0]);
  } catch (err) {
    res.status(500).json({ error: "Server error" });
  }
});

// Requirements:
// 1. Controller: only reads req, calls service, sends res
// 2. Service: role check, duplicate check, slug generation, audit log, Slack notification
// 3. PostgreSQL repository: all SQL queries
// 4. MongoDB repository: same interface, uses Mongoose
// 5. Global error handler middleware mapping error types to HTTP codes
// 6. ProductService.createProduct must be callable from a CLI script`,
    summary: "Routes wire requests to controllers. Controllers handle HTTP. Services contain all business logic. Repositories handle all data access — PostgreSQL or MongoDB. Dependencies flow downward only. This pattern makes your entire backend testable, swappable, and maintainable."
  },

  {
    id: 2,
    title: "SOLID Principles",
    tag: "DESIGN RULES",
    color: "#a855f7",
    tldr: "5 principles that make object-oriented backends maintainable at scale. S: one class, one job. O: extend without modifying. L: subtypes must be substitutable. I: small focused interfaces. D: depend on abstractions. These are what senior engineers look for in a code review.",
    problem: `You can write code that works today but is impossible to change tomorrow without breaking everything. Classes with 500 lines doing 10 different things. Functions that require editing every time a new payment method is added. Interfaces so large that implementing them forces you to write 20 methods you don't need. SOLID is a set of 5 diagnostic principles that tell you when your design is going wrong — before the codebase becomes unmaintainable.`,
    analogy: `Think of building a CITY.

S - Single Responsibility:
  Each building has ONE purpose.
  Hospital = healing. Bank = finance. School = education.
  A building trying to be all three is unusable chaos.

O - Open/Closed:
  Add new buildings without demolishing old ones.
  New payment method? Build a new class.
  Do NOT rewrite the existing payment handler.

L - Liskov Substitution:
  Any bank branch can replace any other bank branch.
  Citizens still do banking regardless of which branch.
  If your subclass breaks when used where the parent is expected — bad design.

I - Interface Segregation:
  A library does not need a surgical wing just because it is a public building.
  Small focused interfaces. Not one giant interface for everything.

D - Dependency Inversion:
  Buildings depend on utilities (electricity, water) — not specific vendors.
  The hospital uses electricity — does not care if it comes from PowerCo A or B.
  Your service uses PaymentGateway interface — does not care if it is Razorpay or Stripe.`,
    deep: `S — SINGLE RESPONSIBILITY
  "A class should have only one reason to change."

  If UserService sends emails AND manages passwords AND handles sessions
  AND uploads avatars — it has 4 reasons to change.
  Split: UserService, AuthService, NotificationService, FileService

  The diagnostic: "If I change this class, what else might break?"
  If the answer is "many unrelated things" — split it.

O — OPEN/CLOSED
  "Open for extension, closed for modification."

  Bad: adding UPI payment requires editing processPayment() with new if/else
  Good: adding UPI means creating UPIGateway class — existing code untouched

  Achieved with: base classes + polymorphism + strategy pattern

L — LISKOV SUBSTITUTION
  "Subtypes must be substitutable for their base types."

  A function that takes NotificationChannel should work with
  EmailChannel, SMSChannel, PushChannel — all interchangeably.

  Violated when: subclass throws where parent did not,
  or ignores methods that parent promised would work.

I — INTERFACE SEGREGATION
  "Clients should not depend on interfaces they do not use."

  Bad: interface Employee { work(); manage(); hire(); fire(); audit() }
  A junior dev implementing Employee must implement hire() and fire().

  Good: split into Worker, Manager, Auditor — implement only what you need.

D — DEPENDENCY INVERSION
  "Depend on abstractions, not concretions."

  Bad: OrderService directly instantiates RazorpayGateway inside itself.
  Cannot test without real API key. Cannot swap to another gateway.

  Good: OrderService depends on PaymentGateway interface.
  Pass RazorpayGateway in production. Pass MockGateway in tests.`,
    code: `// S: SINGLE RESPONSIBILITY ─────────────────────────

// WRONG: UserService doing 5 unrelated things
class UserServiceBad {
  async register(data) { /* ... */ }
  async login(email, pass) { /* ... */ }
  async sendWelcomeEmail(user) { /* email concern mixed in */ }
  async uploadAvatar(userId, file) { /* file concern mixed in */ }
  async generateReport(userId) { /* reporting concern mixed in */ }
}

// RIGHT: one class, one responsibility
class AuthService {
  async register(data) { /* create user, hash password, return token */ }
  async login(email, password) { /* validate credentials, return token */ }
  async refreshToken(token) { /* validate refresh, return new access token */ }
}

class NotificationService {
  async sendWelcomeEmail(user) { /* ... */ }
  async sendPasswordReset(email) { /* ... */ }
  async sendOrderConfirmation(email, order) { /* ... */ }
}

class FileService {
  async uploadAvatar(userId, file) { /* compress, store in S3, return url */ }
  async deleteFile(fileId) { /* ... */ }
}


// O: OPEN/CLOSED PRINCIPLE ──────────────────────────

// WRONG: every new gateway requires editing this function
class PaymentServiceBad {
  async processPayment(method, amount) {
    if (method === "razorpay") { /* ... */ }
    else if (method === "paytm") { /* ... */ }
    else if (method === "stripe") { /* ... */ }
    // Adding PhonePe: edit this function, risk breaking Razorpay
  }
}

// RIGHT: add new gateway by adding a new class — nothing else changes
class PaymentGatewayBase {
  async charge(amount, currency, metadata) { throw new Error("implement charge()"); }
  async refund(transactionId, amount) { throw new Error("implement refund()"); }
  async getStatus(transactionId) { throw new Error("implement getStatus()"); }
}

class RazorpayGateway extends PaymentGatewayBase {
  async charge(amount, currency, metadata) {
    const order = await this.client.orders.create({
      amount: amount * 100, currency, receipt: metadata.orderId
    });
    return { gatewayOrderId: order.id, provider: "razorpay" };
  }
  async refund(transactionId, amount) { /* razorpay refund API */ }
  async getStatus(transactionId) { /* razorpay status API */ }
}

class PaytmGateway extends PaymentGatewayBase {
  async charge(amount, currency, metadata) { /* paytm charge API */ }
  async refund(transactionId, amount) { /* paytm refund API */ }
  async getStatus(transactionId) { /* paytm status API */ }
}

class PhonePeGateway extends PaymentGatewayBase {
  async charge(amount, currency, metadata) { /* phonepe charge API */ }
  async refund(transactionId, amount) { /* phonepe refund API */ }
  async getStatus(transactionId) { /* phonepe status API */ }
}

// Adding new gateway: create new class, touch NOTHING else
class PaymentService {
  constructor(gateway) { this.gateway = gateway; } // any gateway works
  async processOrderPayment(order) {
    const result = await this.gateway.charge(order.total, "INR", { orderId: order.id });
    await OrderRepository.updatePaymentStatus(order.id, "paid", result);
    return result;
  }
}

const prodService  = new PaymentService(new RazorpayGateway());
const testService  = new PaymentService(new MockGateway());


// L: LISKOV SUBSTITUTION ────────────────────────────

// REAL BACKEND EXAMPLE: notification channels
class NotificationChannel {
  async send(userId, message) { throw new Error("implement send()"); }
  async getStatus(messageId) { throw new Error("implement getStatus()"); }
}

class EmailChannel extends NotificationChannel {
  async send(userId, message) {
    const result = await emailClient.send({ to: userId, body: message });
    return { messageId: result.id, provider: "email" };
  }
  async getStatus(messageId) { return emailClient.status(messageId); }
}

class SMSChannel extends NotificationChannel {
  async send(userId, message) {
    const result = await smsClient.send({ to: userId, body: message });
    return { messageId: result.sid, provider: "sms" };
  }
  async getStatus(messageId) { return smsClient.status(messageId); }
}

// This works with ANY NotificationChannel — guaranteed by LSP
async function sendAndVerify(channel, userId, message) {
  const result = await channel.send(userId, message);
  const status = await channel.getStatus(result.messageId);
  return status.delivered;
}
// sendAndVerify(new EmailChannel(), userId, msg) ✓
// sendAndVerify(new SMSChannel(), userId, msg) ✓


// I: INTERFACE SEGREGATION ──────────────────────────

// WRONG: fat interface forces unused implementation
class ReportingBad {
  generatePDF(data) {} generateExcel(data) {} generateCSV(data) {}
  sendByEmail(report) {} uploadToS3(report) {} schedule(cron) {}
}
// A CSV exporter is forced to implement PDF, S3, email, scheduling...

// RIGHT: small focused capabilities
class CSVGenerator { generateCSV(data) {} }
class PDFGenerator { generatePDF(data) {} }
class ReportEmailer { sendByEmail(report, to) {} }
class ReportScheduler { schedule(reportFn, cronExpr) {} }

class SalesReport extends CSVGenerator {
  generateCSV(data) { /* only what it needs */ }
}
class InvoiceReport extends PDFGenerator {
  generatePDF(data) { /* only what it needs */ }
}


// D: DEPENDENCY INVERSION ───────────────────────────

// WRONG: hardcoded dependencies — untestable, unswappable
class OrderServiceBad {
  constructor() {
    this.emailer  = new SendGridEmailer();    // hardcoded
    this.payment  = new RazorpayGateway();   // hardcoded
    this.repo     = new PostgresOrderRepo(); // hardcoded
  }
}

// RIGHT: inject abstractions — any implementation works
class OrderServiceGood {
  constructor(emailer, paymentGateway, orderRepo) {
    this.emailer  = emailer;          // injected
    this.payment  = paymentGateway;   // injected
    this.repo     = orderRepo;        // injected
  }

  async createOrder(data) {
    const order = await this.repo.create(data);
    const payment = await this.payment.charge(order.total, "INR", { orderId: order.id });
    await this.emailer.send(data.userEmail, "Order confirmed", { order });
    return order;
  }
}

// Production wiring:
const service = new OrderServiceGood(
  new SendGridEmailer(),
  new RazorpayGateway(),
  new MongoOrderRepository() // or PostgresOrderRepository — service does not care
);

// Test wiring — zero real API calls:
const testService2 = new OrderServiceGood(
  new MockEmailer(),
  new MockGateway(),
  new InMemoryOrderRepository()
);`,
    bugs: `// BUG 1: SRP violation causing ripple changes

class UserService {
  async updateProfile(userId, data) {
    const user = await UserRepository.update(userId, data);
    // BUG: email logic in profile update — changes when email provider changes
    await emailClient.send(user.email, "Profile updated");
    // BUG: audit logic in profile update — changes when audit format changes
    await auditLog.write(userId, "profile_updated", data);
    // BUG: cache logic in profile update — changes when cache strategy changes
    await cache.delete("user:" + userId);
    return user;
  }
}

// FIX: use events to decouple each concern
class UserServiceFixed {
  async updateProfile(userId, data) {
    const user = await UserRepository.update(userId, data);
    EventBus.emit("user.profile_updated", { user, changes: data });
    return user;
    // NotificationService listens and sends email
    // AuditService listens and writes log
    // CacheService listens and invalidates cache
    // Each concern owns itself — changing email provider touches only NotificationService
  }
}


// BUG 2: DIP violation — impossible to unit test

class PaymentServiceBad {
  async processPayment(orderId, amount) {
    const gateway = new RazorpayGateway(); // created inside — untestable
    const result = await gateway.charge(amount, "INR", { orderId });
    // To test this function you NEED a live Razorpay account and API key
    // Your CI pipeline fails without credentials
    return result;
  }
}

// FIX: inject the gateway
class PaymentServiceFixed {
  constructor(gateway) { this.gateway = gateway; }
  async processPayment(orderId, amount) {
    return this.gateway.charge(amount, "INR", { orderId });
  }
}
// Test:       new PaymentServiceFixed(new MockGateway())
// Production: new PaymentServiceFixed(new RazorpayGateway())`,
    challenge: `// CHALLENGE: Apply all 5 SOLID principles to a notification system.

// Starting code — violates all 5 principles:
class NotificationSystem {
  async notify(userId, type, data) {
    const user = await db.query("SELECT * FROM users WHERE id=$1", [userId]);
    if (type === "email") {
      const html = "<h1>" + data.title + "</h1><p>" + data.body + "</p>";
      await sendgridClient.send({ to: user.email, subject: data.title, html });
    } else if (type === "sms") {
      await twilioClient.messages.create({ to: user.phone, body: data.body });
    } else if (type === "push") {
      await fcmClient.send({ token: user.fcmToken, notification: data });
    }
    await db.query(
      "INSERT INTO notification_log VALUES($1,$2,$3,NOW())",
      [userId, type, data.title]
    );
  }
}

// Your task:
// 1. NotificationChannel base class (S + L)
// 2. EmailChannel, SMSChannel, PushChannel, WhatsAppChannel (O — new channel = new class)
// 3. NotificationService accepting injected channels array (D)
// 4. NotificationLogger as separate class (S + I)
// 5. UserContactRepository for fetching user contact info (S)
// 6. Show adding WhatsAppChannel touches ZERO existing code (O proof)
// 7. Show testing NotificationService with MockChannel (D proof)`,
    summary: "S: one reason to change. O: extend by adding, not modifying. L: subtypes work wherever parent is expected. I: small interfaces, not fat ones. D: depend on abstractions, inject concretions. Together they make systems that grow without breaking."
  },

  {
    id: 3,
    title: "Dependency Injection & IoC",
    tag: "WIRING THE SYSTEM",
    color: "#06b6d4",
    tldr: "Dependency Injection: don't create your dependencies inside a class — receive them from outside. Inversion of Control: the container creates and wires everything, not your code. Together they make testing trivial, swapping implementations painless, and lifecycle management automatic.",
    problem: `When a class creates its own dependencies with new, you cannot test it without running everything it depends on. You cannot swap implementations without editing the class. Every new instance creates its own database connection instead of sharing a pool. DI solves all of this: a class declares what it needs, something else provides it. Tests provide mocks. Production provides real implementations. The class never knows the difference.`,
    analogy: `Think of a KITCHEN APPLIANCE STORE.

WITHOUT DI:
A blender that builds its own motor inside.
To test if the blender jar works — you must run the motor.
To upgrade the motor — you disassemble the blender.
Every blender brings its own power plant.

WITH DI:
A blender that has a socket.
You plug in any motor: quiet motor, industrial motor, test motor.
Testing: plug in a test motor that spins at 10 RPM.
Upgrading: unplug old motor, plug in new one. Blender unchanged.

The blender does not know WHICH motor it has.
It just knows it receives something that spins.

In code:
WITHOUT: UserService creates new PostgresPool() inside its constructor.
WITH: UserService receives dbPool in its constructor.

Testing: pass InMemoryDB — no real database needed.
Production: pass PostgresPool.
MongoDB migration: pass MongoPool — UserService code unchanged.`,
    deep: `THREE TYPES OF DEPENDENCY INJECTION:

1. CONSTRUCTOR INJECTION (preferred)
   class Service { constructor(repo, emailer) { ... } }
   Dependencies passed at creation. Always available. Explicit.

2. METHOD INJECTION
   class Service { processOrder(order, paymentGateway) { ... } }
   Dependency passed per call. Good for optional or varying deps.

3. PROPERTY INJECTION (avoid)
   service.emailer = new Emailer();
   Object is partially constructed — unsafe and implicit.

IoC CONTAINER (Inversion of Control):
  Manual DI: you call new and pass dependencies yourself.
  IoC Container: you register classes and their deps.
    Container reads constructor params, creates and injects everything.
    Manages lifecycle: singleton vs transient vs request-scoped.

LIFECYCLE TYPES:
  SINGLETON: one instance shared everywhere.
    Use for: DB pools, Redis clients, config, loggers, stateless services.
    
  TRANSIENT: new instance per resolve call.
    Use for: services with per-operation state.
    
  SCOPED: one instance per HTTP request.
    Use for: request context, current user data.

WHY IT MATTERS FOR TESTING:
  Without DI: testing OrderService needs real PostgreSQL + real Razorpay + real SMTP.
  Tests take 30 seconds, require internet, fail in CI without credentials.

  With DI: pass MockRepository, MockGateway, MockEmailer.
  Tests take 30ms, work offline, no credentials needed.
  This is the entire point.`,
    code: `// CONSTRUCTOR INJECTION ─────────────────────────────

class UserService {
  constructor(userRepo, emailService, cacheService, logger) {
    this.userRepo     = userRepo;
    this.emailService = emailService;
    this.cacheService = cacheService;
    this.logger       = logger;
  }

  async createUser(data) {
    this.logger.info("creating_user", { email: data.email });

    const existing = await this.userRepo.findByEmail(data.email);
    if (existing) throw new ConflictError("Email already registered");

    const user = await this.userRepo.create(data);

    Promise.allSettled([
      this.emailService.sendWelcome(user.email, user.name),
      this.cacheService.set("user:" + user.id, user, 3600)
    ]);

    return user;
  }

  async getUserById(id) {
    const cached = await this.cacheService.get("user:" + id);
    if (cached) return cached;

    const user = await this.userRepo.findById(id);
    if (!user) throw new NotFoundError("User not found");

    await this.cacheService.set("user:" + id, user, 3600);
    return user;
  }
}


// DIY IoC CONTAINER ──────────────────────────────────

class Container {
  constructor() {
    this.registrations = new Map();
    this.singletonCache = new Map();
  }

  singleton(name, factory) {
    this.registrations.set(name, { factory, lifecycle: "singleton" });
    return this;
  }

  transient(name, factory) {
    this.registrations.set(name, { factory, lifecycle: "transient" });
    return this;
  }

  resolve(name) {
    const reg = this.registrations.get(name);
    if (!reg) throw new Error("Not registered: " + name);

    if (reg.lifecycle === "singleton") {
      if (!this.singletonCache.has(name)) {
        this.singletonCache.set(name, reg.factory(this));
      }
      return this.singletonCache.get(name);
    }

    return reg.factory(this); // new instance each time
  }

  dispose() {
    // Graceful cleanup on shutdown
    for (const [name, instance] of this.singletonCache) {
      if (instance && typeof instance.close === "function") {
        instance.close().catch(e => console.error("Dispose error:", name, e));
      }
    }
    this.singletonCache.clear();
  }
}


// COMPOSITION ROOT — the ONE place where new is used ─

const container = new Container();

// Infrastructure (singletons — shared across all requests)
container.singleton("pgPool",      () => createPostgresPool(process.env.DATABASE_URL));
container.singleton("mongoClient", () => createMongoClient(process.env.MONGO_URL));
container.singleton("redisClient", () => createRedisClient(process.env.REDIS_URL));
container.singleton("logger",      () => new WinstonLogger({ service: "api" }));
container.singleton("emailClient", () => new SMTPClient(process.env.SMTP_URL));

// Repositories — swap Postgres for Mongo by changing ONE line here
container.singleton("userRepo",    c => new UserRepositoryMongo(c.resolve("mongoClient")));
container.singleton("orderRepo",   c => new OrderRepositoryPostgres(c.resolve("pgPool")));
container.singleton("productRepo", c => new ProductRepositoryMongo(c.resolve("mongoClient")));

// Services
container.singleton("cacheService",  c => new CacheService(c.resolve("redisClient")));
container.singleton("emailService",  c => new EmailService(c.resolve("emailClient")));
container.singleton("userService",   c => new UserService(
  c.resolve("userRepo"),
  c.resolve("emailService"),
  c.resolve("cacheService"),
  c.resolve("logger")
));
container.singleton("orderService",  c => new OrderService(
  c.resolve("orderRepo"),
  c.resolve("userRepo"),
  c.resolve("productRepo"),
  c.resolve("emailService"),
  c.resolve("logger")
));


// TESTING WITH MOCKS — zero real infrastructure ───────

class MockUserRepository {
  constructor() { this.users = new Map(); }
  async findByEmail(email) {
    return [...this.users.values()].find(u => u.email === email) || null;
  }
  async findById(id) { return this.users.get(id) || null; }
  async create(data) {
    const user = { id: "test_" + Date.now(), ...data, createdAt: new Date() };
    this.users.set(user.id, user);
    return user;
  }
}

class MockEmailService {
  constructor() { this.sent = []; }
  async sendWelcome(email, name) { this.sent.push({ type: "welcome", email, name }); }
}

class MockCacheService {
  constructor() { this.store = new Map(); }
  async get(key) { return this.store.get(key) || null; }
  async set(key, value) { this.store.set(key, value); }
  async delete(key) { this.store.delete(key); }
}

class MockLogger {
  info() {} warn() {} error() {} debug() {}
}

// Test runs with zero real services
async function runUserServiceTests() {
  const repo    = new MockUserRepository();
  const emailer = new MockEmailService();
  const cache   = new MockCacheService();
  const logger  = new MockLogger();

  const service = new UserService(repo, emailer, cache, logger);

  // Test 1: successful creation
  const user = await service.createUser({ email: "t@t.com", name: "Test" });
  console.assert(user.email === "t@t.com", "email mismatch");
  console.assert(emailer.sent.length === 1, "welcome email not sent");

  // Test 2: duplicate email
  try {
    await service.createUser({ email: "t@t.com", name: "Dup" });
    console.assert(false, "should have thrown");
  } catch (err) {
    console.assert(err instanceof ConflictError, "wrong error type");
  }

  console.log("All tests passed — no DB, Redis, or SMTP needed");
}`,
    bugs: `// BUG 1: Circular dependency

class UserServiceBad {
  constructor() {
    this.orderService = new OrderService(); // UserService → OrderService
  }
}
class OrderServiceBad {
  constructor() {
    this.userService = new UserService(); // OrderService → UserService → circular!
  }
}
// Node.js module system fails. One of them gets undefined.

// FIX: extract shared logic into a third service
class UserOrderQueryService {
  async getUserWithOrders(userId) { /* shared query logic */ }
}
// UserService and OrderService both depend on UserOrderQueryService
// No circular dependency


// BUG 2: Creating dependencies inside methods (not constructor)

class ControllerBad {
  handleRequest(req, res) {
    // WRONG: new instance + new DB connection on EVERY request
    const service = new UserService(new UserRepository(new PostgresPool()));
    service.doSomething();
  }
}

// FIX: inject in constructor, use across all methods
class ControllerGood {
  constructor(userService) {
    this.userService = userService; // single singleton, injected once
  }
  handleRequest(req, res) {
    this.userService.doSomething(); // reuses shared connection pool
  }
}


// BUG 3: Singleton holding mutable request state

class UserServiceBad2 {
  constructor(repo) {
    this.repo = repo;
    this.currentUser = null; // WRONG: shared across ALL concurrent requests!
  }
  async processRequest(userId) {
    this.currentUser = await this.repo.findById(userId);
    // Request A sets currentUser = UserA
    // Request B sets currentUser = UserB
    // Request A is now operating on UserB's data — data leak!
  }
}

// FIX: never store request-specific state on singleton services
class UserServiceGood2 {
  constructor(repo) { this.repo = repo; } // only stateless deps
  async processRequest(userId) {
    const user = await this.repo.findById(userId); // local variable only
    // ... use user locally, never store on this
  }
}`,
    challenge: `// CHALLENGE: Build a complete DI container for a SaaS API.

// 1. Container class with: singleton(), transient(), resolve(), dispose()

// 2. Register and wire these components:
//    Infrastructure:
//      PostgresPool (connection string from env)
//      MongoClient (connection string from env)
//      RedisClient (connection string from env)
//      Logger (service name: "saas-api")
//
//    Repositories (choose which DB each uses):
//      UserRepository → MongoDB (users change schema often)
//      ProductRepository → MongoDB (flexible attributes)
//      OrderRepository → PostgreSQL (financial data, ACID needed)
//
//    Services:
//      AuthService (userRepo, logger)
//      ProductService (productRepo, cacheService, logger)
//      OrderService (orderRepo, userRepo, productRepo, emailService, logger)
//      CacheService (redisClient)
//      EmailService (logger)
//
//    Controllers:
//      AuthController (authService)
//      ProductController (productService)
//      OrderController (orderService)

// 3. Create a TEST container factory that swaps ALL infrastructure:
//    InMemoryUserRepository, InMemoryOrderRepository, MockEmailService, MockCacheService

// 4. Write a test using the test container that:
//    - Creates a user
//    - Creates an order for that user
//    - Verifies MockEmailService received an "order_confirmed" email
//    - Verifies MockCacheService has the order cached
//    - Zero real infrastructure touched

// 5. container.dispose() closes all DB connections and Redis on shutdown`,
    summary: "Inject dependencies via constructor — never create them inside. One composition root wires everything. Singletons for shared stateless infrastructure. Mocks for testing. Every class becomes testable in complete isolation."
  },

  {
    id: 4,
    title: "Database Design & Indexing",
    tag: "DATA LAYER MASTERY",
    color: "#10b981",
    tldr: "Bad database design causes performance problems that no amount of code optimization can fix. Good indexing turns 10-second queries into 1ms queries. Understanding when to use PostgreSQL vs MongoDB, how indexes work internally, and how to eliminate N+1 queries is what separates backends that scale from backends that die under load.",
    problem: `Most developers treat the database as a dumb storage layer. They write whatever queries come naturally and wonder why the app is slow at 10,000 users. The truth: 90% of backend performance problems are database problems. Wrong data model. Missing foreign key index in PostgreSQL. Unindexed query field in MongoDB. Selecting all columns when you need two. N+1 queries loading 100 users then 100 separate queries for their orders. These are not code problems — they are database design problems that must be fixed at the data layer.`,
    analogy: `Think of a LIBRARY.

WITHOUT indexing:
Finding a book means reading every book from shelf 1.
Works for 100 books. Fails for 1 million.

WITH indexing:
The card catalog tells you exactly which shelf and position.
O(1) lookup regardless of library size.

PostgreSQL B-Tree index = sorted card catalog.
MongoDB index = separate lookup structure per field.

POSTGRESQL vs MONGODB — choosing the right library:

PostgreSQL (relational):
  Best for: financial data, user accounts, orders, anything with relationships
  Strength: ACID transactions, JOINs, constraints, strong consistency
  Think: spreadsheet with strict column types and rules

MongoDB (document):
  Best for: product catalogs, logs, content, user activity, anything variable/nested
  Strength: flexible schema, horizontal scaling, nested documents, fast reads
  Think: folder of JSON files with powerful query engine on top

Real production systems use BOTH:
  PostgreSQL: orders, payments, users (financial integrity required)
  MongoDB: products, sessions, activity logs, catalog (flexibility required)`,
    deep: `POSTGRESQL INDEXING INTERNALS:

B-TREE INDEX (default)
  A balanced sorted tree. Leaf nodes point to table rows.
  Perfect for: =, <, >, BETWEEN, ORDER BY, LIKE 'prefix%'
  Bad for: LIKE '%suffix', full-text search

PARTIAL INDEX
  Index only rows matching a condition.
  CREATE INDEX idx_pending ON orders(user_id) WHERE status = 'pending'
  Much smaller, faster for queries that always filter on that condition.

COMPOSITE INDEX (multi-column)
  (a, b, c) helps queries on: a alone, a+b, a+b+c
  Does NOT help queries on: b alone, c alone, b+c (leftmost prefix rule)

GIN INDEX
  For: JSONB fields, arrays, full-text search
  Stores inverted mapping: value → rows containing it

PostgreSQL does NOT auto-index foreign keys (MySQL does).
Always add: CREATE INDEX idx_orders_user_id ON orders(user_id)

MONGODB INDEXING:

Single field:  db.products.createIndex({ price: 1 })
Compound:      db.products.createIndex({ category: 1, price: -1 })
Text:          db.products.createIndex({ name: "text", description: "text" })
Sparse:        only indexes documents where the field exists
TTL:           auto-expires documents after N seconds (sessions, tokens)

EXPLAIN to see what the query planner does:
  PostgreSQL: EXPLAIN ANALYZE SELECT ...
  MongoDB:    db.collection.find({...}).explain("executionStats")

N+1 QUERY PROBLEM:
  Fetch N orders → 1 query per order to get user = N+1 total queries
  At 100 orders: 101 DB round trips where 1 would do.

  Fix PostgreSQL: JOIN in one query
  Fix MongoDB: $lookup aggregation or populate()
  Fix ORM: eager loading (include / populate)`,
    code: `// POSTGRESQL SCHEMA ─────────────────────────────────

/*
CREATE TABLE users (
  id         UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
  email      VARCHAR(255) UNIQUE NOT NULL,
  name       VARCHAR(255) NOT NULL,
  password   VARCHAR(255) NOT NULL,
  role       VARCHAR(50)  NOT NULL DEFAULT 'viewer'
               CHECK (role IN ('admin','editor','viewer')),
  status     VARCHAR(50)  NOT NULL DEFAULT 'active',
  created_at TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

CREATE TABLE orders (
  id         UUID          PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id    UUID          NOT NULL REFERENCES users(id),
  status     VARCHAR(50)   NOT NULL DEFAULT 'pending',
  subtotal   NUMERIC(12,2) NOT NULL,
  discount   NUMERIC(12,2) NOT NULL DEFAULT 0,
  tax        NUMERIC(12,2) NOT NULL DEFAULT 0,
  total      NUMERIC(12,2) NOT NULL,
  created_at TIMESTAMPTZ   NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ   NOT NULL DEFAULT NOW()
);

CREATE TABLE order_items (
  id          UUID          PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id    UUID          NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  product_id  VARCHAR(255)  NOT NULL,  -- MongoDB ObjectId stored as string
  qty         INTEGER       NOT NULL CHECK (qty > 0),
  unit_price  NUMERIC(12,2) NOT NULL,
  total_price NUMERIC(12,2) GENERATED ALWAYS AS (qty * unit_price) STORED
);

-- INDEXES: always index foreign keys in PostgreSQL
CREATE INDEX idx_orders_user_id    ON orders(user_id);
CREATE INDEX idx_items_order_id    ON order_items(order_id);
CREATE INDEX idx_orders_status     ON orders(status);
-- Composite: common query = "pending orders for a user sorted by date"
CREATE INDEX idx_orders_user_status_date ON orders(user_id, status, created_at DESC);
-- Partial: only index active records (smaller, faster)
CREATE INDEX idx_active_orders ON orders(user_id, created_at DESC)
  WHERE status NOT IN ('cancelled', 'deleted');
*/


// MONGODB SCHEMA — product catalog ───────────────────

/*
  Products collection — denormalized for fast reads, no JOIN needed
  {
    _id: ObjectId,
    name: "iPhone 15 Pro",
    slug: "iphone-15-pro",
    description: "...",
    price: 134900,
    stock: 50,
    category: { id: ObjectId, name: "Electronics", slug: "electronics" },
    attributes: {           // flexible — different per product type
      storage: "256GB",
      color: "Natural Titanium",
      warranty: "1 year"
    },
    images: [{ url: "...", alt: "...", isPrimary: true }],
    tags: ["apple", "smartphone", "5g"],
    isActive: true,
    createdAt: ISODate
  }

  MongoDB indexes:
  db.products.createIndex({ slug: 1 }, { unique: true })
  db.products.createIndex({ "category.id": 1, isActive: 1, price: 1 })
  db.products.createIndex({ tags: 1 })
  db.products.createIndex({ isActive: 1, createdAt: -1 })
  db.products.createIndex(
    { name: "text", description: "text", tags: "text" },
    { weights: { name: 10, tags: 5, description: 1 } }
  )
  // TTL index — auto-delete expired sessions after their expiresAt timestamp
  db.sessions.createIndex({ expiresAt: 1 }, { expireAfterSeconds: 0 })
*/


// ELIMINATING N+1 IN POSTGRESQL ───────────────────────

class OrderRepository {
  // WRONG: N+1 — 1 query for orders + 1 per order for items
  async getOrdersBad(userId) {
    const orders = await pgPool.query(
      "SELECT * FROM orders WHERE user_id=$1", [userId]
    );
    for (const order of orders.rows) {
      order.items = await pgPool.query(
        "SELECT * FROM order_items WHERE order_id=$1", [order.id]
      );
    }
    return orders.rows;
    // 100 orders = 101 database round trips
  }

  // RIGHT: single JOIN — always 1 round trip
  async getOrdersGood(userId) {
    const result = await pgPool.query(
      \`SELECT
         o.id, o.status, o.total, o.created_at,
         json_agg(
           json_build_object(
             'productId', oi.product_id,
             'qty',       oi.qty,
             'price',     oi.unit_price,
             'total',     oi.total_price
           ) ORDER BY oi.id
         ) AS items
       FROM orders o
       LEFT JOIN order_items oi ON o.id = oi.order_id
       WHERE o.user_id = $1
       GROUP BY o.id
       ORDER BY o.created_at DESC\`,
      [userId]
    );
    return result.rows;
    // Always 1 database round trip regardless of order count
  }

  // Cursor-based pagination — fast at any depth
  async getOrdersPaginated(userId, cursor, limit = 20) {
    const params = [userId, limit];
    let cursorClause = "";
    if (cursor) {
      params.push(cursor);
      cursorClause = "AND o.created_at < $" + params.length;
    }
    const result = await pgPool.query(
      \`SELECT o.id, o.status, o.total, o.created_at
       FROM orders o
       WHERE o.user_id = $1 \${cursorClause}
       ORDER BY o.created_at DESC
       LIMIT $2\`,
      params
    );
    const items = result.rows;
    const nextCursor = items.length === limit
      ? items[items.length - 1].created_at.toISOString()
      : null;
    return { items, nextCursor };
    // Fast at page 1000 because it never scans discarded rows
  }
}


// ELIMINATING N+1 IN MONGODB ─────────────────────────

class ProductRepository {
  // WRONG: N+1 in MongoDB — populate per item
  async getCategoryProductsBad(categoryId) {
    const products = await ProductModel.find({ "category.id": categoryId });
    for (const product of products) {
      product.reviewSummary = await ReviewModel.findOne({ productId: product._id });
      // 1 + N queries again
    }
    return products;
  }

  // RIGHT: $lookup aggregation — single pipeline
  async getCategoryProductsGood(categoryId, { page = 1, limit = 20 } = {}) {
    return ProductModel.aggregate([
      // Stage 1: filter
      { $match: { "category.id": new ObjectId(categoryId), isActive: true } },

      // Stage 2: sort
      { $sort: { createdAt: -1 } },

      // Stage 3: join reviews in single pipeline
      { $lookup: {
        from: "reviews",
        localField: "_id",
        foreignField: "productId",
        pipeline: [
          { $group: { _id: null, avg: { $avg: "$rating" }, count: { $sum: 1 } } }
        ],
        as: "reviewStats"
      }},

      // Stage 4: flatten review stats
      { $addFields: {
        avgRating: { $ifNull: [{ $first: "$reviewStats.avg" }, 0] },
        reviewCount: { $ifNull: [{ $first: "$reviewStats.count" }, 0] }
      }},

      // Stage 5: paginate + count in parallel
      { $facet: {
        items: [
          { $skip: (page - 1) * limit },
          { $limit: limit },
          { $project: { name: 1, slug: 1, price: 1, stock: 1,
                         category: 1, avgRating: 1, reviewCount: 1,
                         images: { $slice: ["$images", 1] } } }
        ],
        total: [{ $count: "n" }]
      }}
    ]);
    // Always 1 aggregation pipeline — no N+1
  }
}`,
    bugs: `// BUG 1: Missing foreign key index in PostgreSQL

// PostgreSQL does NOT automatically index foreign keys.
// This query is a full table scan without an explicit index:
//   SELECT * FROM orders WHERE user_id = $1
// At 1 million orders: seconds per query.
// At 10 concurrent requests: DB becomes unresponsive.

// ALWAYS add after creating tables with foreign keys:
// CREATE INDEX idx_orders_user_id ON orders(user_id);
// CREATE INDEX idx_order_items_order_id ON order_items(order_id);
// CREATE INDEX idx_order_items_product_id ON order_items(product_id);
// This is the single most common PostgreSQL performance mistake.


// BUG 2: OFFSET pagination collapses at scale

async function getProductsBad(page, limit) {
  // WRONG: OFFSET scans and discards N rows before returning limit rows
  // Page 1: skip 0 rows — fast
  // Page 500: skip 10,000 rows — PostgreSQL reads and discards 10,000 rows
  // Page 5000: skip 100,000 rows — effectively a full table scan
  return pgPool.query(
    "SELECT * FROM products ORDER BY created_at DESC LIMIT $1 OFFSET $2",
    [limit, (page - 1) * limit]
  );
}

async function getProductsGood(cursor, limit) {
  // RIGHT: keyset/cursor pagination — always O(log n) via index
  if (cursor) {
    return pgPool.query(
      "SELECT * FROM products WHERE created_at < $1 ORDER BY created_at DESC LIMIT $2",
      [cursor, limit]
    );
  }
  return pgPool.query(
    "SELECT * FROM products ORDER BY created_at DESC LIMIT $1", [limit]
  );
  // Response includes: { items, nextCursor: items[last].created_at }
  // Speed: identical whether you're on page 1 or page 50,000
}


// BUG 3: No transaction for multi-step financial writes

async function transferFundsBad(fromId, toId, amount) {
  await pgPool.query("UPDATE wallets SET balance=balance-$1 WHERE id=$2", [amount, fromId]);
  // SERVER CRASHES HERE
  // fromId is debited. toId never credited. Money vanished.
  await pgPool.query("UPDATE wallets SET balance=balance+$1 WHERE id=$2", [amount, toId]);
}

async function transferFundsGood(fromId, toId, amount) {
  const client = await pgPool.connect();
  try {
    await client.query("BEGIN");
    const from = await client.query(
      "SELECT balance FROM wallets WHERE id=$1 FOR UPDATE", [fromId]
    );
    if (from.rows[0].balance < amount) throw new BusinessError("Insufficient funds");
    await client.query("UPDATE wallets SET balance=balance-$1 WHERE id=$2", [amount, fromId]);
    await client.query("UPDATE wallets SET balance=balance+$1 WHERE id=$2", [amount, toId]);
    await client.query("COMMIT");
    // Both succeed or both rollback — atomically
  } catch (err) {
    await client.query("ROLLBACK");
    throw err;
  } finally {
    client.release();
  }
}`,
    challenge: `// CHALLENGE: Design a hybrid PostgreSQL + MongoDB system.

// You are building an e-learning platform.
// Decide which database each entity uses and why.

// Entities:
// - User (id, name, email, password, role, plan, stripeCustomerId, createdAt)
// - Course (id, title, slug, instructorId, price, status, category, tags, thumbnail)
// - Lesson (id, courseId, title, order, duration, type, content, isPreview)
// - Enrollment (id, userId, courseId, enrolledAt, completedAt, pricePaid, status)
// - Progress (id, enrollmentId, lessonId, completedAt, watchedSeconds)
// - Review (id, courseId, userId, rating, comment, createdAt)
// - UserActivity (userId, action, metadata, timestamp) — high write volume

// Part 1: For each entity decide: PostgreSQL or MongoDB and explain why.

// Part 2: Write indexes for these exact queries:
// Q1: All active courses in a category sorted by enrollment count
// Q2: A user's enrolled courses with completion percentage
// Q3: Lessons for a course in order
// Q4: Fast check: is user X enrolled in course Y? (auth check on every video load)
// Q5: Course rating summary (avg, count, distribution 1-5)

// Part 3: Fix the N+1:
async function getDashboardBad(userId) {
  const enrollments = await Enrollment.find({ userId });
  for (const e of enrollments) {
    e.course = await Course.findById(e.courseId);
    e.progress = await Progress.find({ enrollmentId: e.id });
    e.nextLesson = await Lesson.findOne({
      courseId: e.courseId,
      _id: { $nin: e.progress.map(p => p.lessonId) }
    });
  }
  return enrollments;
}
// Rewrite as a single aggregation pipeline (MongoDB) or single JOIN query (PostgreSQL)`,
    summary: "PostgreSQL for financial/relational data. MongoDB for catalogs/logs/flexible schemas. Index every foreign key in PostgreSQL. Use cursor pagination at scale. Eliminate N+1 with JOINs or aggregation pipelines. Always use transactions for multi-step financial writes."
  },

  {
    id: 5,
    title: "Caching with Redis",
    tag: "SPEED LAYER",
    color: "#ef4444",
    tldr: "Caching stores the result of expensive operations so the next request gets it instantly. Redis is an in-memory data store used for caching, sessions, rate limiting, and pub/sub. The hard part is not the caching — it is cache invalidation: knowing exactly when to throw away stale data.",
    problem: `Your MongoDB aggregation takes 300ms. You have 1000 users hitting the same product listing per second. That is 300,000ms of database load per second — your DB dies. With caching, the first request takes 300ms and stores the result in Redis. The next 999 requests get it in 1ms. Database sees 1 aggregation per TTL period instead of 1000 per second. This is not optimization — it is survival at scale.`,
    analogy: `Think of a REFERENCE BOOK in an office.

WITHOUT CACHE:
Every time someone needs the Mumbai PIN codes,
they drive to the government office (database),
wait in queue (query time),
get the list, drive back.
100 people need it: 100 trips.

WITH CACHE:
First person goes, gets the list, makes a photocopy (cache),
leaves it on the office shelf.
Next 99 people grab the photocopy instantly.
Nobody drives anywhere.

THE EXPIRY PROBLEM:
After 6 months, PIN codes change.
The photocopy is now stale.
Someone needs to make a fresh trip and update the copy.
This is TTL — how long before the copy expires.

Too short TTL: cache is useless, too many DB trips.
Too long TTL: users see outdated data.

CACHE INVALIDATION: knowing WHEN to throw away the photocopy.
  Time-based (TTL): simple, may briefly serve stale data.
  Event-driven: accurate, invalidate on every DB write.`,
    deep: `CACHING STRATEGIES:

CACHE-ASIDE (Lazy Loading) — most common
  1. Check cache. Hit → return immediately.
  2. Miss → query DB → store in cache → return.
  App controls cache population.
  Pro: only caches what is actually requested.
  Con: first request is always slow (cold start).

WRITE-THROUGH
  Write to DB AND cache simultaneously.
  Pro: cache always has fresh data.
  Con: writes are slower. Cache may have unused data.

WRITE-BEHIND (Write-Back)
  Write to cache immediately. DB write is asynchronous.
  Pro: very fast writes.
  Con: risk of data loss if cache crashes before async DB write.

REDIS DATA STRUCTURES (not just key-value):
  String: cache values, counters, feature flags
  Hash: session data, user preferences (field-level access)
  List: recent activity, simple queues (LPUSH/RPOP)
  Set: unique tags, user permissions, deduplication
  Sorted Set: leaderboards, rate limiting windows, scheduled jobs
  Pub/Sub: real-time events between services
  Stream: persistent event log

CACHE KEY DESIGN:
  Include all dimensions that make data unique:
  product:{id}                    — single product
  products:list:{page}:{limit}:{categoryId}:{sort} — list
  user:{id}:orders               — user-specific list
  Never share keys across users or tenants.

CACHE STAMPEDE (thundering herd):
  A popular cached entry expires.
  1000 concurrent requests all get cache miss simultaneously.
  All 1000 hit the database — DB dies.
  
  Fix: mutex lock — first request fetches, others wait for it.
  Fix: probabilistic early refresh — randomly refresh before TTL expires.`,
    code: `// CACHE SERVICE ──────────────────────────────────────

class CacheService {
  constructor(redisClient) {
    this.redis = redisClient;
    this.DEFAULT_TTL = 3600; // 1 hour
  }

  async get(key) {
    try {
      const value = await this.redis.get(key);
      return value ? JSON.parse(value) : null;
    } catch (err) {
      // Cache failure must NEVER crash your app
      console.error("Cache get error:", err.message);
      return null; // graceful degradation
    }
  }

  async set(key, value, ttl = this.DEFAULT_TTL) {
    try {
      if (value === null || value === undefined) return false;
      await this.redis.setex(key, ttl, JSON.stringify(value));
      return true;
    } catch (err) {
      console.error("Cache set error:", err.message);
      return false; // non-fatal
    }
  }

  async delete(key) {
    try { await this.redis.del(key); } catch (err) { /* non-fatal */ }
  }

  async deleteByPattern(pattern) {
    try {
      // Use SCAN not KEYS — SCAN is non-blocking
      let cursor = "0";
      do {
        const [newCursor, keys] = await this.redis.scan(cursor, "MATCH", pattern, "COUNT", 100);
        cursor = newCursor;
        if (keys.length > 0) await this.redis.del(...keys);
      } while (cursor !== "0");
    } catch (err) { console.error("Cache pattern delete error:", err.message); }
  }

  // Cache-aside helper
  async getOrSet(key, fetchFn, ttl = this.DEFAULT_TTL) {
    const cached = await this.get(key);
    if (cached !== null) return { data: cached, fromCache: true };

    const fresh = await fetchFn();
    if (fresh !== null && fresh !== undefined) {
      await this.set(key, fresh, ttl);
    }
    return { data: fresh, fromCache: false };
  }

  // With mutex — prevents cache stampede
  async getOrSetWithLock(key, fetchFn, ttl = this.DEFAULT_TTL) {
    const cached = await this.get(key);
    if (cached !== null) return cached;

    const lockKey = "lock:" + key;
    const lockAcquired = await this.redis.set(lockKey, "1", "EX", 10, "NX");

    if (!lockAcquired) {
      // Another request is fetching — poll for result
      for (let i = 0; i < 20; i++) {
        await new Promise(r => setTimeout(r, 50));
        const result = await this.get(key);
        if (result !== null) return result;
      }
      return fetchFn(); // fallback after timeout
    }

    try {
      const fresh = await fetchFn();
      await this.set(key, fresh, ttl);
      return fresh;
    } finally {
      await this.redis.del(lockKey);
    }
  }
}


// CACHING IN MONGODB REPOSITORY ──────────────────────

class ProductRepository {
  constructor(mongoClient, cache) {
    this.mongo = mongoClient;
    this.cache = cache;
  }

  async findById(id) {
    const { data } = await this.cache.getOrSet(
      "product:" + id,
      () => ProductModel.findById(id).lean(),
      7200 // 2 hours — products change infrequently
    );
    return data;
  }

  async update(id, updateData) {
    const product = await ProductModel.findByIdAndUpdate(
      id, updateData, { new: true }
    ).lean();

    // Invalidate on every write
    await this.cache.delete("product:" + id);
    await this.cache.deleteByPattern("products:list:*");
    await this.cache.deleteByPattern("category:" + product.category.id + ":*");

    return product;
  }

  async findActive({ page = 1, limit = 20, categoryId, sort = "createdAt" } = {}) {
    const cacheKey = "products:list:" + page + ":" + limit + ":" +
                     (categoryId || "all") + ":" + sort;

    const { data } = await this.cache.getOrSet(
      cacheKey,
      async () => {
        const match = { isActive: true };
        if (categoryId) match["category.id"] = new ObjectId(categoryId);

        const [result] = await ProductModel.aggregate([
          { $match: match },
          { $sort: { [sort]: -1 } },
          { $facet: {
            items: [
              { $skip: (page - 1) * limit },
              { $limit: limit },
              { $project: { name:1, slug:1, price:1, stock:1, category:1,
                             images: { $slice: ["$images", 1] } } }
            ],
            total: [{ $count: "n" }]
          }}
        ]);

        return {
          items: result.items,
          total: result.total[0]?.n || 0
        };
      },
      300 // 5 minutes — lists can be slightly stale
    );

    return data;
  }
}


// REDIS FOR SESSIONS ──────────────────────────────────

class SessionStore {
  constructor(redisClient) {
    this.redis = redisClient;
    this.TTL = 86400; // 24 hours
  }

  key(sessionId) { return "session:" + sessionId; }

  async create(userId, meta = {}) {
    const sessionId = crypto.randomUUID();
    const session = {
      id: sessionId, userId,
      createdAt: new Date().toISOString(),
      lastActiveAt: new Date().toISOString(),
      ...meta
    };
    await this.redis.setex(this.key(sessionId), this.TTL, JSON.stringify(session));
    return sessionId;
  }

  async get(sessionId) {
    const data = await this.redis.get(this.key(sessionId));
    return data ? JSON.parse(data) : null;
  }

  async refresh(sessionId) {
    const session = await this.get(sessionId);
    if (!session) return false;
    session.lastActiveAt = new Date().toISOString();
    await this.redis.setex(this.key(sessionId), this.TTL, JSON.stringify(session));
    return true;
  }

  async destroy(sessionId) {
    await this.redis.del(this.key(sessionId));
  }
}


// RATE LIMITING WITH REDIS SORTED SET ─────────────────

class RateLimiter {
  constructor(redisClient) { this.redis = redisClient; }

  async check(identifier, limit, windowMs) {
    const key = "ratelimit:" + identifier;
    const now = Date.now();
    const windowStart = now - windowMs;

    const pipeline = this.redis.pipeline();
    pipeline.zremrangebyscore(key, 0, windowStart);
    pipeline.zcard(key);
    pipeline.zadd(key, now, now.toString());
    pipeline.pexpire(key, windowMs);

    const results = await pipeline.exec();
    const count = results[1][1];

    return {
      allowed: count < limit,
      remaining: Math.max(0, limit - count - 1),
      resetAt: new Date(now + windowMs)
    };
  }
}

// Middleware
function rateLimitMiddleware(limit, windowSeconds) {
  const limiter = new RateLimiter(redisClient);
  return async (req, res, next) => {
    const id = req.user?.id || req.ip;
    const result = await limiter.check(id, limit, windowSeconds * 1000);

    res.setHeader("X-RateLimit-Limit", limit);
    res.setHeader("X-RateLimit-Remaining", result.remaining);

    if (!result.allowed) {
      return res.status(429).json({
        success: false,
        error: { code: "RATE_LIMITED", message: "Too many requests", retryAfter: result.resetAt }
      });
    }
    next();
  };
}`,
    bugs: `// BUG 1: Shared cache key across users

async function getOrdersBad(userId) {
  const cached = await cache.get("orders"); // WRONG: shared key!
  if (cached) return cached;
  const orders = await OrderRepository.findByUser(userId);
  await cache.set("orders", orders);
  return orders;
  // User A gets User B's orders — data leak
}

async function getOrdersGood(userId) {
  const key = "orders:user:" + userId; // user-scoped key
  const { data } = await cache.getOrSet(
    key, () => OrderRepository.findByUser(userId), 300
  );
  return data;
}


// BUG 2: Not invalidating cache on write

async function updateProductBad(id, data) {
  await ProductRepository.update(id, data); // updates MongoDB
  // Cache still has old product — users see stale price for up to 2 hours!
}

async function updateProductGood(id, data) {
  const product = await ProductRepository.update(id, data);
  // Invalidate every cache key that might contain this product
  await cache.delete("product:" + id);
  await cache.deleteByPattern("products:list:*");
  await cache.deleteByPattern("category:" + product.category.id + ":*");
  return product;
}


// BUG 3: Using KEYS command in production

async function clearUserCachesBad(userId) {
  // WRONG: KEYS is O(N) — blocks Redis until it scans every key
  // At 1 million keys: Redis is unresponsive for seconds
  const keys = await redis.keys("user:" + userId + ":*");
  if (keys.length) await redis.del(...keys);
}

async function clearUserCachesGood(userId) {
  // RIGHT: SCAN is O(1) per call, cursor-based, non-blocking
  let cursor = "0";
  do {
    const [newCursor, keys] = await redis.scan(
      cursor, "MATCH", "user:" + userId + ":*", "COUNT", 50
    );
    cursor = newCursor;
    if (keys.length) await redis.del(...keys);
  } while (cursor !== "0");
}`,
    challenge: `// CHALLENGE: Build a complete caching layer for a product catalog

// The catalog: 100,000 products, 200 categories, search, listing, individual pages

// Build CatalogCacheService with:

// 1. getProduct(id) → cache 2 hours
//    Invalidate when product is updated or deleted

// 2. getProductList(filters) → cache 5 minutes
//    filters: { categoryId?, minPrice?, maxPrice?, page, limit, sort }
//    Build a deterministic cache key (order of filter keys must not matter)
//    Invalidate ALL list caches when ANY product changes

// 3. getCategorySummary() → cache 1 hour
//    Returns: [{ id, name, slug, productCount, minPrice, maxPrice }]
//    Invalidate when any product changes category

// 4. searchProducts(query, filters) → cache 15 minutes
//    Normalize query: lowercase, trim, sort words alphabetically
//    so "Blue iPhone" and "iphone blue" hit the same cache key

// 5. invalidateProductCaches(productId, oldCategoryId, newCategoryId)
//    Called after any product change. Must invalidate:
//    exact product key, all list caches, category summary,
//    and if category changed: old category caches too

// 6. warmupCache() → run on server startup, non-blocking
//    Pre-load: top 50 products, all category summaries
//    Log: "cache warmup complete, N keys loaded"

// Bonus: Track hit/miss rate using Redis counters
//    Expose at GET /admin/cache-stats:
//    { hits, misses, hitRate, totalKeys, memoryUsedMB }`,
    summary: "Cache-aside: check cache, miss → fetch DB → store → return. Key design must include all unique dimensions. Always invalidate on write. Cache failures must degrade gracefully — never crash the app. Rate limiting with Redis sorted sets is accurate and production-grade."
  },

  {
    id: 6,
    title: "Message Queues & Background Jobs",
    tag: "ASYNC PROCESSING",
    color: "#8b5cf6",
    tldr: "Some work should not block the HTTP response. Sending emails, processing images, generating reports, syncing data — these go into a queue and are processed by workers in the background. The API responds immediately. The work happens asynchronously. This is how you build systems that stay fast under heavy load.",
    problem: `Your POST /orders endpoint takes 3 seconds because it: saves to DB, charges payment, sends confirmation email, updates inventory, posts to Slack, generates PDF receipt, and syncs analytics. The user waits 3 seconds for what should feel instant. If any step fails, the whole request fails. If you get 100 concurrent orders, everything queues up.

Message queues decouple the trigger from the work. The API does the minimum critical work (save order, charge payment) and responds immediately. Everything else goes into a queue. Workers process it in the background. If email fails: retry. If Slack is down: retry later. If a worker crashes: job stays in queue. User never waits. System never overloads.`,
    analogy: `Think of a POST OFFICE.

WITHOUT QUEUES (synchronous):
You hand the counter person your package.
They physically walk to the truck, load it, come back.
You wait 20 minutes for what takes 30 seconds at the counter.
100 people arrive: everyone waits 20 minutes each.

WITH QUEUES (asynchronous):
You hand the package to the counter person (API responds in 2 seconds).
They put it in the OUTGOING BIN (message queue).
Delivery trucks (workers) come regularly, pick up batches, deliver.
You walked in, dropped off, walked out. The delivery happens independently.

DEAD LETTER QUEUE:
If a package cannot be delivered after 3 attempts,
it goes to the Problem Shelf for manual review.
Package was not lost — it is held for inspection.

This is exactly what happens with failed jobs:
after max retries, they move to the dead letter queue for debugging.`,
    deep: `QUEUE CONCEPTS:

PRODUCER: adds jobs to the queue (your API handler)
CONSUMER / WORKER: processes jobs from the queue (separate process)
JOB: unit of work with payload data, options, and metadata
QUEUE: named channel for a category of jobs (email, order-processing, etc.)

JOB LIFECYCLE:
  waiting → active → completed
                   → failed → waiting (retry with backoff)
                            → dead letter (max retries exceeded)

JOB OPTIONS:
  attempts: how many times to try before giving up
  backoff: fixed | exponential — how long to wait between retries
  delay: process this job N ms from now (scheduled jobs)
  priority: urgent jobs process before normal jobs in same queue
  repeat: cron expression for recurring jobs

RETRY STRATEGIES:
  Fixed: retry after 5 seconds each time
  Exponential: 1s, 2s, 4s, 8s, 16s — gives downstream services time to recover
  Jitter: add random delay to prevent synchronized retry storms

CONCURRENCY:
  Worker concurrency = how many jobs processed simultaneously
  Too low: slow processing, jobs pile up
  Too high: overwhelms downstream (email API, DB, external services)
  Match to your bottleneck: email API at 100/min → concurrency 2 = 120/min safe

IDEMPOTENCY:
  A job may run more than once (network error caused duplicate addition).
  Design every job handler to be safe to run multiple times.
  Check: "has this job already been processed?" before doing work.

WHAT GOES IN A QUEUE vs STAYS SYNCHRONOUS:
  Synchronous (must complete before responding):
    - DB write for the primary record
    - Payment charge
    - Stock reservation

  Asynchronous (queue it):
    - Confirmation email
    - Inventory sync
    - PDF generation
    - Analytics events
    - Webhook delivery
    - Push notifications`,
    code: `// QUEUE DEFINITIONS ──────────────────────────────────

const QUEUES = {
  EMAIL:        "email",
  NOTIFICATION: "notification",
  ORDER:        "order-processing",
  REPORT:       "report-generation",
  WEBHOOK:      "webhook-delivery",
  ANALYTICS:    "analytics",
  MEDIA:        "media-processing"
};


// ORDER SERVICE — fast critical path + async side effects ─

class OrderService {
  constructor(orderRepo, paymentGateway, queues, logger) {
    this.orderRepo = orderRepo;
    this.payment   = paymentGateway;
    this.queues    = queues;
    this.logger    = logger;
  }

  async createOrder(data) {
    // CRITICAL PATH — must complete before API responds
    // Only do what is required to confirm the order
    const order = await this.orderRepo.create(data);

    const payment = await this.payment.charge(order.total, "INR", {
      orderId: order.id
    });
    await this.orderRepo.updatePaymentStatus(order.id, payment.transactionId);

    this.logger.info("order_created", { orderId: order.id, total: order.total });

    // NON-CRITICAL PATH — queue everything else
    // User gets their response NOW. Workers handle these in background.
    await Promise.all([
      // Priority 2 — process within seconds
      this.queues[QUEUES.EMAIL].add(
        "order_confirmation",
        { userId: data.userId, orderId: order.id, orderData: order },
        { priority: 2, attempts: 5, backoff: { type: "exponential", delay: 1000 } }
      ),

      // Priority 3 — process within seconds
      this.queues[QUEUES.ORDER].add(
        "update_inventory",
        { items: order.items, orderId: order.id },
        { priority: 3, attempts: 10, backoff: { type: "exponential", delay: 500 } }
      ),

      // Priority 5 — process within minutes (analytics can lag)
      this.queues[QUEUES.ANALYTICS].add(
        "track_event",
        { event: "order_placed", userId: data.userId, properties: { total: order.total } },
        { priority: 5, attempts: 1 }
      ),

      // Priority 4 — webhook delivery
      this.queues[QUEUES.WEBHOOK].add(
        "deliver_webhook",
        { event: "order.created", payload: order, userId: data.userId },
        { priority: 4, attempts: 7, backoff: { type: "exponential", delay: 2000 } }
      )
    ]);

    return order;
    // Response time: ~200ms (DB write + payment charge)
    // Without queues: ~3000ms (DB + payment + email + inventory + analytics + webhook)
  }
}


// WORKER: EMAIL ──────────────────────────────────────

class EmailWorker {
  constructor(emailService, userRepo, logger) {
    this.emailService = emailService;
    this.userRepo     = userRepo;
    this.logger       = logger;
  }

  async process(job) {
    this.logger.info("email_job_started", {
      jobId: job.id, type: job.name, attempt: job.attemptsMade + 1
    });

    switch (job.name) {
      case "order_confirmation": return this.sendOrderConfirmation(job.data);
      case "password_reset":     return this.sendPasswordReset(job.data);
      case "welcome":            return this.sendWelcome(job.data);
      default: throw new Error("Unknown email job type: " + job.name);
    }
  }

  async sendOrderConfirmation({ userId, orderId, orderData }) {
    const user = await this.userRepo.findById(userId);
    if (!user) throw new Error("User not found: " + userId);

    await this.emailService.send({
      to: user.email,
      subject: "Order Confirmed #" + orderId.slice(-8).toUpperCase(),
      html: this.renderOrderEmail(user, orderData)
    });

    this.logger.info("order_confirmation_sent", { userId, orderId });
  }

  renderOrderEmail(user, order) {
    return "<h1>Hi " + user.name + ", your order is confirmed!</h1>";
  }

  async onCompleted(job) {
    this.logger.info("email_job_completed", { jobId: job.id, type: job.name });
  }

  async onFailed(job, err) {
    this.logger.error("email_job_failed", {
      jobId: job.id, type: job.name,
      attempt: job.attemptsMade, error: err.message
    });
    if (job.attemptsMade >= job.opts.attempts) {
      // All retries exhausted — alert team
      await this.alertTeam("Email job failed all retries", { job: job.name, data: job.data });
    }
  }
}


// WORKER: WEBHOOK DELIVERY ───────────────────────────

class WebhookWorker {
  constructor(webhookRepo, logger) {
    this.webhookRepo = webhookRepo;
    this.logger = logger;
  }

  async process(job) {
    const { url, payload, headers, webhookId } = job.data;

    const response = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json", ...headers },
      body: JSON.stringify(payload),
      signal: AbortSignal.timeout(10000) // 10s timeout
    });

    if (!response.ok) {
      throw new Error("Webhook endpoint returned " + response.status);
    }

    await this.webhookRepo.markDelivered(webhookId, {
      statusCode: response.status,
      deliveredAt: new Date(),
      attempts: job.attemptsMade + 1
    });
  }

  async onFailed(job, err) {
    await this.webhookRepo.logAttempt(job.data.webhookId, {
      error: err.message, attempt: job.attemptsMade + 1, timestamp: new Date()
    });

    if (job.attemptsMade >= job.opts.attempts) {
      await this.webhookRepo.markFailed(job.data.webhookId, {
        reason: err.message, attempts: job.attemptsMade
      });
    }
  }
}


// SCHEDULED / RECURRING JOBS ─────────────────────────

class SchedulerService {
  constructor(queues) { this.queues = queues; }

  async setupRecurringJobs() {
    // Daily sales report — every day at 9am IST
    await this.queues[QUEUES.REPORT].add(
      "daily_sales_report",
      { reportType: "daily_sales", recipients: ["ceo@co.com", "finance@co.com"] },
      { repeat: { cron: "0 9 * * *" }, attempts: 3 }
    );

    // Check unpaid orders — every 15 minutes
    await this.queues[QUEUES.ORDER].add(
      "expire_unpaid_orders",
      {},
      { repeat: { cron: "*/15 * * * *" }, attempts: 3 }
    );

    // Clean expired sessions — every hour
    await this.queues[QUEUES.ORDER].add(
      "cleanup_expired_sessions",
      {},
      { repeat: { cron: "0 * * * *" } }
    );

    // Weekly digest — every Monday 8am
    await this.queues[QUEUES.ANALYTICS].add(
      "weekly_digest",
      { type: "weekly_performance" },
      { repeat: { cron: "0 8 * * 1" } }
    );
  }
}`,
    bugs: `// BUG 1: Putting critical work in queue

async function createOrderBad(data) {
  const order = await OrderRepository.create(data);
  // WRONG: payment is queued — order "succeeds" before payment is confirmed
  await emailQueue.add("charge_payment", { orderId: order.id, amount: data.total });
  return order;
  // User gets "order confirmed", payment never actually happens
  // Payment worker fails: user has confirmed order but no payment
}

// RIGHT: payment is always synchronous — must succeed before responding
async function createOrderGood(data) {
  const order = await OrderRepository.create(data);
  const payment = await paymentGateway.charge(order.total); // synchronous
  await OrderRepository.updatePaymentStatus(order.id, payment.id);
  // ONLY NOW queue side effects
  await emailQueue.add("order_confirmation", { orderId: order.id });
  return order;
}
// Rule: queue the consequence, never the cause.
// Queue "send email". Never queue "charge card".


// BUG 2: Non-idempotent job handler

class InventoryWorkerBad {
  async process(job) {
    const { orderId, items } = job.data;
    // WRONG: if this job runs twice (network retry caused duplicate), stock goes negative
    for (const item of items) {
      await ProductModel.findByIdAndUpdate(
        item.productId,
        { $inc: { stock: -item.qty } }
      );
    }
  }
}

class InventoryWorkerGood {
  async process(job) {
    const { orderId, items } = job.data;
    // Check idempotency key before doing work
    const processed = await redis.get("inventory_processed:" + orderId);
    if (processed) {
      console.log("Idempotency: inventory already updated for order " + orderId);
      return; // safe to skip — already done
    }

    const session = await mongoose.startSession();
    try {
      session.startTransaction();
      for (const item of items) {
        await ProductModel.findByIdAndUpdate(
          item.productId,
          { $inc: { stock: -item.qty } },
          { session }
        );
      }
      // Set idempotency key inside transaction
      await session.commitTransaction();
      await redis.setex("inventory_processed:" + orderId, 86400, "1");
    } catch (err) {
      await session.abortTransaction();
      throw err; // re-throw so queue retries
    } finally {
      session.endSession();
    }
  }
}


// BUG 3: CPU-blocking work in async worker

class ReportWorkerBad {
  async process(job) {
    const data = await OrderModel.find({}).lean(); // 500,000 records
    let total = 0;
    for (const order of data) {
      total += heavyCalculation(order); // blocks event loop for 15 seconds
      // All other jobs on this worker instance are frozen
    }
    return { total };
  }
}

class ReportWorkerGood {
  async process(job) {
    const CHUNK = 1000;
    let offset = 0, total = 0;

    while (true) {
      const chunk = await OrderModel.find({}).skip(offset).limit(CHUNK).lean();
      if (!chunk.length) break;

      for (const order of chunk) { total += heavyCalculation(order); }
      offset += CHUNK;

      const progress = Math.round((offset / job.data.totalCount) * 100);
      await job.updateProgress(progress); // visible in queue dashboard

      // Yield to event loop between chunks — other jobs can run
      await new Promise(r => setImmediate(r));
    }
    return { total };
  }
}`,
    challenge: `// CHALLENGE: Build a complete async order processing pipeline.

// When an order is placed:

// SYNCHRONOUS — must complete before API responds:
// 1. Validate order data and check product availability
// 2. Reserve stock (prevent overselling)
// 3. Charge payment
// 4. Create order record with "confirmed" status
// 5. Release stock reservation

// ASYNCHRONOUS — queue after API responds:
// HIGH priority (process within seconds):
//   6. Send order confirmation email to customer
//   7. Send order notification to seller Slack channel
//   8. Permanently reduce inventory counts

// MEDIUM priority (process within minutes):
//   9. Generate PDF invoice and store in object storage
//   10. Invalidate customer order history cache
//   11. Deliver order.created webhook to integrated apps

// LOW priority (process within hours):
//   12. Update analytics and reporting DB
//   13. Update recommendation engine with purchase data

// Build:
// 1. OrderService.createOrder() — synchronous path + queue setup
// 2. Define 3 queues: urgent (priority 1-3), standard (4-6), background (7-10)
// 3. Workers: EmailWorker, InvoiceWorker, WebhookWorker, AnalyticsWorker
// 4. Retry config: urgent=5 attempts exp backoff, standard=3, background=1
// 5. Job failure handler: logs failure, Slack alert if urgent fails all retries,
//    moves to dead letter queue for manual review
// 6. Admin endpoint GET /admin/failed-jobs to view and retry dead letter jobs
// 7. All job handlers must be idempotent`,
    summary: "Queue the consequence, never the cause. APIs do minimum critical work and respond immediately. Workers process side effects asynchronously. Critical path = synchronous. Emails, PDFs, analytics = queue. Always design for idempotency — jobs may run more than once."
  },

  {
    id: 7,
    title: "REST API Design",
    tag: "CONTRACT DESIGN",
    color: "#f59e0b",
    tldr: "Your API is a contract. Bad API design causes breaking changes, confused consumers, and unmaintainable backends. Good REST APIs are self-describing, consistent, versioned, and predictable. Every client — web, mobile, third-party — should never be surprised.",
    problem: `Most developers add endpoints as features are requested with no plan. POST /createUser, GET /getUserById, POST /updateUserProfile, DELETE /removeUser. No consistency. No versioning. No pagination. No standard error format. Clients parse responses differently every time. One backend change breaks the mobile app. This is not REST — it is a collection of HTTP endpoints with no contract.

Good API design requires thinking about your API as a product that others depend on. Consistent naming, correct status codes, proper error messages, pagination, filtering, versioning — all designed upfront and maintained consistently across every single endpoint.`,
    analogy: `Think of a PUBLIC METRO SYSTEM vs an informal bus system.

INFORMAL BUS (bad API):
  Bus 1: honk twice to stop
  Bus 2: wave a green flag
  Bus 3: call the driver on WhatsApp
  Every bus is different. No route map. No schedule.

METRO SYSTEM (good API):
  Every station: same sign format, same payment, same map
  Every train: same doors, same announcements, same schedule
  Route change: advance notice, transition period

REST PRINCIPLES:
  Resources = NOUNS (not verbs)
    /users     not /getUsers
    /orders    not /createOrder
    /products  not /fetchProductById

  HTTP methods = VERBS
    GET    = read (safe, idempotent)
    POST   = create
    PUT    = replace (full update, idempotent)
    PATCH  = partial update
    DELETE = remove (idempotent)

  Status codes = standard meanings
    200 = OK
    201 = Created
    204 = No Content (successful delete)
    400 = Bad Request (client's fault)
    401 = Unauthorized (not authenticated)
    403 = Forbidden (authenticated but not allowed)
    404 = Not Found
    409 = Conflict (already exists)
    422 = Unprocessable (valid JSON, fails business rules)
    429 = Rate Limited
    500 = Server Error (our fault)`,
    deep: `ROUTE NAMING CONVENTIONS:

  Collections:       GET  /api/v1/users
  Create:            POST /api/v1/users
  Single item:       GET  /api/v1/users/:id
  Full replace:      PUT  /api/v1/users/:id
  Partial update:    PATCH /api/v1/users/:id
  Delete:            DELETE /api/v1/users/:id
  Nested resource:   GET /api/v1/users/:id/orders
  Custom action:     POST /api/v1/orders/:id/cancel
                     POST /api/v1/orders/:id/refund

  Use POST for custom actions (cancel, refund, publish, approve)
  Never use verbs in the path for standard CRUD operations.

RESPONSE ENVELOPE:
  All responses use same shape — clients can write generic handlers.

  Success single:
    { success: true, data: {...} }

  Success list:
    { success: true, data: [...], pagination: { page, limit, total, pages } }

  Error:
    { success: false, error: { code, message, details?, requestId } }

PAGINATION TYPES:
  Offset:  ?page=2&limit=20       — simple, slow at scale, items can be skipped
  Cursor:  ?cursor=abc&limit=20   — fast at any depth, no skipping
  Keyset:  ?after=<last_id>       — fastest, uses primary key index

FILTERING:
  ?status=active&minPrice=100&maxPrice=500
  ?categoryId=abc&createdAfter=2024-01-01
  ?q=iphone — full-text search

SORTING:
  ?sort=price&order=asc
  ?sort=-createdAt   (minus prefix = descending, cleaner)

API VERSIONING:
  URL prefix (recommended):  /api/v1/users
  Header-based:              API-Version: 2024-01-01
  Query param (avoid):       /api/users?version=1

  Never make breaking changes to a published version.
  Deprecation process: announce → add v2 → support both → sunset v1.`,
    code: `// ROUTE DESIGN ───────────────────────────────────────

/*
  v1 routes — published contract, never break once live

  GET    /api/v1/products              list (filter, sort, paginate)
  POST   /api/v1/products              create (admin only)
  GET    /api/v1/products/:id          get single product
  PUT    /api/v1/products/:id          full replace (admin only)
  PATCH  /api/v1/products/:id          partial update (admin only)
  DELETE /api/v1/products/:id          soft delete (admin only)
  GET    /api/v1/products/search       full-text search

  GET    /api/v1/users                 list users (admin)
  POST   /api/v1/users                 register
  GET    /api/v1/users/:id             get user
  PATCH  /api/v1/users/:id             update profile
  DELETE /api/v1/users/:id             deactivate

  GET    /api/v1/users/:id/orders      orders for a specific user
  POST   /api/v1/orders                create order
  GET    /api/v1/orders/:id            get order
  POST   /api/v1/orders/:id/cancel     cancel order (action)
  POST   /api/v1/orders/:id/refund     refund order (action)
*/


// STANDARD RESPONSE HELPERS ───────────────────────────

class ApiResponse {
  static success(res, data, statusCode = 200, meta = {}) {
    const body = { success: true, data };
    if (Object.keys(meta).length > 0) body.meta = meta;
    return res.status(statusCode).json(body);
  }

  static created(res, data) {
    return res.status(201).json({ success: true, data });
  }

  static noContent(res) {
    return res.status(204).send();
  }

  static paginated(res, items, pagination) {
    return res.json({
      success: true,
      data: items,
      pagination: {
        page:    pagination.page,
        limit:   pagination.limit,
        total:   pagination.total,
        pages:   Math.ceil(pagination.total / pagination.limit),
        hasNext: pagination.page < Math.ceil(pagination.total / pagination.limit),
        hasPrev: pagination.page > 1,
        ...(pagination.nextCursor ? { nextCursor: pagination.nextCursor } : {})
      }
    });
  }

  static error(res, statusCode, code, message, details = null) {
    return res.status(statusCode).json({
      success: false,
      error: {
        code, message,
        ...(details ? { details } : {}),
        requestId: res.req?.requestId,
        timestamp: new Date().toISOString()
      }
    });
  }
}


// GLOBAL ERROR HANDLER ────────────────────────────────

function globalErrorHandler(err, req, res, next) {
  req.logger?.error("request_error", {
    code:       err.code,
    message:    err.message,
    statusCode: err.statusCode,
    stack:      err.isOperational ? undefined : err.stack
  });

  if (res.headersSent) return next(err);

  if (err instanceof ValidationError) {
    return ApiResponse.error(res, 422, "VALIDATION_ERROR", err.message, err.fields);
  }
  if (err instanceof NotFoundError) {
    return ApiResponse.error(res, 404, "NOT_FOUND", err.message);
  }
  if (err instanceof AuthenticationError) {
    return ApiResponse.error(res, 401, "UNAUTHORIZED", "Authentication required");
  }
  if (err instanceof AuthorizationError) {
    return ApiResponse.error(res, 403, "FORBIDDEN", "Permission denied");
  }
  if (err instanceof ConflictError) {
    return ApiResponse.error(res, 409, "CONFLICT", err.message);
  }
  if (err instanceof BusinessError) {
    return ApiResponse.error(res, 400, "BUSINESS_RULE", err.message);
  }
  if (err instanceof RateLimitError) {
    res.setHeader("Retry-After", err.retryAfter);
    return ApiResponse.error(res, 429, "RATE_LIMITED", "Too many requests");
  }

  const isDev = process.env.NODE_ENV !== "production";
  return ApiResponse.error(
    res, 500, "INTERNAL_ERROR",
    isDev ? err.message : "An unexpected error occurred"
  );
}


// PAGINATION MIDDLEWARE ───────────────────────────────

function paginate(defaults = { page: 1, limit: 20, maxLimit: 100 }) {
  return (req, res, next) => {
    let page  = Math.max(1, parseInt(req.query.page)  || defaults.page);
    let limit = Math.max(1, parseInt(req.query.limit) || defaults.limit);
    if (limit > defaults.maxLimit) limit = defaults.maxLimit;
    req.pagination = { page, limit, offset: (page - 1) * limit };
    next();
  };
}


// PRODUCT CONTROLLER — full example ──────────────────

class ProductController {
  static async list(req, res, next) {
    try {
      const { page, limit } = req.pagination;
      const filters = {
        categoryId: req.query.categoryId,
        minPrice:   req.query.minPrice ? parseFloat(req.query.minPrice) : undefined,
        maxPrice:   req.query.maxPrice ? parseFloat(req.query.maxPrice) : undefined,
        sortBy:     req.query.sort  || "createdAt",
        order:      req.query.order || "desc"
      };
      const result = await ProductService.listProducts(filters, page, limit);
      ApiResponse.paginated(res, result.items, {
        page, limit, total: result.total, nextCursor: result.nextCursor
      });
    } catch (err) { next(err); }
  }

  static async getById(req, res, next) {
    try {
      const product = await ProductService.getProduct(req.params.id);
      ApiResponse.success(res, product);
    } catch (err) { next(err); }
  }

  static async create(req, res, next) {
    try {
      const product = await ProductService.createProduct(req.body, req.user.id);
      ApiResponse.created(res, product);
    } catch (err) { next(err); }
  }

  static async update(req, res, next) {
    try {
      const product = await ProductService.updateProduct(
        req.params.id, req.body, req.user.id
      );
      ApiResponse.success(res, product);
    } catch (err) { next(err); }
  }

  static async delete(req, res, next) {
    try {
      await ProductService.deleteProduct(req.params.id, req.user.id);
      ApiResponse.noContent(res);
    } catch (err) { next(err); }
  }
}`,
    bugs: `// BUG 1: Wrong HTTP methods

// WRONG — these will cause real production problems
app.get("/users/delete/:id", deleteUser);    // DELETE via GET
// GET requests are cached by browsers and CDNs
// A bot or crawler hits this URL — user is deleted

app.post("/users/update", updateUser);       // UPDATE via POST
// Not idempotent — multiple POSTs create duplicate updates

app.get("/orders/create", createOrder);      // CREATE via GET
// GET is bookmarkable — user bookmarks and re-runs it

// RIGHT
app.delete("/users/:id",  deleteUser);       // DELETE via DELETE
app.patch("/users/:id",   updateUser);       // UPDATE via PATCH
app.post("/orders",       createOrder);      // CREATE via POST


// BUG 2: Inconsistent error responses

// Route A:
if (!user) res.status(404).send("User not found");  // plain text

// Route B:
if (!valid) res.status(400).json({ msg: "Bad" });   // {msg}

// Route C:
if (!admin) res.status(403).json({ error: true, text: "No access" }); // {error, text}

// Client must handle 3 different error formats — terrible developer experience.
// FIX: every error goes through globalErrorHandler which uses ApiResponse.error()
// Result: always { success: false, error: { code, message, requestId } }


// BUG 3: Leaking internals in error response

app.use((err, req, res, next) => {
  res.status(500).json({
    error: err.message,     // "column 'pasword' does not exist" — typo exposed
    stack: err.stack,       // full file paths and line numbers
    query: err.query,       // the SQL query that failed
    mongoErr: err           // entire Mongoose error object
  });
});
// Exposes DB schema, file structure, and SQL to any attacker

// FIX: generic message in production, requestId for log correlation
app.use((err, req, res, next) => {
  const isDev = process.env.NODE_ENV !== "production";
  res.status(500).json({
    success: false,
    error: {
      code: "INTERNAL_ERROR",
      message: isDev ? err.message : "Something went wrong",
      requestId: req.requestId  // correlate with server logs
    }
  });
});`,
    challenge: `// CHALLENGE: Design and implement a complete REST API
// for a SaaS project management tool (like Linear or Jira).

// Resources: Workspace, Project, Issue, Comment

// Part 1: List ALL routes — REST conventions strictly followed.
// Include custom actions: assign issue, change status, add label, archive project.

// Part 2: Implement these endpoints with full layered architecture:

// GET /api/v1/workspaces/:workspaceId/projects
//   - Paginated, filterable by status
//   - Only members of the workspace can see its projects

// POST /api/v1/projects/:projectId/issues
//   - Validate: title (required, 2-200 chars), priority (low/medium/high/urgent)
//   - Business rule: cannot create issue in archived project

// PATCH /api/v1/issues/:id/status
//   - Body: { status: "in_progress" }
//   - Business rule: only valid transitions allowed
//     todo → in_progress → in_review → done
//     in_review can go back to in_progress
//     done → cancelled (only admin)

// GET /api/v1/issues
//   - Filters: ?status=&priority=&assignee=&project=&label=
//   - Sort: ?sort=priority&order=asc
//   - Cursor pagination

// Part 3: Standard everything:
// - All responses in { success, data } or { success, error } format
// - requestId on every response
// - Rate limiting: 100 req/min authenticated, 20 req/min unauthenticated
// - Validation middleware on all create/update endpoints

// Part 4: Show how you add a v2 endpoint that changes Issue response format
// WITHOUT breaking existing v1 clients`,
    summary: "Resources are nouns, methods are verbs, status codes have specific meanings. Consistent response envelope across every endpoint. Global error handler so every error looks identical. Cursor pagination for performance at scale. Version before you need to break."
  },

  {
    id: 8,
    title: "Authentication & Authorization",
    tag: "IDENTITY & ACCESS",
    color: "#ec4899",
    tldr: "Authentication proves who you are. Authorization proves what you are allowed to do. JWT for stateless horizontal scaling. Sessions for revocability. RBAC for role-based permissions. Resource ownership checks for data isolation. These are completely separate systems that must both be correct.",
    problem: `Most developers implement auth as an afterthought. Everyone has seen it: a single isAdmin boolean on the user model. A JWT that never expires. Tokens stored in localStorage. Passwords hashed with MD5. No refresh token rotation. Authorization checks scattered across every route with no pattern. These are not bad practices — they are security vulnerabilities that get companies breached, fined, and sued.

Auth is one of the few areas where improvising is genuinely dangerous. Learn the patterns, understand the tradeoffs, implement them correctly once. Getting this right is what separates a trustworthy product from a liability.`,
    analogy: `AUTHENTICATION = PASSPORT CONTROL at an airport.
  "Who are you? Prove it."
  You show your passport (credentials).
  They verify it is real (check password hash).
  They stamp it (issue a JWT or session).

AUTHORIZATION = THE BOARDING GATE.
  "You are verified. But are you allowed on THIS flight?"
  Economy ticket: economy seats only.
  Business ticket: lounge plus business cabin.
  Pilot badge: cockpit.

  Authentication does not imply authorization.
  You can be authenticated (valid passport)
  but not authorized (wrong ticket for this flight).

JWT = FESTIVAL WRISTBAND.
  Security checks your ticket once, gives you a wristband.
  Every other activity just scans the wristband — no queue.
  Wristband expires at midnight (TTL).
  Wristband cannot be revoked early — it is self-contained.

SESSION = HOTEL KEY CARD.
  Hotel issues a key card (session ID stored in Redis).
  Each door swipe checks with the front desk (Redis lookup).
  Front desk can deactivate any card instantly (revocable).
  Requires centralized state but gives full control.`,
    deep: `JWT (JSON Web Token) INTERNALS:
  Structure: header.payload.signature
  Each part is base64url encoded (NOT encrypted — anyone can decode it)
  Signature = HMAC(header + payload, SECRET_KEY)

  Verification: re-compute signature, compare — if match, trust payload
  
  NEVER put in payload: passwords, credit card numbers, sensitive PII
  Only put in payload: userId, role, email, tokenType, iat, exp

  ACCESS TOKEN: short TTL (15 minutes)
    Used for every authenticated API call.
    Short because if stolen — attacker has 15 min max.

  REFRESH TOKEN: long TTL (7 days)
    Used ONLY to get a new access token when it expires.
    Stored in httpOnly, Secure, SameSite=Strict cookie.
    Stored in Redis for rotation tracking.

  REFRESH TOKEN ROTATION:
    On each refresh: issue new refresh token, revoke old one.
    If an old refresh token is used again — token theft detected.
    Response: revoke ALL tokens for that user.

SESSION:
  Server generates random UUID session ID.
  Stores session data in Redis with TTL.
  Client receives session ID in httpOnly cookie only.
  Each request: Redis lookup by session ID.
  Logout: delete the Redis key — immediately effective.
  Use for: high-security apps (banking, healthcare, government).

PASSWORD SECURITY:
  NEVER: plain text, MD5, SHA1, SHA256
  ALWAYS: bcrypt (cost 12) or Argon2id
  These are SLOW by design — brute force becomes impractical.
  Cost factor 12 = 300ms per hash on modern hardware.
  Attacker would need decades to brute force a random password.

RBAC (Role-Based Access Control):
  Users have roles: admin, editor, viewer, manager
  Roles have permissions: products:read, products:write, users:manage
  Check permissions at route AND service level.
  
  Flat RBAC: user → role → permissions (simple, use this)
  Hierarchical RBAC: roles inherit from parent roles
  
  ALWAYS check resource ownership separately from role check.
  Role check: can this user access orders at all?
  Ownership check: can this user access THIS specific order?`,
    code: `// AUTH SERVICE ─────────────────────────────────────

class AuthService {
  constructor(userRepo, tokenStore, config) {
    this.userRepo   = userRepo;
    this.tokenStore = tokenStore;
    this.config     = config;
    this.ACCESS_TTL  = 15 * 60;        // 15 minutes
    this.REFRESH_TTL = 7 * 24 * 3600;  // 7 days
  }

  async register({ email, password, name }) {
    const existing = await this.userRepo.findByEmail(email.toLowerCase().trim());
    if (existing) throw new ConflictError("Email already registered");

    // Argon2id in production — bcrypt here for clarity
    const passwordHash = await this.hashPassword(password);

    const user = await this.userRepo.create({
      email: email.toLowerCase().trim(),
      passwordHash, name,
      role: "viewer", status: "active"
    });

    const tokens = await this.generateTokenPair(user);
    return { user: this.publicUser(user), tokens };
  }

  async login({ email, password }) {
    const user = await this.userRepo.findByEmail(email.toLowerCase().trim());

    // Same error for wrong email AND wrong password — do not leak which is wrong
    if (!user || !(await this.verifyPassword(password, user.passwordHash))) {
      throw new AuthenticationError("Invalid email or password");
    }
    if (user.status === "suspended") throw new AuthenticationError("Account suspended");
    if (user.status === "deleted")   throw new AuthenticationError("Account not found");

    await this.userRepo.updateLastLogin(user.id);
    const tokens = await this.generateTokenPair(user);
    return { user: this.publicUser(user), tokens };
  }

  async generateTokenPair(user) {
    const tokenFamily = crypto.randomUUID(); // for rotation detection

    const accessToken = this.sign(
      { sub: user.id, email: user.email, role: user.role, type: "access" },
      this.ACCESS_TTL
    );
    const refreshToken = this.sign(
      { sub: user.id, type: "refresh", family: tokenFamily },
      this.REFRESH_TTL
    );

    // Store refresh token family in Redis
    await this.tokenStore.set(
      "rt:" + user.id + ":" + tokenFamily,
      { tokenHash: this.hash(refreshToken), createdAt: new Date() },
      this.REFRESH_TTL
    );

    return {
      accessToken,
      refreshToken,
      tokenType: "Bearer",
      expiresAt: new Date(Date.now() + this.ACCESS_TTL * 1000)
    };
  }

  async refresh(refreshToken) {
    let payload;
    try {
      payload = this.verify(refreshToken);
    } catch {
      throw new AuthenticationError("Invalid refresh token");
    }

    if (payload.type !== "refresh") throw new AuthenticationError("Wrong token type");

    const stored = await this.tokenStore.get("rt:" + payload.sub + ":" + payload.family);

    if (!stored) {
      // Token already used or never existed
      // If a family key was deleted but the token is still being sent: theft detected
      await this.revokeAllUserTokens(payload.sub);
      throw new AuthenticationError("Token reuse detected — all sessions revoked for security");
    }

    // Revoke old refresh token (rotation)
    await this.tokenStore.delete("rt:" + payload.sub + ":" + payload.family);

    const user = await this.userRepo.findById(payload.sub);
    if (!user || user.status !== "active") throw new AuthenticationError("User inactive");

    return this.generateTokenPair(user);
  }

  async logout(userId, refreshToken) {
    try {
      const payload = this.verify(refreshToken);
      await this.tokenStore.delete("rt:" + userId + ":" + payload.family);
    } catch { /* already invalid — that is fine */ }
  }

  async revokeAllUserTokens(userId) {
    // "Log out everywhere" — security response to token theft
    await this.tokenStore.deleteByPattern("rt:" + userId + ":*");
  }

  publicUser(user) {
    const { passwordHash, ...safe } = user;
    return safe; // never return password hash
  }

  // Simplified sign/verify — use a proper JWT library in production
  sign(payload, ttl) {
    const data = { ...payload, iat: Math.floor(Date.now()/1000), exp: Math.floor(Date.now()/1000) + ttl };
    const encoded = Buffer.from(JSON.stringify(data)).toString("base64url");
    const sig = require("crypto").createHmac("sha256", this.config.JWT_SECRET).update(encoded).digest("base64url");
    return encoded + "." + sig;
  }

  verify(token) {
    const [encoded, sig] = token.split(".");
    const expectedSig = require("crypto").createHmac("sha256", this.config.JWT_SECRET).update(encoded).digest("base64url");
    if (sig !== expectedSig) throw new Error("Invalid signature");
    const payload = JSON.parse(Buffer.from(encoded, "base64url").toString());
    if (payload.exp < Math.floor(Date.now()/1000)) throw new Error("Token expired");
    return payload;
  }

  hash(value) {
    return require("crypto").createHash("sha256").update(value).digest("hex");
  }

  async hashPassword(password) {
    // In production: use bcrypt.hash(password, 12) or argon2.hash(password)
    return "bcrypt_" + password; // placeholder
  }

  async verifyPassword(plain, hash) {
    // In production: use bcrypt.compare(plain, hash) or argon2.verify(hash, plain)
    return hash === "bcrypt_" + plain; // placeholder
  }
}


// AUTH MIDDLEWARE ──────────────────────────────────────

function authenticate(req, res, next) {
  const header = req.headers.authorization;
  if (!header?.startsWith("Bearer ")) {
    return res.status(401).json({
      success: false,
      error: { code: "UNAUTHORIZED", message: "Authentication required" }
    });
  }

  try {
    const token = header.slice(7);
    const payload = authService.verify(token);
    req.user = { id: payload.sub, email: payload.email, role: payload.role };
    next();
  } catch (err) {
    res.status(401).json({
      success: false,
      error: { code: "INVALID_TOKEN", message: "Token invalid or expired" }
    });
  }
}


// RBAC ─────────────────────────────────────────────────

const PERMISSIONS = {
  "products:read":   ["viewer", "editor", "admin"],
  "products:create": ["editor", "admin"],
  "products:update": ["editor", "admin"],
  "products:delete": ["admin"],
  "orders:read_own": ["viewer", "editor", "admin"],
  "orders:read_all": ["admin"],
  "orders:update":   ["admin"],
  "users:manage":    ["admin"],
  "reports:view":    ["editor", "admin"],
};

function authorize(...requiredPermissions) {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ success: false, error: { code: "UNAUTHORIZED" } });
    }

    const role = req.user.role;
    const hasAll = requiredPermissions.every(perm => {
      const allowed = PERMISSIONS[perm];
      return allowed && allowed.includes(role);
    });

    if (!hasAll) {
      return res.status(403).json({
        success: false,
        error: { code: "FORBIDDEN", message: "You do not have permission for this action" }
      });
    }
    next();
  };
}

// Routes using RBAC:
// router.get("/products",    authenticate, authorize("products:read"),   ProductController.list);
// router.post("/products",   authenticate, authorize("products:create"), ProductController.create);
// router.delete("/products/:id", authenticate, authorize("products:delete"), ProductController.delete);


// RESOURCE OWNERSHIP CHECK ────────────────────────────

class OrderService {
  async getOrder(orderId, requestingUser) {
    const order = await OrderRepository.findById(orderId);
    if (!order) throw new NotFoundError("Order not found");

    // Role check: admin sees any order
    if (requestingUser.role === "admin") return order;

    // Ownership check: users see only their own orders (IDOR prevention)
    if (order.userId !== requestingUser.id) {
      throw new AuthorizationError("Access denied");
      // 404 is also acceptable — avoids leaking that the order exists
    }

    return order;
  }
}`,
    bugs: `// BUG 1: Sensitive data in JWT payload

// WRONG — JWT payload is BASE64 ENCODED, not encrypted
// Anyone with the token can decode the payload
const token = jwt.sign({
  userId:       user.id,
  email:        user.email,
  passwordHash: user.passwordHash,  // NEVER
  creditCard:   user.creditCard,    // NEVER
  internalNotes: user.notes         // NEVER
}, secret);

// RIGHT: minimal claims only
const token = jwt.sign({
  sub:  user.id,
  role: user.role
  // That is it. Fetch everything else from DB when needed.
}, secret, { expiresIn: "15m" });


// BUG 2: Long-lived access token with no refresh

// WRONG: 7-day access token
const token = jwt.sign({ userId }, secret, { expiresIn: "7d" });
// If stolen: attacker has 7 days of full access
// User changes password: old token works for 7 more days
// User logs out: token still valid (JWT is stateless)

// RIGHT: short access token (15 min) + rotating refresh token (7 days)
// If access token is stolen: 15 minute window only
// On logout: revoke refresh token in Redis — no new access tokens issued
// On password change: revokeAllUserTokens — all sessions terminated


// BUG 3: IDOR — missing ownership check

// WRONG: any authenticated user can read any order
app.get("/orders/:id", authenticate, async (req, res) => {
  const order = await OrderRepository.findById(req.params.id);
  res.json({ success: true, data: order });
  // User u_123 requests /orders/o_456 (belongs to u_789)
  // They see someone else's order data — IDOR vulnerability
});

// RIGHT: always check ownership through service
app.get("/orders/:id", authenticate, async (req, res, next) => {
  try {
    const order = await OrderService.getOrder(req.params.id, req.user);
    // OrderService verifies: is this the user's order OR is user admin?
    res.json({ success: true, data: order });
  } catch (err) { next(err); }
});`,
    challenge: `// CHALLENGE: Build a complete auth system for a multi-tenant SaaS.

// 1. Registration and Login
//    - Email + password (hash with bcrypt cost 12)
//    - Email verification flow (token → verify endpoint → account active)
//    - Rate limit: 5 login attempts per 15 minutes per IP
//    - Account lockout after 10 failed attempts (locked for 30 minutes)

// 2. JWT Token System
//    - Access token: 15 min, payload: { sub, email, role, tenantId }
//    - Refresh token: 7 days, httpOnly cookie only (not in response body)
//    - Token family tracking in Redis for reuse detection
//    - logout() revokes current session
//    - logoutAll() revokes all user sessions across all devices

// 3. Multi-tenant RBAC
//    - Each user has a role PER TENANT
//    - Same user can be admin in Tenant A and viewer in Tenant B
//    - Roles: owner (all perms), admin (all except billing), member (read+write), viewer (read)
//    - Middleware: requireTenantRole(role) — checks role for current tenant from JWT
//    - Data isolation: all queries must include tenantId filter

// 4. Security headers middleware:
//    X-Content-Type-Options: nosniff
//    X-Frame-Options: DENY
//    Strict-Transport-Security: max-age=31536000; includeSubDomains
//    Content-Security-Policy: default-src 'self'

// 5. Tests using mock dependencies:
//    - Wrong password increments attempt counter in Redis
//    - After 10 failures account is locked
//    - Refresh token reuse triggers revokeAllUserTokens
//    - User from Tenant A cannot access Tenant B resources`,
    summary: "Authentication proves identity. Authorization proves permission. JWT for stateless scaling with 15-min access tokens. Sessions for revocability. Short tokens, rotating refresh. RBAC for roles. Always check resource ownership — role check alone is insufficient."
  },

  {
    id: 9,
    title: "Error Handling & Structured Logging",
    tag: "OBSERVABILITY",
    color: "#64748b",
    tldr: "In production you cannot debug by adding console.logs. Structured logging, error classification, request tracing, and centralized error handling are what let you understand why your system is failing at 3am without SSH-ing into a server.",
    problem: `Most applications have console.log("error:", err) scattered everywhere. No correlation between log lines. No way to trace a request through the system. Errors leak internal details to clients. Error responses are inconsistent. When something fails in production you have no idea where, why, or what the user was doing.

Production observability requires: structured JSON logs that can be queried, unique request IDs that appear in every log line, error classification that tells you severity and whether to alert, and error handling that never leaks internals but always gives clients enough to know what happened.`,
    analogy: `Think of a HOSPITAL PATIENT MONITORING SYSTEM.

BAD (console.log):
  Nurse writes "patient seems unwell" on a sticky note.
  Next nurse finds the note with no context.
  Which patient? Which room? When? What were the vitals?
  Cannot search history. Cannot correlate events.

GOOD (structured logging):
  Every event recorded with:
    Patient ID (userId)
    Room number (requestId)
    Timestamp
    Severity (info/warning/critical)
    Structured data: vitals, medication, nurse ID

  Doctor can search: "all critical events for patient #123 in last 24 hours"
  Doctor can correlate: "what happened between 2pm and 2:30pm in room 14?"
  System can alert: "any patient with blood pressure over 200 — call now"

REQUEST ID = the patient's WRISTBAND.
  Every action, every nurse, every doctor records the wristband number.
  You can reconstruct the complete history of any patient visit
  from admission to discharge.
  
  In your backend: every log line from a single request
  shares the same requestId — filter by it and see everything.`,
    deep: `STRUCTURED LOGGING:
  Instead of: console.log("User " + userId + " logged in at " + time)
  Do:         logger.info("user_login", { userId, ip, userAgent, durationMs })

  Why: JSON logs can be indexed, filtered, aggregated, alerted on.
  Tools: Elasticsearch + Kibana, Datadog, CloudWatch Logs, Loki + Grafana

LOG LEVELS (severity order):
  debug:  detailed dev info — disabled in production
  info:   normal events — user login, order created, cache hit
  warn:   unexpected but handled — retry #2, rate limit near, cache miss on hot path
  error:  errors needing attention — payment failed, DB timeout, email bounce
  fatal:  unhandled — process may need restart, alert immediately

WHAT TO LOG:
  Every HTTP request: method, path, statusCode, durationMs, userId, requestId
  Every error: message, stack, context, userId, requestId
  Every external call: service, endpoint, durationMs, statusCode
  Business events: order_placed, payment_failed, user_registered

WHAT NEVER TO LOG:
  Passwords, tokens, API keys, credit card numbers
  Sensitive PII (check your data regulations — GDPR, SOC2)
  High-volume debug logs in production (I/O cost is real)

REQUEST TRACING:
  Assign UUID to every incoming request.
  Attach to every log line, every DB query log, every external call.
  Pass downstream in X-Request-ID header.
  Now: filter all logs by requestId — see the complete story.

ERROR CLASSIFICATION:
  Operational errors: expected failures (user not found, validation failed)
    Log as warn or info. Client gets clear error message.

  Programmer errors: bugs (undefined.property, type mismatch)
    Log as error with full stack trace. Alert team immediately.

  Transient errors: temporary failures (DB timeout, external API down)
    Log as error. Retry. Alert if persists beyond threshold.`,
    code: `// STRUCTURED LOGGER ─────────────────────────────────

class Logger {
  constructor(config = {}) {
    this.service     = config.service || "api";
    this.version     = config.version || process.env.APP_VERSION || "unknown";
    this.environment = process.env.NODE_ENV || "development";
    this.levels      = { debug: 0, info: 1, warn: 2, error: 3, fatal: 4 };
    this.minLevel    = this.environment === "production" ? "info" : "debug";
  }

  log(level, event, data = {}) {
    if (this.levels[level] < this.levels[this.minLevel]) return;

    const entry = {
      timestamp: new Date().toISOString(),
      level, service: this.service, version: this.version,
      environment: this.environment, event,
      ...this.redact(data)
    };

    if (this.environment === "development") {
      const colors = { debug:"\x1b[36m", info:"\x1b[32m", warn:"\x1b[33m", error:"\x1b[31m", fatal:"\x1b[35m" };
      console.log(colors[level] || "", JSON.stringify(entry, null, 2), "\x1b[0m");
    } else {
      process.stdout.write(JSON.stringify(entry) + "\n");
    }

    if (level === "fatal") this.alert(entry);
  }

  debug(event, data) { this.log("debug", event, data); }
  info(event, data)  { this.log("info",  event, data); }
  warn(event, data)  { this.log("warn",  event, data); }
  error(event, data) { this.log("error", event, data); }
  fatal(event, data) { this.log("fatal", event, data); }

  // Child logger — every call automatically includes bound context
  child(ctx) {
    const parent = this;
    return {
      debug: (e, d) => parent.log("debug", e, { ...ctx, ...d }),
      info:  (e, d) => parent.log("info",  e, { ...ctx, ...d }),
      warn:  (e, d) => parent.log("warn",  e, { ...ctx, ...d }),
      error: (e, d) => parent.log("error", e, { ...ctx, ...d }),
      fatal: (e, d) => parent.log("fatal", e, { ...ctx, ...d }),
    };
  }

  redact(data) {
    const SENSITIVE = ["password","passwordHash","token","accessToken",
                       "refreshToken","secret","creditCard","cvv","ssn"];
    const clean = JSON.parse(JSON.stringify(data));
    const scrub = (obj) => {
      if (typeof obj !== "object" || !obj) return;
      for (const key of Object.keys(obj)) {
        if (SENSITIVE.some(s => key.toLowerCase().includes(s))) {
          obj[key] = "[REDACTED]";
        } else {
          scrub(obj[key]);
        }
      }
    };
    scrub(clean);
    return clean;
  }

  alert(entry) {
    // In production: POST to Slack/PagerDuty/OpsGenie
    // console.error("FATAL:", entry.event);
  }
}

const logger = new Logger({ service: "backend-api" });


// REQUEST LOGGING MIDDLEWARE ──────────────────────────

function requestLogger(req, res, next) {
  req.requestId = req.headers["x-request-id"] || crypto.randomUUID();
  req.startTime = Date.now();

  // Request-scoped logger — requestId appears in every line automatically
  req.logger = logger.child({
    requestId: req.requestId,
    userId:    req.user?.id,
    method:    req.method,
    path:      req.path
  });

  res.setHeader("X-Request-ID", req.requestId);

  req.logger.info("request_received", {
    query: req.query,
    ip:    req.ip,
    ua:    req.headers["user-agent"]
  });

  res.on("finish", () => {
    const duration = Date.now() - req.startTime;
    const level = res.statusCode >= 500 ? "error"
                : res.statusCode >= 400 ? "warn"
                : "info";

    req.logger[level]("request_completed", {
      statusCode:    res.statusCode,
      durationMs:    duration,
      contentLength: res.getHeader("content-length")
    });

    if (duration > 2000) {
      req.logger.warn("slow_request", { durationMs: duration, threshold: 2000 });
    }
  });

  next();
}


// TYPED ERROR CLASSES ─────────────────────────────────

class AppError extends Error {
  constructor(message, statusCode, code, details = null) {
    super(message);
    this.name          = this.constructor.name;
    this.statusCode    = statusCode;
    this.code          = code;
    this.details       = details;
    this.isOperational = true;
    Error.captureStackTrace(this, this.constructor);
  }
}

class NotFoundError     extends AppError { constructor(m = "Not found")           { super(m, 404, "NOT_FOUND"); } }
class ValidationError   extends AppError { constructor(m, fields)                  { super(m, 422, "VALIDATION_ERROR", fields); } }
class AuthenticationError extends AppError { constructor(m = "Auth required")     { super(m, 401, "UNAUTHORIZED"); } }
class AuthorizationError  extends AppError { constructor(m = "Permission denied") { super(m, 403, "FORBIDDEN"); } }
class ConflictError     extends AppError { constructor(m)                          { super(m, 409, "CONFLICT"); } }
class BusinessError     extends AppError { constructor(m)                          { super(m, 400, "BUSINESS_RULE"); } }
class RateLimitError    extends AppError {
  constructor(retryAfter) {
    super("Too many requests", 429, "RATE_LIMITED");
    this.retryAfter = retryAfter;
  }
}
class DatabaseError extends AppError {
  constructor(m, original) {
    super(m, 500, "DATABASE_ERROR");
    this.original      = original;
    this.isOperational = false; // programmer error — alert team
  }
}


// GLOBAL ERROR HANDLER ────────────────────────────────

function globalErrorHandler(err, req, res, next) {
  const log = req.logger || logger;

  if (err.isOperational) {
    log.warn("operational_error", {
      code: err.code, message: err.message,
      statusCode: err.statusCode, details: err.details
    });
  } else {
    log.error("unexpected_error", {
      message: err.message, stack: err.stack, name: err.name
    });
  }

  if (res.headersSent) return next(err);

  const isProd = process.env.NODE_ENV === "production";

  if (err instanceof RateLimitError) res.setHeader("Retry-After", err.retryAfter);

  res.status(err.statusCode || 500).json({
    success: false,
    error: {
      code:      err.code || "INTERNAL_ERROR",
      message:   err.isOperational ? err.message : (isProd ? "An unexpected error occurred" : err.message),
      requestId: req.requestId,
      ...(err.details ? { details: err.details } : {})
    }
  });
}


// HEALTH CHECK ────────────────────────────────────────

async function healthCheck(req, res) {
  const checks = {};

  try {
    const t = Date.now();
    await pgPool.query("SELECT 1");
    checks.postgres = { status: "ok", latencyMs: Date.now() - t };
  } catch (e) {
    checks.postgres = { status: "error", error: e.message };
  }

  try {
    const t = Date.now();
    await mongoose.connection.db.admin().ping();
    checks.mongodb = { status: "ok", latencyMs: Date.now() - t };
  } catch (e) {
    checks.mongodb = { status: "error", error: e.message };
  }

  try {
    const t = Date.now();
    await redis.ping();
    checks.redis = { status: "ok", latencyMs: Date.now() - t };
  } catch (e) {
    checks.redis = { status: "error", error: e.message };
  }

  const healthy = Object.values(checks).every(c => c.status === "ok");
  res.status(healthy ? 200 : 503).json({
    status:    healthy ? "ok" : "degraded",
    version:   process.env.APP_VERSION || "unknown",
    uptime:    process.uptime(),
    timestamp: new Date().toISOString(),
    checks
  });
}`,
    bugs: `// BUG 1: Swallowing errors silently

async function updateUserBad(id, data) {
  try {
    return await UserRepository.update(id, data);
  } catch (err) {
    console.log("Error updating user"); // logged but NOT re-thrown
    return null; // caller thinks update succeeded!
  }
}
// Caller: const user = await updateUser(id, data);
// user is null — but was it a DB timeout? Not found? Constraint violation?
// All silent. Data inconsistency is invisible.

async function updateUserGood(id, data) {
  try {
    return await UserRepository.update(id, data);
  } catch (err) {
    logger.error("user_update_failed", { userId: id, error: err.message });
    // Translate DB error codes to domain errors
    if (err.code === "23505") throw new ConflictError("Email already in use");
    if (err.code === "11000") throw new ConflictError("Email already in use"); // MongoDB
    throw new DatabaseError("Failed to update user", err);
    // Controller catches this, global handler formats the HTTP error response
  }
}


// BUG 2: Not catching async worker errors

// WRONG: unhandled promise rejection — job appears "completed" with broken data
async function processJob(job) {
  const result = await someOperation(job.data);
  await saveResult(result); // if this throws: uncaught rejection, job shows completed!
}

// RIGHT: always wrap worker logic
async function processJobSafe(job) {
  try {
    const result = await someOperation(job.data);
    await saveResult(result);
    logger.info("job_completed", { jobId: job.id });
  } catch (err) {
    logger.error("job_failed", {
      jobId: job.id, type: job.name,
      attempt: job.attemptsMade, error: err.message
    });
    throw err; // re-throw: queue marks failed, schedules retry
  }
}


// BUG 3: No graceful shutdown — requests dropped on deploy

// WRONG: just exit
process.on("SIGTERM", () => process.exit(1));
// In-flight requests get connection reset. DB connections not closed.

// RIGHT: graceful shutdown
process.on("SIGTERM", gracefulShutdown);
process.on("SIGINT",  gracefulShutdown);

async function gracefulShutdown(signal) {
  logger.info("shutdown_initiated", { signal });
  server.close(); // stop accepting new connections

  // Give in-flight requests 30s to complete
  await new Promise(r => setTimeout(r, 30000));

  // Close infrastructure cleanly
  await pgPool.end();
  await mongoose.connection.close();
  await redis.quit();

  logger.info("shutdown_complete");
  process.exit(0);
}`,
    challenge: `// CHALLENGE: Build complete observability for a payments API.

// 1. Logger class:
//    - JSON output in production, pretty-print in development
//    - Levels: debug/info/warn/error/fatal
//    - Auto-redacts: password, token, cardNumber, cvv, secret (case-insensitive)
//    - child(context) for request-scoped logging
//    - fatal level triggers a Slack alert (mock it)

// 2. requestLogger middleware:
//    - Assigns UUID requestId (respects X-Request-ID header if present)
//    - Creates req.logger as child with requestId, userId, method, path
//    - Logs request_received: method, path, query params, ip, userAgent
//    - Logs request_completed: statusCode, durationMs, contentLength
//    - Logs slow_request at warn for anything over 1000ms
//    - Sets X-Request-ID on every response

// 3. Typed error classes:
//    AppError, NotFoundError, ValidationError, AuthenticationError,
//    AuthorizationError, ConflictError, BusinessError, PaymentError (new)

// 4. globalErrorHandler:
//    - Uses req.logger for all error logging
//    - Operational errors at warn, unexpected at error with full stack
//    - Never leaks stack traces in production
//    - Always includes requestId in error response
//    - PaymentError → 402 Payment Required + specific code

// 5. Metrics endpoint GET /metrics:
//    Track using Redis:
//    - Total requests served (INCR counter)
//    - Requests per minute (sorted set sliding window)
//    - Error count and error rate
//    - Response time p50, p95, p99 (sorted set of durations)
//    All updated by requestLogger middleware on every request.`,
    summary: "Structured JSON logs are queryable. Request IDs trace every log line to one request. Typed errors map cleanly to HTTP responses. Never swallow errors silently. Never log sensitive data. Health checks enable automatic load balancer routing. Graceful shutdown prevents request drops on deploy."
  },

  {
    id: 10,
    title: "Scalability Patterns",
    tag: "BUILDING FOR SCALE",
    color: "#0ea5e9",
    tldr: "Scalability means handling 10x load by adding resources, not rewriting code. Connection pooling, stateless design, horizontal scaling, graceful shutdown, MongoDB Atlas sharding, PostgreSQL read replicas, circuit breakers — these are the patterns that separate a backend that survives product-market fit from one that collapses the night you go viral.",
    problem: `Your backend works perfectly with 100 users. You post on ProductHunt, get 10,000 users overnight. Your single server has 10 DB connections — 10,000 requests pile up. No connection pooling — each request opens its own connection until PostgreSQL hits max_connections and rejects everything. No load balancer — one server absorbs all 10,000 concurrent users. One restart to deploy → all users get errors. These are not optimization problems — they are architecture problems that must be solved before you need them.`,
    analogy: `Think of a RESTAURANT growing into a CHAIN.

CONNECTION POOLING = shared kitchen equipment.
  Do not buy a new oven for every customer.
  Share a pool of ovens — customers queue for the next available one.

HORIZONTAL SCALING = opening more restaurants.
  One restaurant: 200 customers max.
  Open 5 more: 1000 customers, same quality everywhere.
  Load balancer = the reservation system directing customers to the least busy location.

STATELESS DESIGN = any chef can cook any dish.
  If a customer's order is on a sticky note only one chef can read,
  that chef cannot be replaced.
  Put the order on a shared board (Redis) — any chef can handle it.

READ REPLICAS (PostgreSQL) = having copies of the menu.
  Only the head chef updates the master menu (writes to primary).
  All serving staff read from copies (reads to replicas).

MONGODB ATLAS SHARDING = splitting the kitchen across multiple buildings.
  When one building cannot hold all the data or traffic,
  split it by category: Building A handles A-M, Building B handles N-Z.

CIRCUIT BREAKER = automatic "kitchen closed" sign.
  If payment API fails 5 times in a row — stop calling it.
  Tell customers "payment unavailable" immediately.
  Try again after 60 seconds.
  Prevents one failing service from taking down everything.

GRACEFUL SHUTDOWN = proper closing time procedure.
  Do not kick customers out mid-meal.
  Stop letting new customers in.
  Finish serving everyone already seated.
  Then close and clean up.`,
    deep: `CONNECTION POOLING:
  Creating a DB connection: 50-100ms.
  1000 req/s each creating a connection: 50,000ms overhead per second + DB dies.

  Pool: N persistent connections shared by all requests.
  Requests borrow a connection, return it when done.
  If all connections busy: new requests wait (up to connectionTimeout).

  PostgreSQL formula: pool_size = (2 × CPU_cores) + effective_spindle_count
  Practical: 10-20 connections per app server.
  With 4 app servers × 20 = 80 connections.
  Leave headroom: PostgreSQL max_connections = 100 → max 4 servers of 20.

  MongoDB: connection pool per MongoClient.
  Default: 100 connections. Usually fine. Tune for your load.

HORIZONTAL SCALING REQUIREMENTS:
  For multiple servers to work, your app must be STATELESS:
  No local session storage → use Redis
  No local file storage → use S3 or object storage
  No in-memory cache per server → use Redis
  No local job queues → use Redis-backed queue (BullMQ)

  If server A handles request 1 and server B handles request 2 for the same user,
  both must see the same session, cache, and queue state.

MONGODB SCALABILITY:
  Vertical: bigger Atlas cluster (M0 → M10 → M30 → M60 → M200+)
  Horizontal: Atlas sharding — distribute documents across shards by shard key
    Good shard key: high cardinality, query-aligned (userId, createdAt)
    Bad shard key: low cardinality (status, category) → uneven distribution

  Read preference: route read queries to secondary nodes
    readPreference: "secondaryPreferred" for analytics
    readPreference: "primary" for reads immediately after writes

POSTGRESQL READ REPLICAS:
  Primary handles all writes + reads-that-need-latest-data.
  Replicas are read-only copies syncing from primary.
  Route catalog queries, analytics, reports to replicas.
  Replication lag: replicas may be ms behind — always read from primary after writes.

GRACEFUL SHUTDOWN SEQUENCE:
  1. Receive SIGTERM from orchestrator (Kubernetes, PM2, systemd)
  2. Stop accepting new HTTP connections (server.close())
  3. Stop accepting new queue jobs (worker.pause())
  4. Wait for in-flight requests to complete (max 30s)
  5. Wait for active jobs to finish (max 60s)
  6. Close PostgreSQL pool (pool.end())
  7. Close MongoDB connection (mongoose.connection.close())
  8. Close Redis (redis.quit())
  9. Exit with code 0

CIRCUIT BREAKER STATES:
  CLOSED: normal — all requests pass through
  OPEN: too many failures — requests fail immediately, no downstream call
  HALF_OPEN: after timeout — let one request through to test recovery`,
    code: `// CONNECTION POOL CONFIGURATION ─────────────────────

// PostgreSQL pool — tuned for horizontal scaling
const pgPool = new Pool({
  connectionString: process.env.DATABASE_URL,
  max:               20,    // max connections (tune: available_PG_connections / num_servers)
  min:               2,     // keep-alive connections
  idleTimeoutMillis: 30000, // close idle connections after 30s
  connectionTimeoutMillis: 5000,  // fail if cannot get connection in 5s
  acquireTimeoutMillis:    10000  // fail if query acquires for > 10s
});

pgPool.on("error", (err) => {
  logger.error("pg_pool_error", { error: err.message });
});

// Monitor pool utilization
setInterval(() => {
  const stats = { total: pgPool.totalCount, idle: pgPool.idleCount, waiting: pgPool.waitingCount };
  const utilization = (stats.total - stats.idle) / pgPool.options.max;
  if (utilization > 0.8) {
    logger.warn("pg_pool_high_utilization", { ...stats, utilization });
  }
}, 15000);


// MongoDB connection — Atlas production settings
const mongoOptions = {
  maxPoolSize:         100,   // max connections per MongoClient
  minPoolSize:         5,
  maxIdleTimeMS:       30000,
  serverSelectionTimeoutMS: 5000,
  socketTimeoutMS:     45000,
  // Read from secondary for non-critical reads
  readPreference:      "secondaryPreferred",
  // Write concern: wait for majority acknowledgment
  writeConcern:        { w: "majority", j: true }
};

const mongoClient = new MongoClient(process.env.MONGO_URL, mongoOptions);


// STATELESS APP — all shared state in Redis ───────────

// WRONG: in-memory session — breaks with multiple servers
const badSessions = new Map(); // dies on restart, invisible to other servers

// RIGHT: Redis-backed session — any server, any restart
class SessionStore {
  constructor(redis) { this.redis = redis; }

  async create(userId, data = {}) {
    const id = crypto.randomUUID();
    await this.redis.setex(
      "session:" + id,
      86400, // 24 hours
      JSON.stringify({ id, userId, ...data, createdAt: new Date() })
    );
    return id;
  }

  async get(id) {
    const raw = await this.redis.get("session:" + id);
    return raw ? JSON.parse(raw) : null;
  }

  async destroy(id) { await this.redis.del("session:" + id); }
}
// Works across 10 servers because all read/write the same Redis instance


// CIRCUIT BREAKER ─────────────────────────────────────

class CircuitBreaker {
  constructor({ name, failureThreshold = 5, recoveryTimeout = 30000, successThreshold = 2 }) {
    this.name             = name;
    this.failureThreshold = failureThreshold;
    this.recoveryTimeout  = recoveryTimeout;
    this.successThreshold = successThreshold;
    this.state            = "CLOSED";
    this.failureCount     = 0;
    this.successCount     = 0;
    this.lastFailureTime  = null;
  }

  async execute(fn) {
    if (this.state === "OPEN") {
      const elapsed = Date.now() - this.lastFailureTime;
      if (elapsed > this.recoveryTimeout) {
        this.state = "HALF_OPEN";
        logger.info("circuit_half_open", { service: this.name });
      } else {
        throw new ServiceUnavailableError(this.name + " temporarily unavailable");
      }
    }

    try {
      const result = await fn();
      this.onSuccess();
      return result;
    } catch (err) {
      this.onFailure(err);
      throw err;
    }
  }

  onSuccess() {
    this.failureCount = 0;
    if (this.state === "HALF_OPEN") {
      this.successCount++;
      if (this.successCount >= this.successThreshold) {
        this.state = "CLOSED";
        this.successCount = 0;
        logger.info("circuit_closed", { service: this.name });
      }
    }
  }

  onFailure(err) {
    this.failureCount++;
    this.lastFailureTime = Date.now();
    if (this.failureCount >= this.failureThreshold || this.state === "HALF_OPEN") {
      this.state = "OPEN";
      this.successCount = 0;
      logger.warn("circuit_opened", {
        service: this.name, failures: this.failureCount, error: err.message
      });
    }
  }

  status() {
    return { state: this.state, failureCount: this.failureCount, service: this.name };
  }
}

// Wrap external service calls
const paymentCircuit = new CircuitBreaker({ name: "razorpay", failureThreshold: 3, recoveryTimeout: 60000 });
const emailCircuit   = new CircuitBreaker({ name: "sendgrid", failureThreshold: 5, recoveryTimeout: 30000 });
const mongoCircuit   = new CircuitBreaker({ name: "mongodb",  failureThreshold: 3, recoveryTimeout: 10000 });

class PaymentService {
  async charge(amount, currency, meta) {
    return paymentCircuit.execute(async () => {
      const res = await fetch("https://payment-api.example.com/charge", {
        method: "POST",
        body: JSON.stringify({ amount, currency, ...meta }),
        signal: AbortSignal.timeout(8000)
      });
      if (!res.ok) throw new Error("Payment API returned " + res.status);
      return res.json();
      // After 3 failures: circuit opens — subsequent calls fail immediately
      // Users get "payment temporarily unavailable" not a 8s timeout hang
    });
  }
}


// GRACEFUL SHUTDOWN ───────────────────────────────────

class GracefulShutdown {
  constructor({ server, pgPool, mongoClient, redis, workers = [] }) {
    this.server      = server;
    this.pgPool      = pgPool;
    this.mongoClient = mongoClient;
    this.redis       = redis;
    this.workers     = workers;
    this.shuttingDown = false;

    process.on("SIGTERM", () => this.shutdown("SIGTERM"));
    process.on("SIGINT",  () => this.shutdown("SIGINT"));
    process.on("uncaughtException",   err  => this.emergency("uncaughtException", err));
    process.on("unhandledRejection",  reason => this.emergency("unhandledRejection", new Error(String(reason))));
  }

  async emergency(type, err) {
    logger.fatal(type, { error: err.message, stack: err.stack });
    await this.shutdown(type);
  }

  async shutdown(signal) {
    if (this.shuttingDown) return;
    this.shuttingDown = true;
    logger.info("shutdown_started", { signal });

    // 1. Stop accepting new HTTP connections
    this.server.close();

    // 2. Pause queue workers
    await Promise.allSettled(this.workers.map(w => w.pause(true)));

    // 3. Wait for in-flight requests (30s max)
    await Promise.race([
      new Promise(r => this.server.on("close", r)),
      new Promise(r => setTimeout(r, 30000))
    ]);

    // 4. Wait for active jobs to finish (60s max)
    await Promise.race([
      Promise.allSettled(this.workers.map(w => w.close())),
      new Promise(r => setTimeout(r, 60000))
    ]);

    // 5. Close infrastructure
    await Promise.allSettled([
      this.pgPool.end(),
      this.mongoClient.close(),
      this.redis.quit()
    ]);

    logger.info("shutdown_complete");
    process.exit(0);
  }
}


// MONGODB READ REPLICA ROUTING ────────────────────────

class SmartMongoRepository {
  constructor(mongoClient) {
    this.client = mongoClient;
  }

  // Writes: always to primary (default)
  async write(operation) {
    const db = this.client.db("myapp", { readPreference: "primary" });
    return operation(db);
  }

  // Reads: prefer secondary — reduces load on primary
  async read(operation) {
    const db = this.client.db("myapp", { readPreference: "secondaryPreferred" });
    return operation(db);
  }

  // After a write: always read from primary to avoid replication lag
  async writeAndRead(writeOp, readOp) {
    await this.write(writeOp);
    return this.write(readOp); // primary read guaranteed fresh
  }
}

class ProductRepository extends SmartMongoRepository {
  async create(data) {
    return this.write(db => db.collection("products").insertOne(data));
  }

  async findById(id) {
    // Product catalog reads: fine on secondary
    return this.read(db => db.collection("products").findOne({ _id: new ObjectId(id) }));
  }

  async createAndReturn(data) {
    // After write: read from primary — guaranteed to see the write
    return this.writeAndRead(
      db => db.collection("products").insertOne(data),
      db => db.collection("products").findOne({ _id: data._id })
    );
  }
}`,
    bugs: `// BUG 1: Creating a DB connection per request

app.get("/products", async (req, res) => {
  // WRONG: new connection for every request
  const conn = await createMongoConnection();  // 100ms overhead
  const products = await conn.collection("products").find().toArray();
  await conn.close();
  res.json(products);
  // At 1000 req/s: 1000 connections opened/closed per second
  // MongoDB Atlas: default max 500 connections → starts rejecting at ~500 concurrent requests
});

// RIGHT: reuse the shared connection pool
app.get("/products", async (req, res) => {
  // mongoClient is a singleton initialized on startup
  // find() borrows from pool, returns automatically
  const products = await mongoClient.db("myapp")
    .collection("products")
    .find({ isActive: true })
    .toArray();
  res.json(products);
  // Pool manages connections. No overhead. Scales to pool size.
});


// BUG 2: State stored in app server memory

class CartServiceBad {
  constructor() {
    this.carts = new Map(); // in-memory — broken under load balancer
  }
  addToCart(userId, item) { this.carts.set(userId, item); }
  getCart(userId) { return this.carts.get(userId); }
}
// Request 1 (Server A): addToCart — stored in Server A's Map
// Request 2 (Server B): getCart — Server B's Map is empty
// Cart disappears on every other request

class CartServiceGood {
  constructor(redis) { this.redis = redis; }
  async addToCart(userId, item) {
    const cart = await this.getCart(userId) || [];
    cart.push(item);
    await this.redis.setex("cart:" + userId, 86400, JSON.stringify(cart));
  }
  async getCart(userId) {
    const raw = await this.redis.get("cart:" + userId);
    return raw ? JSON.parse(raw) : [];
  }
}
// Any server handles any request — all read the same Redis


// BUG 3: No circuit breaker on external service

// External MongoDB Atlas or third-party API goes down.
// Every request waits 30s for timeout.
// 500 concurrent requests × 30s = your server thread pool exhausted.
// Your entire API becomes unresponsive — their outage is now your outage.

// WRONG: no protection
async function getExternalData(id) {
  return fetch("https://external-api.com/data/" + id);
  // No timeout. If external API hangs: your server hangs too.
}

// RIGHT: circuit breaker + timeout
const externalCircuit = new CircuitBreaker({ name: "external-api", failureThreshold: 3, recoveryTimeout: 60000 });

async function getExternalDataSafe(id) {
  return externalCircuit.execute(() =>
    fetch("https://external-api.com/data/" + id, {
      signal: AbortSignal.timeout(5000) // 5s max
    })
  );
  // After 3 timeouts/failures: circuit opens.
  // Next 60s: requests fail immediately with "service unavailable".
  // Your API stays responsive. Users get an error message, not a 30s hang.
}`,
    challenge: `// CHALLENGE: Build a production-ready scalable server setup.

// Wire together every scalability pattern from this concept:

// 1. Connection pools
//    PostgreSQL: max 20, min 2, idle timeout 30s
//    Log a warning when utilization exceeds 80%
//    MongoDB: maxPoolSize 100, minPoolSize 5, secondaryPreferred reads
//    Graceful pool drain on shutdown

// 2. Redis with reconnection
//    Reconnect with exponential backoff: 100ms, 200ms, 400ms, capped at 30s
//    Health check ping every 30s
//    Graceful disconnect on shutdown

// 3. Two-level cache
//    L1: in-process Map, max 500 items, LRU eviction
//    L2: Redis for shared cross-server cache
//    getOrSet(key, fetchFn, opts) checks L1 first, then L2, then DB
//    Writes to both. L1: short TTL. L2: long TTL.
//    When L1 evicts an item: it is still in L2

// 4. Circuit breakers
//    PaymentAPI: 3 failures → 60s open
//    EmailAPI: 5 failures → 30s open
//    SMSAPI: 3 failures → 120s open
//    GET /health exposes state of all three circuit breakers

// 5. Rate limiting (tiered)
//    Anonymous: 20 req/min
//    Authenticated: 100 req/min
//    Premium: 1000 req/min
//    Admin: unlimited
//    X-RateLimit-Limit, X-RateLimit-Remaining on every response

// 6. Graceful shutdown
//    Handle SIGTERM and SIGINT
//    Drain HTTP requests: 30s max
//    Drain queue workers: 60s max
//    Close PostgreSQL, MongoDB, Redis in parallel
//    Log each step with duration

// Show the complete server entry point (server.js) wiring all of this.`,
    summary: "Stateless app servers backed by Redis for shared state. Connection pools sized to available DB connections divided by server count. Circuit breakers on all external calls. MongoDB secondaryPreferred reads for scale. PostgreSQL read replicas for analytical queries. Graceful shutdown for zero-downtime deploys."
  }
];

// ─── COMPONENTS ───────────────────────────────────────────────────────────────

function CodeBlock({ code }) {
  const [copied, setCopied] = useState(false);
  return (
    <div style={{ position: "relative", marginBottom: "20px" }}>
      <button
        onClick={() => { navigator.clipboard.writeText(code); setCopied(true); setTimeout(() => setCopied(false), 2000); }}
        style={{
          position: "absolute", top: "10px", right: "10px", zIndex: 1,
          background: copied ? "#10b98118" : "#ffffff08",
          border: `1px solid ${copied ? "#10b98144" : "#2a2a2a"}`,
          color: copied ? "#10b981" : "#555",
          padding: "4px 10px", borderRadius: "4px",
          fontSize: "10px", cursor: "pointer", letterSpacing: "1px", fontFamily: "monospace"
        }}
      >{copied ? "COPIED" : "COPY"}</button>
      <pre style={{
        background: "#070710", border: "1px solid #1a1a2e", borderRadius: "10px",
        padding: "20px", overflowX: "auto", fontSize: "11.5px", lineHeight: "1.9",
        color: "#a8b8d0", fontFamily: "'JetBrains Mono', 'Fira Code', monospace",
        margin: 0, whiteSpace: "pre-wrap", wordBreak: "break-word"
      }}><code>{code}</code></pre>
    </div>
  );
}

function Tag({ label, color }) {
  return (
    <span style={{
      fontSize: "8px", letterSpacing: "2.5px", textTransform: "uppercase",
      color, background: color + "12", border: `1px solid ${color}30`,
      padding: "3px 9px", borderRadius: "3px", fontFamily: "monospace"
    }}>{label}</span>
  );
}

export default function Phase3Guide() {
  const [selected, setSelected] = useState(null);
  const [completed, setCompleted] = useState({});
  const [tab, setTab] = useState("why");

  const concept = selected !== null ? concepts[selected] : null;
  const done = Object.values(completed).filter(Boolean).length;
  const pct  = Math.round((done / concepts.length) * 100);

  const tabs = [
    { key: "why",       label: "The WHY"    },
    { key: "deep",      label: "Deep Dive"  },
    { key: "code",      label: "Code"       },
    { key: "bugs",      label: "Bugs"       },
    { key: "challenge", label: "Challenge"  },
  ];

  return (
    <div style={{
      minHeight: "100vh", background: "#06060e", color: "#d4dbe8",
      fontFamily: "'JetBrains Mono', 'Fira Code', monospace",
      display: "flex", flexDirection: "column"
    }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=JetBrains+Mono:wght@300;400;500;700&family=Syne:wght@800;900&display=swap');
        * { box-sizing: border-box; margin: 0; padding: 0; }
        ::-webkit-scrollbar { width: 3px; height: 3px; }
        ::-webkit-scrollbar-thumb { background: #1a1a2e; border-radius: 2px; }
        .crow:hover  { background: rgba(255,255,255,0.035) !important; cursor: pointer; }
        .tbtn:hover  { opacity: 1 !important; }
        .nbtn:hover  { background: rgba(255,255,255,0.06) !important; }
        .mbtn:hover  { opacity: 0.8; }
      `}</style>

      {/* HEADER */}
      <div style={{
        padding: "16px 28px", borderBottom: "1px solid #0f0f1e",
        background: "#08080f", display: "flex",
        justifyContent: "space-between", alignItems: "center",
        gap: "16px", flexWrap: "wrap"
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: "14px" }}>
          <div style={{
            background: "#f9731608", border: "1px solid #f9731630",
            borderRadius: "8px", padding: "7px 13px",
            fontSize: "10px", color: "#f97316", letterSpacing: "2px", textTransform: "uppercase"
          }}>Phase 3 / 5</div>
          <div>
            <div style={{ fontSize: "9px", color: "#30304a", letterSpacing: "2px", textTransform: "uppercase", marginBottom: "3px" }}>
              Scalable Backend Architecture
            </div>
            <h1 style={{
              fontFamily: "'Syne', sans-serif", fontWeight: 900,
              fontSize: "clamp(15px, 2.5vw, 21px)", color: "#fff", letterSpacing: "-0.5px"
            }}>
              Node.js + PostgreSQL + MongoDB — Production Patterns
            </h1>
          </div>
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: "14px", flexWrap: "wrap" }}>
          {concept && (
            <div style={{ display: "flex", gap: "4px" }}>
              {[["←", Math.max(0, selected-1)], ["→", Math.min(concepts.length-1, selected+1)]].map(([lbl, idx]) => (
                <button key={lbl} className="nbtn"
                  onClick={() => { setSelected(idx); setTab("why"); }}
                  style={{
                    background: "transparent", border: "1px solid #1a1a2e",
                    color: "#404060", padding: "6px 14px", borderRadius: "6px",
                    cursor: "pointer", fontSize: "12px"
                  }}>{lbl}</button>
              ))}
            </div>
          )}
          <div>
            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "4px" }}>
              <span style={{ fontSize: "10px", color: "#30304a" }}>{done}/{concepts.length}</span>
              <span style={{ fontSize: "10px", color: "#f97316" }}>{pct}%</span>
            </div>
            <div style={{ width: "110px", height: "3px", background: "#0f0f1e", borderRadius: "2px" }}>
              <div style={{
                width: pct + "%", height: "100%", borderRadius: "2px",
                transition: "width .4s", background: "linear-gradient(90deg, #f97316, #ef4444)"
              }} />
            </div>
          </div>
        </div>
      </div>

      <div style={{ display: "flex", flex: 1, overflow: "hidden", minHeight: "calc(100vh - 70px)" }}>

        {/* SIDEBAR */}
        <div style={{
          width: "240px", minWidth: "240px", borderRight: "1px solid #0f0f1e",
          overflowY: "auto", padding: "14px 10px", background: "#07070d"
        }}>
          {!concept && (
            <div style={{
              padding: "10px 12px 16px", fontSize: "10px", color: "#25253a",
              lineHeight: "1.8", borderBottom: "1px solid #0f0f1e", marginBottom: "10px"
            }}>
              10 backend concepts. Layered architecture to scalability. Node.js + PostgreSQL + MongoDB throughout.
            </div>
          )}
          {concepts.map((c, i) => (
            <div key={i} className="crow"
              onClick={() => { setSelected(i); setTab("why"); }}
              style={{
                display: "flex", alignItems: "flex-start", gap: "9px",
                padding: "10px 11px", borderRadius: "7px", marginBottom: "3px",
                background: selected === i ? "#10101c" : "transparent",
                border: `1px solid ${selected === i ? c.color + "30" : "transparent"}`,
                transition: "all .15s"
              }}>
              <div style={{
                width: "20px", height: "20px", minWidth: "20px", borderRadius: "4px",
                border: `1px solid ${completed[i] ? c.color : "#1a1a2e"}`,
                background: completed[i] ? c.color + "18" : "transparent",
                display: "flex", alignItems: "center", justifyContent: "center",
                fontSize: completed[i] ? "10px" : "9px",
                color: completed[i] ? c.color : "#252535", fontWeight: 600
              }}>{completed[i] ? "✓" : i + 1}</div>
              <div>
                <div style={{
                  fontSize: "11px", fontWeight: selected === i ? 500 : 400,
                  color: selected === i ? "#e8eaf0" : (completed[i] ? "#252535" : "#7080a0"),
                  textDecoration: completed[i] ? "line-through" : "none",
                  lineHeight: "1.4", marginBottom: "4px"
                }}>{c.title}</div>
                <Tag label={c.tag} color={c.color} />
              </div>
            </div>
          ))}
        </div>

        {/* CONTENT */}
        {!concept ? (
          <div style={{
            flex: 1, display: "flex", alignItems: "center", justifyContent: "center",
            flexDirection: "column", gap: "12px", color: "#202030"
          }}>
            <div style={{ fontFamily: "'Syne', sans-serif", fontWeight: 900, fontSize: "52px", color: "#f97316", opacity: .08 }}>
              NODE
            </div>
            <div style={{ fontSize: "11px", letterSpacing: "3px", textTransform: "uppercase" }}>
              Select a concept to begin
            </div>
          </div>
        ) : (
          <div style={{ flex: 1, overflowY: "auto", display: "flex", flexDirection: "column" }}>

            {/* concept header */}
            <div style={{ padding: "22px 30px 0", background: "#07070d", borderBottom: "1px solid #0f0f1e" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: "16px", marginBottom: "12px", flexWrap: "wrap" }}>
                <div>
                  <Tag label={concept.tag} color={concept.color} />
                  <h2 style={{
                    fontFamily: "'Syne', sans-serif", fontWeight: 900,
                    fontSize: "clamp(17px, 2.5vw, 26px)", color: "#fff",
                    letterSpacing: "-0.5px", marginTop: "9px", lineHeight: 1.2
                  }}>{concept.title}</h2>
                </div>
                <button className="mbtn"
                  onClick={() => setCompleted(p => ({ ...p, [selected]: !p[selected] }))}
                  style={{
                    padding: "8px 18px", cursor: "pointer", fontFamily: "inherit",
                    background: completed[selected] ? "transparent" : concept.color + "15",
                    border: `1px solid ${completed[selected] ? "#1a1a2e" : concept.color + "40"}`,
                    borderRadius: "6px", fontSize: "10px", letterSpacing: "2px",
                    textTransform: "uppercase", transition: "all .2s", marginTop: "4px",
                    color: completed[selected] ? "#252535" : concept.color, whiteSpace: "nowrap"
                  }}>{completed[selected] ? "✓ done" : "mark done"}</button>
              </div>

              <div style={{
                padding: "13px 17px", marginBottom: "14px",
                background: concept.color + "07", borderLeft: `3px solid ${concept.color}44`,
                border: `1px solid ${concept.color}18`, borderRadius: "8px",
                fontSize: "12px", color: "#7080a0", lineHeight: "1.8"
              }}>
                <span style={{ color: concept.color, marginRight: "8px", fontSize: "8px", letterSpacing: "2.5px", textTransform: "uppercase" }}>tldr</span>
                {concept.tldr}
              </div>

              <div style={{ display: "flex", gap: "2px", flexWrap: "wrap" }}>
                {tabs.map(t => (
                  <button key={t.key} className="tbtn"
                    onClick={() => setTab(t.key)}
                    style={{
                      background: tab === t.key ? concept.color + "12" : "transparent",
                      border: "none", borderBottom: `2px solid ${tab === t.key ? concept.color : "transparent"}`,
                      color: tab === t.key ? concept.color : "#303050",
                      padding: "9px 17px", fontSize: "9px", letterSpacing: "1.5px",
                      textTransform: "uppercase", cursor: "pointer", fontFamily: "inherit",
                      transition: "all .15s", opacity: tab === t.key ? 1 : 0.6
                    }}>{t.label}</button>
                ))}
              </div>
            </div>

            {/* tab content */}
            <div style={{ padding: "26px 30px", flex: 1 }}>

              {tab === "why" && (
                <div style={{ display: "flex", flexDirection: "column", gap: "26px" }}>
                  {[
                    { label: "The Problem This Solves", body: concept.problem },
                    { label: "Real World Analogy",      body: concept.analogy, box: true }
                  ].map((s, si) => (
                    <div key={si}>
                      <div style={{ fontSize: "8px", letterSpacing: "3px", color: concept.color, marginBottom: "11px", textTransform: "uppercase", display: "flex", alignItems: "center", gap: "8px" }}>
                        <span style={{ width: "14px", height: "1px", background: concept.color, display: "inline-block" }} />
                        {s.label}
                      </div>
                      <div style={{
                        background: s.box ? "#0b0b18" : "transparent",
                        border: s.box ? "1px solid #1a1a2e" : "none",
                        borderRadius: "10px", padding: s.box ? "18px 20px" : "0",
                        fontSize: "12.5px", color: "#6878a0",
                        lineHeight: "2", whiteSpace: "pre-line"
                      }}>{s.body}</div>
                    </div>
                  ))}
                </div>
              )}

              {tab === "deep" && (
                <div>
                  <div style={{ fontSize: "8px", letterSpacing: "3px", color: concept.color, marginBottom: "12px", textTransform: "uppercase", display: "flex", alignItems: "center", gap: "8px" }}>
                    <span style={{ width: "14px", height: "1px", background: concept.color, display: "inline-block" }} />
                    Under The Hood
                  </div>
                  <div style={{
                    background: "#0b0b18", border: "1px solid #1a1a2e", borderRadius: "10px",
                    padding: "20px 22px", fontSize: "11.5px", color: "#6878a0",
                    lineHeight: "2.1", whiteSpace: "pre-line", fontFamily: "'JetBrains Mono', monospace"
                  }}>{concept.deep}</div>
                </div>
              )}

              {tab === "code" && (
                <div>
                  <div style={{ fontSize: "8px", letterSpacing: "3px", color: concept.color, marginBottom: "12px", textTransform: "uppercase", display: "flex", alignItems: "center", gap: "8px" }}>
                    <span style={{ width: "14px", height: "1px", background: concept.color, display: "inline-block" }} />
                    Real World Code — Node.js · PostgreSQL · MongoDB
                  </div>
                  <CodeBlock code={concept.code} />
                </div>
              )}

              {tab === "bugs" && (
                <div>
                  <div style={{ fontSize: "8px", letterSpacing: "3px", color: "#ef4444", marginBottom: "12px", textTransform: "uppercase", display: "flex", alignItems: "center", gap: "8px" }}>
                    <span style={{ width: "14px", height: "1px", background: "#ef4444", display: "inline-block" }} />
                    Common Bugs That Take Down Production Systems
                  </div>
                  <div style={{
                    background: "#120808", border: "1px solid #2a1010", borderRadius: "8px",
                    padding: "11px 15px", marginBottom: "14px",
                    fontSize: "10px", color: "#5a2020", lineHeight: "1.7"
                  }}>
                    These are real bugs that cause real outages. Understand the WHY of each fix — not just the fix.
                  </div>
                  <CodeBlock code={concept.bugs} />
                </div>
              )}

              {tab === "challenge" && (
                <div>
                  <div style={{ fontSize: "8px", letterSpacing: "3px", color: "#f59e0b", marginBottom: "12px", textTransform: "uppercase", display: "flex", alignItems: "center", gap: "8px" }}>
                    <span style={{ width: "14px", height: "1px", background: "#f59e0b", display: "inline-block" }} />
                    Your Challenge
                  </div>
                  <div style={{
                    background: "#120e04", border: "1px solid #f59e0b20", borderRadius: "8px",
                    padding: "12px 15px", marginBottom: "14px",
                    fontSize: "10px", color: "#705020", lineHeight: "1.7"
                  }}>
                    Build from scratch. No looking at the code tab until you have a working attempt. The challenge is where understanding becomes skill.
                  </div>
                  <CodeBlock code={concept.challenge} />
                </div>
              )}

              <div style={{
                marginTop: "30px", padding: "15px 19px",
                background: "#0b0b18", border: `1px solid ${concept.color}20`,
                borderRadius: "8px", display: "flex", alignItems: "flex-start", gap: "11px"
              }}>
                <span style={{ color: concept.color, fontSize: "12px", marginTop: "2px" }}>◆</span>
                <div>
                  <div style={{ fontSize: "8px", letterSpacing: "2px", color: concept.color, marginBottom: "5px", textTransform: "uppercase" }}>one line summary</div>
                  <p style={{ fontSize: "11.5px", color: "#50607a", lineHeight: "1.75", margin: 0 }}>{concept.summary}</p>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}