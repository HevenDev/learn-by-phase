"use client"
import { useState } from "react";

const concepts = [
  {
    id: 1,
    title: "Why TypeScript Exists",
    tag: "THE FOUNDATION",
    color: "#60a5fa",
    tldr: "TypeScript is JavaScript with a type system layered on top. It catches entire categories of bugs at compile time — before your code ever runs. Types are not just annotations — they are your design documentation that the compiler enforces.",
    problem: `JavaScript is dynamically typed. You can pass a string where a number is expected. You can call .toUpperCase() on undefined. You can misspell a property name and get undefined instead of an error. In small scripts this is fine. In a 50,000-line codebase with 10 developers, this causes production bugs that cost real money and real users.

TypeScript adds a compile step that reads your type annotations and checks them before running. If you pass the wrong type — red squiggly line, build fails, bug caught.

The goal is NOT to make JS harder. The goal is to make large codebases maintainable, refactorable, and self-documenting.`,
    analogy: `Think of building a SKYSCRAPER vs a tent.

For a tent: you just start assembling. No blueprints needed. Fast. Works fine.

For a skyscraper: you need blueprints, structural plans, load calculations. The architect reviews everything before construction. If something is wrong — you catch it on paper, not when the building collapses.

JavaScript = tent. Fine for small things.
TypeScript = skyscraper blueprint process. 

The "blueprint review" is TypeScript's type checker (tsc).
It reads your annotations, checks them against usage, and rejects anything unsafe.

In a fintech company:
A payment function takes amount: number.
If someone accidentally passes amount: string — that's a potential ₹0 charge or ₹NaN error.
TypeScript catches that BEFORE it reaches production.
TypeScript is your financial audit before the money moves.`,
    deep: `HOW TYPESCRIPT WORKS:

1. You write .ts files with type annotations
2. tsc (TypeScript compiler) reads them
3. It performs type checking — finds mismatches
4. It ERASES all type annotations and outputs plain .js
5. That .js runs normally in Node/browser

TypeScript types ONLY exist at compile time.
At runtime, it's just JavaScript. No type checking happens at runtime.

KEY MENTAL MODEL:
Types describe the SHAPE of data.
Shape = what properties exist, what their types are.
The compiler checks that every usage matches the declared shape.

STRUCTURAL TYPING (important):
TypeScript uses structural typing, not nominal typing.
Structural: if two types have the same shape, they're compatible.
Nominal (Java/C#): two types are different if they have different names, even if same shape.

This means:
  type Dog = { name: string; bark: () => void }
  type Cat = { name: string; bark: () => void }
  // In TypeScript, Dog and Cat are COMPATIBLE (same shape)
  // In Java, they'd be completely different types

TYPE INFERENCE:
You don't always need to annotate. TS can infer types.
  const name = "Rahul";  // TS infers: string
  const count = 0;       // TS infers: number
  const user = { id: 1, name: "Rahul" }; // TS infers the shape

Annotate when:
  - Function parameters (TS can't infer these)
  - Return types (for documentation/safety)
  - When inference gives you 'any'`,
    code: `// ─── THE PROBLEM TYPESCRIPT SOLVES ──────────────────

// JavaScript — no errors at write time
function calculateEMI(principal, rate, months) {
  return (principal * rate * Math.pow(1 + rate, months))
    / (Math.pow(1 + rate, months) - 1);
}

calculateEMI("50000", 0.08, 12);   // Silently returns NaN — ₹0 EMI
calculateEMI(50000, "8%", 12);     // Silently returns NaN
calculateEMI(50000, 0.08);         // months is undefined — NaN

// TypeScript — caught BEFORE running
function calculateEMI(
  principal: number,
  rate: number,
  months: number
): number {
  return (principal * rate * Math.pow(1 + rate, months))
    / (Math.pow(1 + rate, months) - 1);
}

// calculateEMI("50000", 0.08, 12);  // Error: Argument of type 'string' not assignable to 'number'
// calculateEMI(50000, "8%", 12);    // Error: same
// calculateEMI(50000, 0.08);        // Error: Expected 3 arguments, got 2


// ─── BASIC TYPE ANNOTATIONS ───────────────────────────

// Primitives
const userId: string = "u_123";
const balance: number = 50000;
const isActive: boolean = true;
const sessionToken: null = null;
const pendingUpdate: undefined = undefined;

// TypeScript infers these automatically — no annotation needed:
const userId2 = "u_123";    // inferred as string
const balance2 = 50000;     // inferred as number


// ─── OBJECT TYPES ─────────────────────────────────────

// Inline type annotation
const user: { id: string; name: string; balance: number } = {
  id: "u_123",
  name: "Rahul",
  balance: 50000
};

// Better: named type alias (covered in next concept)
type User = {
  id: string;
  name: string;
  balance: number;
  email?: string;  // optional property
};

const rahul: User = { id: "u_123", name: "Rahul", balance: 50000 };
// rahul.email is fine to be missing — it's optional


// ─── ARRAYS ───────────────────────────────────────────

const prices: number[] = [100, 200, 300];
const names: string[] = ["Rahul", "Priya", "Arjun"];
const users: User[] = [rahul];

// Alternative syntax
const prices2: Array<number> = [100, 200, 300];


// ─── FUNCTION TYPES ───────────────────────────────────

// Parameters + return type
function add(a: number, b: number): number {
  return a + b;
}

// Arrow function
const multiply = (a: number, b: number): number => a * b;

// Optional parameter
function greet(name: string, title?: string): string {
  return title ? \`Hello \${title} \${name}\` : \`Hello \${name}\`;
}

// Default parameter
function createUser(name: string, role: string = "viewer"): User {
  return { id: crypto.randomUUID(), name, balance: 0 };
}

// void return (function that doesn't return a value)
function logTransaction(id: string): void {
  console.log("Transaction:", id);
}

// never return (function that never returns — throws or infinite loop)
function throwError(message: string): never {
  throw new Error(message);
}


// ─── TYPE INFERENCE IN PRACTICE ──────────────────────

// TS infers return type from function body
function getDiscount(price: number) {   // return type inferred as number
  return price > 1000 ? price * 0.1 : 0;
}

// TS infers array element types
const transactions = [
  { id: "t1", amount: 500 },
  { id: "t2", amount: 1000 }
];
// TS infers: { id: string; amount: number }[]

// When NOT to rely on inference:
// Complex functions where inferred return type is too broad
// Public APIs where you want to document the contract
// When inference gives you 'any'


// ─── STRUCTURAL TYPING EXAMPLE ───────────────────────

type Employee = {
  id: string;
  name: string;
  department: string;
};

type Contractor = {
  id: string;
  name: string;
  department: string;
  contractEnd: Date;
};

function sendPayslip(person: Employee): void {
  console.log(\`Sending payslip to \${person.name}\`);
}

const contractor: Contractor = {
  id: "c_001",
  name: "Priya",
  department: "Engineering",
  contractEnd: new Date("2024-12-31")
};

// THIS WORKS — Contractor has all properties of Employee (and more)
// TypeScript uses STRUCTURAL compatibility, not name compatibility
sendPayslip(contractor);  // ✓ valid`,
    bugs: `// ─── BUG 1: Thinking types exist at runtime ─────────

type UserRole = "admin" | "viewer" | "editor";

function checkAccess(role: UserRole) {
  // BUG: this type check works at compile time
  // but at RUNTIME, if data comes from API, it might not match
  if (role === "admin") {
    return "full access";
  }
}

// The API might return "ADMIN" or "superadmin"
const roleFromAPI = await fetch("/api/role").then(r => r.text());
// checkAccess(roleFromAPI); // TypeScript might complain — but RUNTIME is what matters

// FIX: Validate at runtime boundaries (API responses, user input)
const validRoles = ["admin", "viewer", "editor"] as const;
function isValidRole(role: string): role is UserRole {
  return (validRoles as readonly string[]).includes(role);
}

const role = await fetch("/api/role").then(r => r.text());
if (isValidRole(role)) {
  checkAccess(role);  // Now TypeScript AND runtime are in sync
}


// ─── BUG 2: Using 'any' as an escape hatch ───────────

// WRONG: any defeats the entire purpose of TypeScript
async function fetchUser(id: string): Promise<any> {
  const res = await fetch(\`/api/users/\${id}\`);
  return res.json();
}

const user = await fetchUser("u_123");
console.log(user.naem);  // typo — no error! any skips checking

// FIX: type the response properly
type UserResponse = {
  id: string;
  name: string;
  email: string;
};

async function fetchUserTyped(id: string): Promise<UserResponse> {
  const res = await fetch(\`/api/users/\${id}\`);
  return res.json() as Promise<UserResponse>;
}

const user2 = await fetchUserTyped("u_123");
// user2.naem  // Error: Property 'naem' does not exist — caught!


// ─── BUG 3: Object literal excess property checking ──

type Config = { host: string; port: number };

// This fails — TypeScript is strict about object literals
const config: Config = {
  host: "localhost",
  port: 3000,
  // debug: true  // Error: Object literal may only specify known properties
};

// But this passes — structural typing allows extra props when not a literal
const rawConfig = { host: "localhost", port: 3000, debug: true };
const config2: Config = rawConfig;  // works — structural compatibility`,
    challenge: `// CHALLENGE: Type everything in this JavaScript code
// Convert it to proper TypeScript with no 'any'

// BEFORE (JavaScript):
function processOrder(order) {
  const subtotal = order.items.reduce((sum, item) => {
    return sum + (item.price * item.quantity);
  }, 0);

  const discount = order.coupon
    ? applyDiscount(subtotal, order.coupon)
    : 0;

  return {
    orderId: order.id,
    customerId: order.customerId,
    subtotal,
    discount,
    tax: (subtotal - discount) * 0.18,
    total: (subtotal - discount) * 1.18,
    status: "pending"
  };
}

function applyDiscount(amount, coupon) {
  if (coupon.type === "percent") {
    return amount * (coupon.value / 100);
  }
  return Math.min(coupon.value, amount);
}

// AFTER: Write the TypeScript version with:
// - Type for OrderItem
// - Type for Coupon (with union type for type field)
// - Type for Order
// - Type for ProcessedOrder (return value)
// - Proper function signatures
// - No 'any' anywhere`,
    summary: "TypeScript adds compile-time type checking to JavaScript. Types are erased at runtime — it's still just JS. The goal is catching bugs before they ship, not making code harder to write."
  },

  {
    id: 2,
    title: "Type vs Interface",
    tag: "SHAPES OF DATA",
    color: "#34d399",
    tldr: "Both describe object shapes. Interface is for objects and classes — it's extendable and supports declaration merging. Type is more flexible — handles unions, intersections, primitives, tuples. In practice: use type for most things, interface when you need class-based OOP or declaration merging.",
    problem: `When developers first learn TypeScript, they use type and interface interchangeably and get confused when they behave differently. The confusion leads to picking one and sticking to it rigidly. But each has genuine use cases. Understanding the difference means you write more expressive types that communicate intent clearly.`,
    analogy: `INTERFACE is a CONTRACT.
Like a job description: "This role must have: name, email, startDate."
Anyone fulfilling this contract must have all these things.
You can ADD to the contract later (declaration merging).
Classes can sign the contract (implements).

TYPE is a BLUEPRINT or FORMULA.
More flexible. Can describe: "Either a PaymentCard OR a BankAccount."
Can combine: "An Employee AND a Manager."
Can alias: "A PhoneNumber is just a string."
Can describe tuples: "A coordinate is [number, number]."

In product development:
Interface = the API contract your service exposes.
  "Our UserService will provide: getUser, createUser, deleteUser"

Type = the data shapes flowing through your system.
  "A Transaction is either a Credit or a Debit"
  "A DateRange is [startDate, endDate]"`,
    deep: `INTERFACE CAPABILITIES:
  - Object shapes
  - Class contracts (implements)
  - Extending other interfaces
  - Declaration merging (same name, auto-merged)
  - Cannot represent unions/intersections/primitives directly

TYPE CAPABILITIES:
  - Object shapes (same as interface)
  - Union types: A | B
  - Intersection types: A & B
  - Primitive aliases: type ID = string
  - Tuple types: type Pair = [string, number]
  - Mapped types
  - Conditional types
  - Template literal types
  - Cannot be merged (re-declaring = error)

EXTENSION:
  interface extends interface: interface B extends A {}
  interface extends type: interface B extends A {} (if A is object shape)
  type extends type: type B = A & { extra: string }
  type extends interface: type B = A & { extra: string }

DECLARATION MERGING (interface only):
  interface Window { myCustomProp: string }
  interface Window { anotherProp: number }
  // Both merge — Window now has both properties
  // Useful for extending third-party types

WHEN TO USE WHICH:
  Use interface:
    - Public API shapes that others will implement
    - When working with classes (implements)
    - When you need declaration merging (extending 3rd party types)
  
  Use type:
    - Union types
    - Intersection types
    - Utility type transformations
    - Tuples
    - Primitive aliases for semantic meaning
    - Everything else (default choice for most devs)`,
    code: `// ─── INTERFACE: OBJECT SHAPES & CONTRACTS ────────────

interface User {
  id: string;
  name: string;
  email: string;
  createdAt: Date;
  role: "admin" | "viewer" | "editor";
}

interface Product {
  id: string;
  name: string;
  price: number;
  stock: number;
  category: string;
}

// Extending interfaces
interface AdminUser extends User {
  permissions: string[];
  canDeleteUsers: boolean;
  auditLog: { action: string; timestamp: Date }[];
}

// Multiple extension
interface SuperAdmin extends AdminUser {
  accessLevel: "god_mode";
  emergencyOverride: () => void;
}


// ─── INTERFACE: CLASS CONTRACTS ───────────────────────

interface PaymentGateway {
  name: string;
  charge(amount: number, currency: string): Promise<ChargeResult>;
  refund(transactionId: string, amount?: number): Promise<RefundResult>;
  getStatus(transactionId: string): Promise<TransactionStatus>;
}

interface ChargeResult {
  success: boolean;
  transactionId: string;
  amount: number;
  timestamp: Date;
}

// Classes IMPLEMENT interfaces — they sign the contract
class PaymentGatewayA implements PaymentGateway {
  name = "PaymentSDK";

  async charge(amount: number, currency: string): Promise<ChargeResult> {
    // PaymentSDK-specific implementation
    const result = await gatewayAPI.createCharge({ amount, currency });
    return {
      success: result.status === "captured",
      transactionId: result.id,
      amount: result.amount,
      timestamp: new Date()
    };
  }

  async refund(transactionId: string, amount?: number): Promise<RefundResult> {
    return gatewayAPI.refund(transactionId, amount);
  }

  async getStatus(transactionId: string): Promise<TransactionStatus> {
    return gatewayAPI.fetchPayment(transactionId);
  }
}

class PaymentGatewayB implements PaymentGateway {
  name = "Stripe";
  // Must implement ALL methods in the interface — TypeScript enforces this

  async charge(amount: number, currency: string): Promise<ChargeResult> {
    // Stripe-specific implementation
    const intent = await stripeAPI.paymentIntents.create({ amount, currency });
    return { success: true, transactionId: intent.id, amount, timestamp: new Date() };
  }

  async refund(transactionId: string, amount?: number): Promise<RefundResult> {
    return stripeAPI.refunds.create({ payment_intent: transactionId, amount });
  }

  async getStatus(transactionId: string): Promise<TransactionStatus> {
    return stripeAPI.paymentIntents.retrieve(transactionId);
  }
}

// Now you can swap gateways without changing the calling code
function processPayment(gateway: PaymentGateway, amount: number) {
  return gateway.charge(amount, "INR");  // works with ANY gateway
}

processPayment(new PaymentGatewayA(), 5000);  // ✓
processPayment(new PaymentGatewayB(), 5000);    // ✓


// ─── TYPE: UNION TYPES ────────────────────────────────

// A payment can be made in multiple ways
type PaymentMethod =
  | { kind: "card"; cardNumber: string; cvv: string; expiry: string }
  | { kind: "upi"; vpa: string }
  | { kind: "netbanking"; bankCode: string; accountNumber: string }
  | { kind: "wallet"; walletId: string; provider: "paytm" | "phonepe" | "gpay" };

function processPaymentMethod(method: PaymentMethod): string {
  switch (method.kind) {
    case "card":
      return \`Charging card ending \${method.cardNumber.slice(-4)}\`;
    case "upi":
      return \`UPI transfer to \${method.vpa}\`;
    case "netbanking":
      return \`Net banking via \${method.bankCode}\`;
    case "wallet":
      return \`\${method.provider} wallet: \${method.walletId}\`;
  }
}


// ─── TYPE: INTERSECTION TYPES ─────────────────────────

type Timestamps = {
  createdAt: Date;
  updatedAt: Date;
  deletedAt?: Date;
};

type AuditFields = {
  createdBy: string;
  updatedBy: string;
  version: number;
};

// Combine base types with & (intersection)
type BaseEntity = Timestamps & AuditFields;

// Every entity in your system gets these fields
type Order = BaseEntity & {
  id: string;
  userId: string;
  items: OrderItem[];
  total: number;
  status: OrderStatus;
};

type Invoice = BaseEntity & {
  id: string;
  orderId: string;
  amount: number;
  dueDate: Date;
  paid: boolean;
};

// This prevents forgetting audit fields — every entity MUST have them


// ─── TYPE: TUPLES ─────────────────────────────────────

// A coordinate is always [latitude, longitude]
type Coordinate = [number, number];

// A range is always [start, end]
type DateRange = [Date, Date];
type PriceRange = [number, number];

// Named tuple elements (TS 4.0+)
type RGB = [red: number, green: number, blue: number];

const productLocation: Coordinate = [19.076, 72.877]; // Mumbai
const saleWindow: DateRange = [new Date("2024-01-01"), new Date("2024-01-31")];

// React useState returns a tuple
const [count, setCount]: [number, (n: number) => void] = useState(0);


// ─── TYPE: PRIMITIVE ALIASES (semantic types) ─────────

// Instead of bare strings everywhere, give them meaning
type UserId = string;
type ProductId = string;
type OrderId = string;
type CurrencyCode = string;
type EmailAddress = string;
type PhoneNumber = string;

// Now function signatures are self-documenting
function transferFunds(
  fromUserId: UserId,
  toUserId: UserId,
  amount: number,
  currency: CurrencyCode
): Promise<TransactionId> {
  // cannot accidentally swap fromUserId and toUserId with a ProductId
}

// Type alias for complex function types
type EventHandler<T> = (event: T, context: RequestContext) => Promise<void>;
type Middleware = (req: Request, res: Response, next: NextFunction) => void;
type Validator<T> = (value: T) => { valid: boolean; errors: string[] };


// ─── DECLARATION MERGING (interface superpower) ───────

// Extend built-in types (like Express Request)
// In a .d.ts file or at the top of your file:
declare global {
  interface Window {
    analytics: AnalyticsInstance;
    featureFlags: Record<string, boolean>;
  }
}

// Now TypeScript knows about window.analytics and window.featureFlags

// Extend Express Request to add your custom properties
// (module declaration) {
  interface Request {
    user?: AuthenticatedUser;
    requestId: string;
    startTime: number;
  }
}

// Now in any Express handler:
app.get("/dashboard", (req, res) => {
  const user = req.user;        // TypeScript knows this exists
  const id = req.requestId;     // TypeScript knows this exists
});`,
    bugs: `// ─── BUG 1: Using interface for unions ───────────────

// WRONG: interface cannot express union
// interface Result {
//   success: true | false;  // This is valid but loses type narrowing
// }

// RIGHT: type with discriminated union
type Result<T> =
  | { success: true; data: T }
  | { success: false; error: string };

function handleResult<T>(result: Result<T>) {
  if (result.success) {
    console.log(result.data);  // TS knows data exists here
  } else {
    console.log(result.error); // TS knows error exists here
  }
}


// ─── BUG 2: Forgetting optional vs required ───────────

interface OrderForm {
  customerId: string;
  items: OrderItem[];
  shippingAddress: string;
  couponCode: string;  // BUG: not all orders have coupons!
}

// Every order creation would need a couponCode even when there isn't one
// Fix: make it optional
interface OrderFormFixed {
  customerId: string;
  items: OrderItem[];
  shippingAddress: string;
  couponCode?: string;  // optional — can be omitted
}


// ─── BUG 3: Interface vs type for readonly ────────────

interface Config {
  apiUrl: string;
  timeout: number;
}

const config: Config = { apiUrl: "https://api.com", timeout: 5000 };
config.apiUrl = "hacked!";  // TypeScript allows this — not readonly!

// FIX: readonly modifier
interface ReadonlyConfig {
  readonly apiUrl: string;
  readonly timeout: number;
}

const config2: ReadonlyConfig = { apiUrl: "https://api.com", timeout: 5000 };
// config2.apiUrl = "hacked!";  // Error: Cannot assign to 'apiUrl' — readonly

// Or use Readonly utility type:
type ImmutableConfig = Readonly<Config>;`,
    challenge: `// CHALLENGE: Design a type system for a SaaS product

// You're building a project management tool (like Linear/Jira).
// Design the complete type system using interface where appropriate
// and type where appropriate.

// Requirements:
// 1. A Workspace has: id, name, slug, plan (free/pro/enterprise), createdAt
// 2. A Project belongs to a Workspace: id, workspaceId, name, description?, status
// 3. An Issue belongs to a Project: id, projectId, title, description?,
//    status (todo/in_progress/in_review/done/cancelled),
//    priority (urgent/high/medium/low),
//    assigneeId?, labels: string[], dueDate?
// 4. A Comment belongs to an Issue: id, issueId, authorId, body, createdAt, editedAt?
// 5. Status transitions are only valid: todo→in_progress, in_progress→in_review,
//    in_review→done OR in_review→in_progress, done→cancelled
//    Model this as a type.
// 6. Create a IssueService interface with methods:
//    - createIssue, getIssue, updateIssue, deleteIssue, transitionStatus
//    Make sure transitionStatus enforces valid transitions via types.
// 7. All entities need Timestamps (createdAt, updatedAt)
//    Use intersection types to add these without repeating.

// Bonus: Add a NotificationPayload type that is a union of:
// - IssueAssigned, IssueStatusChanged, CommentAdded, IssueDueSoon
// Each with different fields relevant to that notification type.`,
    summary: "Interface = contracts for objects and classes, supports declaration merging. Type = everything else — unions, intersections, tuples, aliases. Use type by default, interface for OOP contracts and extending third-party types."
  },

  {
    id: 3,
    title: "Generics",
    tag: "REUSABLE TYPE SAFETY",
    color: "#f59e0b",
    tldr: "Generics let you write one function, class, or type that works with multiple types while keeping full type safety. <T> is a type variable — a placeholder for 'whatever type you pass in'. Without generics, you choose between losing type safety (using any) or writing the same function 10 times for 10 types.",
    problem: `Imagine you write a function that wraps an API response. Without generics, you either type it as 'any' (lose all safety) or write separate versions for UserResponse, ProductResponse, OrderResponse, etc. Generics let you write ONE function that works for all of them, and TypeScript figures out the types automatically at each call site.`,
    analogy: `Think of a SHIPPING CONTAINER.

A generic shipping container can hold ANYTHING:
- Fill it with electronics → it becomes an electronics container
- Fill it with clothes → it becomes a clothes container
- Fill it with books → it becomes a books container

The container itself doesn't care what's inside.
But when you declare "this container has electronics", it ONLY holds electronics.
You can't accidentally mix electronics and clothes in the same container.

In TypeScript:
Container<Electronics> — can only put Electronics in, only get Electronics out.
Container<Clothing> — can only put Clothing in, only get Clothing out.

A non-generic container (using any) would accept everything and return everything.
You'd never know what you're getting out — dangerous in a warehouse.

In a bank:
A generic Account<CurrencyType> works for INR accounts, USD accounts, EUR accounts.
One Account class, typed separately for each currency.
You can't accidentally add USD to an INR account.`,
    deep: `GENERIC SYNTAX:
  function fn<T>(arg: T): T {}           // function generic
  const fn = <T>(arg: T): T => {};       // arrow function (JSX needs <T,>)
  interface Box<T> { value: T }          // interface generic
  type Result<T> = { data: T }           // type generic
  class Stack<T> { items: T[] = [] }     // class generic

TYPE PARAMETER NAMING CONVENTIONS:
  T — generic Type (most common)
  K — Key type
  V — Value type
  E — Element type
  R — Return type
  TData, TError — descriptive names for complex generics

GENERIC CONSTRAINTS (extends):
  <T extends object> — T must be an object
  <T extends string | number> — T must be string or number
  <T extends { id: string }> — T must have an id property
  <K extends keyof T> — K must be a key of T

DEFAULT TYPE PARAMETERS:
  type Container<T = string> — defaults to string if not specified

MULTIPLE TYPE PARAMETERS:
  function map<T, R>(array: T[], fn: (item: T) => R): R[]
  Here T is input type, R is output type

WHEN TO ADD CONSTRAINTS:
  Add constraints when you need to USE properties of T inside the function.
  If you only pass T around without using its properties — no constraint needed.
  If you need to access T.id — add <T extends { id: string }>`,
    code: `// ─── WHY GENERICS EXIST ──────────────────────────────

// WITHOUT generics — repeat for every type:
function wrapUserResponse(data: User): { data: User; timestamp: Date; success: true } {
  return { data, timestamp: new Date(), success: true };
}
function wrapProductResponse(data: Product): { data: Product; timestamp: Date; success: true } {
  return { data, timestamp: new Date(), success: true };
}
// ... repeat for every type — terrible

// WITH generics — one function, all types:
function wrapResponse<T>(data: T): { data: T; timestamp: Date; success: true } {
  return { data, timestamp: new Date(), success: true };
}

const userRes = wrapResponse(user);       // TypeScript infers T = User
const productRes = wrapResponse(product); // TypeScript infers T = Product
// TypeScript knows userRes.data is User, productRes.data is Product


// ─── GENERIC CONSTRAINTS ─────────────────────────────

// Without constraint — T could be anything, can't access properties
function getId<T>(item: T): string {
  // return item.id;  // Error: Property 'id' does not exist on type 'T'
}

// With constraint — T must have id property
function getId<T extends { id: string }>(item: T): string {
  return item.id;  // Now TypeScript knows .id exists
}

getId(user);     // ✓ User has id: string
getId(product);  // ✓ Product has id: string
// getId(42);   // Error: number doesn't have id property


// ─── GENERIC API RESPONSE WRAPPER ────────────────────

// A consistent API response shape for your entire backend
type ApiResponse<TData, TError = string> =
  | { success: true; data: TData; statusCode: number; timestamp: string }
  | { success: false; error: TError; statusCode: number; timestamp: string };

// Generic helper to create responses
function createSuccess<T>(data: T, statusCode: number = 200): ApiResponse<T> {
  return {
    success: true,
    data,
    statusCode,
    timestamp: new Date().toISOString()
  };
}

function createError<TError = string>(
  error: TError,
  statusCode: number = 500
): ApiResponse<never, TError> {
  return {
    success: false,
    error,
    statusCode,
    timestamp: new Date().toISOString()
  };
}

// Usage in Express handlers:
app.get("/users/:id", async (req, res) => {
  try {
    const user = await UserService.findById(req.params.id);
    res.json(createSuccess(user));
    // TypeScript knows response.data is User
  } catch (err) {
    res.status(404).json(createError("User not found", 404));
  }
});


// ─── GENERIC REPOSITORY PATTERN ──────────────────────

// One interface for ALL database entities
interface Repository<T extends { id: string }> {
  findById(id: string): Promise<T | null>;
  findAll(filter?: Partial<T>): Promise<T[]>;
  create(data: Omit<T, "id" | "createdAt" | "updatedAt">): Promise<T>;
  update(id: string, data: Partial<T>): Promise<T>;
  delete(id: string): Promise<void>;
  count(filter?: Partial<T>): Promise<number>;
}

// Implement once for each entity
class UserRepository implements Repository<User> {
  async findById(id: string): Promise<User | null> {
    return db.query("SELECT * FROM users WHERE id = $1", [id]);
  }

  async findAll(filter?: Partial<User>): Promise<User[]> {
    // build query from filter
    return db.query("SELECT * FROM users");
  }

  async create(data: Omit<User, "id" | "createdAt" | "updatedAt">): Promise<User> {
    return db.query("INSERT INTO users ... RETURNING *", [data]);
  }

  async update(id: string, data: Partial<User>): Promise<User> {
    return db.query("UPDATE users SET ... WHERE id = $1 RETURNING *", [id]);
  }

  async delete(id: string): Promise<void> {
    await db.query("DELETE FROM users WHERE id = $1", [id]);
  }

  async count(filter?: Partial<User>): Promise<number> {
    return db.query("SELECT COUNT(*) FROM users");
  }
}

// Same pattern for every entity — no repeat logic
class ProductRepository implements Repository<Product> { /* same structure */ }
class OrderRepository implements Repository<Order> { /* same structure */ }


// ─── GENERIC DATA STRUCTURES ─────────────────────────

class Stack<T> {
  private items: T[] = [];

  push(item: T): void {
    this.items.push(item);
  }

  pop(): T | undefined {
    return this.items.pop();
  }

  peek(): T | undefined {
    return this.items[this.items.length - 1];
  }

  isEmpty(): boolean {
    return this.items.length === 0;
  }

  size(): number {
    return this.items.length;
  }
}

// Use for undo/redo in a document editor
const undoStack = new Stack<DocumentState>();
const navigationStack = new Stack<Route>();
const transactionStack = new Stack<Transaction>();


// ─── GENERIC HOOKS (React) ────────────────────────────

// Generic fetch hook — works for ANY endpoint
function useFetch<T>(url: string): {
  data: T | null;
  loading: boolean;
  error: string | null;
  refetch: () => void;
} {
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchData = async () => {
    try {
      setLoading(true);
      const res = await fetch(url);
      if (!res.ok) throw new Error(\`HTTP \${res.status}\`);
      const json: T = await res.json();
      setData(json);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Unknown error");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchData(); }, [url]);

  return { data, loading, error, refetch: fetchData };
}

// Usage — TypeScript knows exact types:
const { data: user } = useFetch<User>("/api/users/123");
// user is User | null — TypeScript knows the shape

const { data: products } = useFetch<Product[]>("/api/products");
// products is Product[] | null


// ─── ADVANCED: GENERIC WITH MULTIPLE PARAMS ───────────

// Generic map function (like Array.map but typed)
function mapArray<TInput, TOutput>(
  array: TInput[],
  transform: (item: TInput, index: number) => TOutput
): TOutput[] {
  return array.map(transform);
}

// TypeScript infers all types automatically
const prices = mapArray(products, p => p.price);
// prices: number[] — inferred from Product.price

const summaries = mapArray(orders, o => ({
  id: o.id,
  total: o.total,
  date: o.createdAt.toLocaleDateString()
}));
// summaries: { id: string; total: number; date: string }[] — fully inferred


// ─── GENERIC VALIDATOR ────────────────────────────────

type ValidationResult<T> = {
  valid: boolean;
  data?: T;
  errors: { field: keyof T; message: string }[];
};

function createValidator<T extends object>(
  rules: { [K in keyof T]?: (value: T[K]) => string | null }
) {
  return function validate(data: T): ValidationResult<T> {
    const errors: { field: keyof T; message: string }[] = [];

    for (const field in rules) {
      const rule = rules[field];
      if (rule) {
        const error = rule(data[field]);
        if (error) {
          errors.push({ field, message: error });
        }
      }
    }

    return {
      valid: errors.length === 0,
      data: errors.length === 0 ? data : undefined,
      errors
    };
  };
}

// Create typed validators
const validateUser = createValidator<User>({
  name: (name) => name.length < 2 ? "Name too short" : null,
  email: (email) => !email.includes("@") ? "Invalid email" : null,
  balance: (balance) => balance < 0 ? "Balance cannot be negative" : null,
});

const result = validateUser({ id: "u1", name: "R", email: "invalid", balance: -100, role: "viewer", createdAt: new Date() });
// result.errors[0].field is keyof User — fully typed`,
    bugs: `// ─── BUG 1: Generic that's too permissive ────────────

// BUG: T can be ANYTHING — not useful
function processItem<T>(item: T) {
  return item;  // can only pass it around, can't use any properties
}

// When you actually need properties, add constraints
function processEntity<T extends { id: string; updatedAt: Date }>(item: T): T {
  item.updatedAt = new Date();  // valid — we know it has updatedAt
  return item;
}


// ─── BUG 2: Losing type information with as ───────────

async function fetchData<T>(url: string): Promise<T> {
  const res = await fetch(url);
  return res.json() as T;  // BUG: this is a lie — runtime JSON has no types
}

// The API might return { error: "not found" } but T is User
// TypeScript trusts you — this is a type assertion, not a guarantee

// BETTER: validate at runtime with a parser
// import { z } // (zod - install: npm i zod);  ← install: npm i zod

const UserSchema = z.object({
  id: z.string(),
  name: z.string(),
  email: z.string().email()
});

async function fetchUser(url: string): Promise<User> {
  const res = await fetch(url);
  const raw = await res.json();
  return UserSchema.parse(raw);  // throws if shape doesn't match
}


// ─── BUG 3: Arrow functions in JSX with generics ─────

// WRONG in .tsx files — TypeScript thinks <T> is a JSX element
// const identity = <T>(arg: T): T => arg;  // parse error in .tsx

// FIX 1: Add comma after T
const identity = <T,>(arg: T): T => arg;

// FIX 2: Use extends
const identity2 = <T extends unknown>(arg: T): T => arg;

// FIX 3: Use regular function syntax
function identity3<T>(arg: T): T { return arg; }`,
    challenge: `// CHALLENGE: Build a generic state management system

// You're building a simple Redux-like state store.
// Make it completely generic so it works with ANY state shape.

// Requirements:
// 1. Store<TState> class with:
//    - constructor(initialState: TState)
//    - getState(): TState
//    - subscribe(listener: (state: TState) => void): () => void (returns unsubscribe)
//    - dispatch<TAction>(action: TAction, reducer: (state: TState, action: TAction) => TState): void

// 2. Create a createSlice<TState, TActions> helper that:
//    - Takes initialState and an object of reducer functions
//    - Returns typed action creators and a reducer
//    - TActions should be inferred from the reducer functions

// 3. Test it with:
//    - CartState: { items: CartItem[]; total: number; coupon: string | null }
//    - Actions: addItem, removeItem, applyCoupon, clearCart

// 4. TypeScript must enforce:
//    - You cannot dispatch an action type that doesn't exist
//    - Each action creator has correct parameter types
//    - getState() always returns the correct CartState shape

// Example usage should look like:
// const store = new Store<CartState>(initialState);
// store.dispatch(actions.addItem({ id: "p1", price: 500 }));
// const state = store.getState(); // TypeScript knows it's CartState`,
    summary: "Generics let you write code once that works for many types. <T> is a type variable filled in at call time. Constraints (extends) limit what T can be. Use generics whenever a function/class should work with multiple types without losing type safety."
  },

  {
    id: 4,
    title: "Union & Intersection Types",
    tag: "COMBINING TYPES",
    color: "#e879f9",
    tldr: "Union (|) means 'this OR that' — a value can be one of several types. Intersection (&) means 'this AND that' — a value must satisfy ALL types. These two operators let you model real-world data precisely and safely.",
    problem: `Real data isn't always one clean type. A payment can be a card OR UPI OR bank transfer. A user can be a free OR paid OR enterprise customer. A function can return a result OR an error. Without union and intersection types, you either use 'any' (lose safety) or create huge redundant types. These operators let you compose types that match reality.`,
    analogy: `UNION ( | ) = MENU OPTIONS
A restaurant menu says: "Pick ONE of: Burger, Pizza, Salad"
Your order is a Burger OR a Pizza OR a Salad — not all three.
type Meal = Burger | Pizza | Salad

INTERSECTION ( & ) = JOB REQUIREMENTS
A job posting says: "Must have: Engineering skills AND Management skills AND Communication skills"
The employee must have ALL THREE simultaneously.
type SeniorEngineer = EngineeringSkills & ManagementSkills & CommunicationSkills

REAL WORLD:
A loan application is either:
  Approved (with loan amount, terms)  OR
  Rejected (with reason)              OR
  Pending (with expected date)
→ Union type

A DashboardUser is:
  A User AND HasPermissions AND HasPreferences
→ Intersection type`,
    deep: `UNION TYPE RULES:
  type A = X | Y
  - A value of type A can be X or Y
  - You can ONLY use properties that exist on BOTH X and Y without narrowing
  - Narrowing (if/switch) unlocks type-specific properties

DISCRIMINATED UNION (most powerful pattern):
  Add a literal type field (kind/type/status) to each variant
  TypeScript uses this "discriminant" to narrow the type in switch/if
  Every variant has a unique literal for the discriminant field

INTERSECTION TYPE RULES:
  type A = X & Y
  - A value of type A must have ALL properties of BOTH X and Y
  - If X has { a: string } and Y has { b: number }, A has both
  - Conflicting property types produce 'never'
  
NEVER TYPE:
  never = the impossible type — a value that can never exist
  string & number = never (can't be both)
  Used in exhaustive checks to ensure you handle all union cases

NARROWING TECHNIQUES:
  typeof — primitive type check: typeof x === "string"
  instanceof — class instance check: x instanceof Date
  in operator — property existence: "id" in x
  discriminant — check a literal field: x.kind === "card"
  custom type guard — function returning "arg is Type"`,
    code: `// ─── UNION TYPES IN DEPTH ────────────────────────────

// Basic union
type Status = "active" | "inactive" | "suspended" | "deleted";
type Priority = "low" | "medium" | "high" | "critical";
type HttpMethod = "GET" | "POST" | "PUT" | "PATCH" | "DELETE";

// Union with different shapes — discriminated union
type TransactionResult =
  | { status: "success"; transactionId: string; amount: number; timestamp: Date }
  | { status: "failed"; errorCode: string; errorMessage: string; retryable: boolean }
  | { status: "pending"; expectedCompletionTime: Date; pollInterval: number };

function handleTransaction(result: TransactionResult) {
  switch (result.status) {
    case "success":
      // TypeScript KNOWS result has transactionId, amount, timestamp
      sendReceipt(result.transactionId, result.amount);
      break;

    case "failed":
      // TypeScript KNOWS result has errorCode, errorMessage, retryable
      if (result.retryable) {
        scheduleRetry(result.errorCode);
      } else {
        notifyFailure(result.errorMessage);
      }
      break;

    case "pending":
      // TypeScript KNOWS result has expectedCompletionTime, pollInterval
      pollForCompletion(result.expectedCompletionTime, result.pollInterval);
      break;
  }
}


// ─── EXHAUSTIVE UNION CHECKING ────────────────────────

type NotificationType = "email" | "sms" | "push" | "webhook";

function sendNotification(type: NotificationType, payload: NotificationPayload): void {
  switch (type) {
    case "email":
      emailService.send(payload);
      break;
    case "sms":
      smsService.send(payload);
      break;
    case "push":
      pushService.send(payload);
      break;
    case "webhook":
      webhookService.send(payload);
      break;
    default:
      // This forces TypeScript to error if you add a new type
      // and forget to handle it
      const exhaustiveCheck: never = type;
      throw new Error(\`Unhandled notification type: \${exhaustiveCheck}\`);
  }
}

// If you add "inapp" to NotificationType without handling it:
// TypeScript will error: Type 'string' is not assignable to type 'never'
// This is compile-time protection against missing cases


// ─── REAL WORLD: API Response modeling ───────────────

type ApiError =
  | { code: "UNAUTHORIZED"; message: string; redirectTo: string }
  | { code: "NOT_FOUND"; resource: string; resourceId: string }
  | { code: "VALIDATION_ERROR"; fields: { field: string; message: string }[] }
  | { code: "RATE_LIMITED"; retryAfter: number; limit: number }
  | { code: "SERVER_ERROR"; requestId: string; message: string };

function handleApiError(error: ApiError): void {
  switch (error.code) {
    case "UNAUTHORIZED":
      redirectToLogin(error.redirectTo);
      break;
    case "NOT_FOUND":
      show404Page(error.resource, error.resourceId);
      break;
    case "VALIDATION_ERROR":
      highlightFormErrors(error.fields);  // error.fields is fully typed
      break;
    case "RATE_LIMITED":
      showRateLimitMessage(error.retryAfter); // error.retryAfter is number
      break;
    case "SERVER_ERROR":
      reportToSentry(error.requestId, error.message);
      break;
  }
}


// ─── INTERSECTION TYPES IN DEPTH ─────────────────────

// Building block types
type HasId = { id: string };
type HasTimestamps = { createdAt: Date; updatedAt: Date };
type HasSoftDelete = { deletedAt: Date | null; isDeleted: boolean };
type HasAudit = { createdBy: string; updatedBy: string };
type HasVersion = { version: number };

// Compose entities from building blocks
type BaseEntity = HasId & HasTimestamps;
type AuditableEntity = BaseEntity & HasAudit & HasVersion;
type SoftDeletableEntity = AuditableEntity & HasSoftDelete;

// Every entity in your system
type User = SoftDeletableEntity & {
  name: string;
  email: string;
  role: UserRole;
};

type Product = AuditableEntity & {
  name: string;
  price: number;
  stock: number;
  category: string;
};

type Order = SoftDeletableEntity & {
  userId: string;
  items: OrderItem[];
  total: number;
  status: OrderStatus;
};


// ─── INTERSECTION FOR MIXINS/CAPABILITIES ─────────────

type Cacheable = {
  cacheKey: string;
  cacheTtl: number;
  invalidateCache: () => Promise<void>;
};

type Searchable = {
  searchIndex: string;
  searchableFields: string[];
  reindex: () => Promise<void>;
};

type Exportable = {
  exportFormats: ("csv" | "json" | "xlsx")[];
  export: (format: "csv" | "json" | "xlsx") => Promise<Blob>;
};

// A rich entity with all capabilities
type FullProduct = Product & Cacheable & Searchable & Exportable;

// TypeScript enforces that FullProduct implementations provide everything
function createProductService(): { getProduct: (id: string) => Promise<FullProduct> } {
  // Must return objects with ALL properties of FullProduct
}


// ─── NARROWING TECHNIQUES ─────────────────────────────

type StringOrNumber = string | number;

function processValue(value: StringOrNumber) {
  // typeof narrowing
  if (typeof value === "string") {
    return value.toUpperCase();  // TS knows: string
  }
  return value.toFixed(2);       // TS knows: number
}

// instanceof narrowing
type AnyDate = Date | string | number;

function normalizeDate(date: AnyDate): Date {
  if (date instanceof Date) {
    return date;              // TS knows: Date
  }
  return new Date(date);      // TS knows: string | number
}

// 'in' operator narrowing
type AdminDashboard = { role: "admin"; auditLog: AuditEntry[]; userCount: number };
type UserDashboard = { role: "user"; orders: Order[]; wishlist: Product[] };
type Dashboard = AdminDashboard | UserDashboard;

function renderDashboard(dashboard: Dashboard) {
  if ("auditLog" in dashboard) {
    // TS knows: AdminDashboard
    renderAdminView(dashboard.auditLog, dashboard.userCount);
  } else {
    // TS knows: UserDashboard
    renderUserView(dashboard.orders, dashboard.wishlist);
  }
}


// ─── CUSTOM TYPE GUARDS ───────────────────────────────

// Type predicate: "arg is Type" in return position
function isUser(value: unknown): value is User {
  return (
    typeof value === "object" &&
    value !== null &&
    "id" in value &&
    "name" in value &&
    "email" in value
  );
}

function isApiError(value: unknown): value is ApiError {
  return (
    typeof value === "object" &&
    value !== null &&
    "code" in value &&
    typeof (value as any).code === "string"
  );
}

// Usage
async function fetchUserSafe(id: string): Promise<User | null> {
  try {
    const res = await fetch(\`/api/users/\${id}\`);
    const data = await res.json();

    if (isUser(data)) {
      return data;  // TypeScript knows data is User here
    }
    return null;
  } catch {
    return null;
  }
}`,
    bugs: `// ─── BUG 1: Accessing union properties without narrowing ─

type Employee =
  | { type: "fulltime"; salary: number; benefits: string[] }
  | { type: "contractor"; hourlyRate: number; contractEnd: Date };

function getCompensation(emp: Employee): number {
  // BUG: can't access salary or hourlyRate without narrowing
  // return emp.salary;  // Error: Property 'salary' does not exist on type 'Employee'

  // FIX: narrow first
  if (emp.type === "fulltime") {
    return emp.salary;      // TS knows: fulltime
  }
  return emp.hourlyRate * 160; // TS knows: contractor
}


// ─── BUG 2: Intersection with conflicting types ───────

type A = { value: string };
type B = { value: number };
type Conflict = A & B;

// Conflict.value is: string & number = never
// A value of type never cannot exist — this type is impossible!
// This is a design error — you can't have value be both string and number

// FIX: Use union for the conflicting property
type Fixed = { value: string | number };

// Or make them separate properties
type Fixed2 = { stringValue: string; numberValue: number };


// ─── BUG 3: Missing discriminant field ───────────────

// BAD: no discriminant — hard to narrow
type Shape1 = { width: number; height: number } | { radius: number };

function area1(shape: Shape1): number {
  // How do you know which type? Check for a property:
  if ("radius" in shape) {
    return Math.PI * shape.radius ** 2;
  }
  return shape.width * shape.height;
}

// GOOD: add discriminant — clear and extensible
type Shape2 =
  | { kind: "rectangle"; width: number; height: number }
  | { kind: "circle"; radius: number }
  | { kind: "triangle"; base: number; height: number };

function area2(shape: Shape2): number {
  switch (shape.kind) {
    case "rectangle": return shape.width * shape.height;
    case "circle": return Math.PI * shape.radius ** 2;
    case "triangle": return 0.5 * shape.base * shape.height;
    // TypeScript errors if you add a new kind and forget to handle it
  }
}`,
    challenge: `// CHALLENGE: Model a complete order management system

// Using ONLY union and intersection types (no classes):

// 1. OrderStatus discriminated union:
//    - draft: no items required, has savedAt
//    - pending_payment: has items, total, paymentDeadline
//    - processing: has items, total, paymentId, estimatedShipDate
//    - shipped: above + trackingNumber, carrier, shippedAt
//    - delivered: above + deliveredAt, signedBy?
//    - cancelled: has reason, cancelledAt, refundStatus: "pending" | "processed" | "not_applicable"
//    - refunded: has refundId, refundedAmount, refundedAt

// 2. ProductAvailability union:
//    - in_stock: quantity, nextRestockDate?
//    - low_stock: quantity (< 10), urgentRestockDate
//    - out_of_stock: expectedReturnDate?, alternativeProductIds: string[]
//    - discontinued: replacementProductId?

// 3. Write a function: getOrderActionOptions(order: Order): string[]
//    Returns what actions are valid for the current status
//    - draft → ["submit", "delete"]
//    - pending_payment → ["pay", "cancel"]
//    - processing → ["cancel"] (if < 1 hour old) or []
//    - shipped → ["report_issue"]
//    - delivered → ["return", "review"]
//    - cancelled → ["reorder"]
//    - refunded → []
//    TypeScript should error if you add a new status and forget to handle it.`,
    summary: "Union (|) = value can be one of multiple types. Intersection (&) = value must satisfy all types. Discriminated unions make it safe and exhaustive. Narrowing techniques let TypeScript know which variant you're working with."
  },

  {
    id: 5,
    title: "Utility Types",
    tag: "TYPE TRANSFORMERS",
    color: "#4ade80",
    tldr: "Utility types are built-in TypeScript tools that transform existing types. Partial makes all properties optional. Required makes all required. Pick selects some properties. Omit removes some. Record creates key-value maps. They prevent duplication and keep derived types in sync with their source.",
    problem: `Without utility types, you repeat yourself constantly. You define a User type, then manually create a CreateUserDTO (same but without id/timestamps), a UpdateUserDTO (same but all optional), a PublicUser (same but without password). Every time User changes, you update 4 types. Utility types derive these automatically — one source of truth.`,
    analogy: `Think of BLUEPRINTS in architecture.

You have a MASTER BLUEPRINT of a building.
From that one blueprint, you can derive:

Partial blueprint: "everything is optional — use what you need"
Required blueprint: "everything MUST be present"
Pick: "just give me the plumbing plans from the full blueprint"
Omit: "full blueprint but remove the electrical plans"
Readonly: "this blueprint cannot be modified — archived copy"

If the master blueprint changes (add a new floor):
All derived blueprints AUTOMATICALLY reflect the change.
You don't update 4 separate files — just the master.

In code:
User is your master blueprint.
CreateUserInput = Omit<User, "id" | "createdAt"> — auto-derived.
UpdateUserInput = Partial<CreateUserInput> — auto-derived.
PublicUser = Omit<User, "password" | "internalNotes"> — auto-derived.
Change User → all derived types update automatically.`,
    deep: `BUILT-IN UTILITY TYPES:

Partial<T>
  Makes ALL properties of T optional.
  Use for: update DTOs, patch requests, partial config

Required<T>
  Makes ALL properties of T required (removes ?)
  Use for: enforcing complete objects before saving

Readonly<T>
  Makes ALL properties readonly (immutable)
  Use for: config objects, frozen state, constants

Pick<T, K>
  Creates type with ONLY the specified keys K from T
  Use for: DTOs with subset of properties, projection types

Omit<T, K>
  Creates type WITHOUT the specified keys K from T
  Use for: removing sensitive fields, removing auto-generated fields

Record<K, V>
  Creates object type with keys K and values V
  Use for: lookup maps, indexed collections, enum-like maps

Exclude<T, U>
  From union T, removes members assignable to U
  Use for: filtering union types

Extract<T, U>
  From union T, keeps ONLY members assignable to U
  Use for: extracting subset of union

NonNullable<T>
  Removes null and undefined from T
  Use for: after null checks, guaranteed values

ReturnType<T>
  Extracts the return type of function T
  Use for: typing results of existing functions

Parameters<T>
  Extracts parameter types of function T as tuple
  Use for: wrapping/decorating functions

Awaited<T>
  Unwraps Promise types recursively
  Use for: typing resolved values of async functions`,
    code: `// ─── PARTIAL: ALL OPTIONAL ───────────────────────────

type User = {
  id: string;
  name: string;
  email: string;
  password: string;
  role: "admin" | "viewer" | "editor";
  avatar?: string;
  createdAt: Date;
  updatedAt: Date;
};

// For PATCH endpoint — client can update any subset of fields
type UpdateUserInput = Partial<Pick<User, "name" | "email" | "avatar" | "role">>;
// { name?: string; email?: string; avatar?: string; role?: ... }

// Now PATCH /users/:id accepts any combination of those fields
async function updateUser(id: string, input: UpdateUserInput): Promise<User> {
  return db.users.update({ where: { id }, data: input });
}

// All valid:
updateUser("u_1", { name: "Rahul Kumar" });
updateUser("u_1", { email: "new@email.com", role: "admin" });
updateUser("u_1", { name: "X", email: "x@x.com", avatar: "/x.png" });


// ─── OMIT: REMOVE PROPERTIES ──────────────────────────

// For POST /users — no id, no timestamps (server generates these)
type CreateUserInput = Omit<User, "id" | "createdAt" | "updatedAt">;
// { name: string; email: string; password: string; role: ...; avatar?: string }

// For public API response — never expose password
type PublicUser = Omit<User, "password">;
// All User fields EXCEPT password

// For frontend display — remove backend-only fields
type UserProfile = Omit<User, "password" | "id"> & {
  displayName: string;  // computed field
  joinedYear: number;   // computed field
};


// ─── PICK: SELECT PROPERTIES ──────────────────────────

// Just the fields needed for a user list view
type UserListItem = Pick<User, "id" | "name" | "email" | "role">;

// Just the fields needed for avatar display
type UserAvatar = Pick<User, "id" | "name" | "avatar">;

// Auth-related fields only
type UserCredentials = Pick<User, "email" | "password">;


// ─── RECORD: KEY-VALUE MAPS ───────────────────────────

// Map role to permissions
const rolePermissions: Record<User["role"], string[]> = {
  admin: ["read", "write", "delete", "manage_users"],
  editor: ["read", "write"],
  viewer: ["read"],
};

// Map HTTP status code to error message
const httpErrors: Record<number, string> = {
  400: "Bad Request",
  401: "Unauthorized",
  403: "Forbidden",
  404: "Not Found",
  500: "Internal Server Error",
};

// Map country code to currency
type CountryCode = "IN" | "US" | "GB" | "DE" | "JP";
const currencyMap: Record<CountryCode, { symbol: string; code: string }> = {
  IN: { symbol: "₹", code: "INR" },
  US: { symbol: "$", code: "USD" },
  GB: { symbol: "£", code: "GBP" },
  DE: { symbol: "€", code: "EUR" },
  JP: { symbol: "¥", code: "JPY" },
};

// Cache with string keys
const userCache: Record<string, User> = {};


// ─── READONLY: IMMUTABLE TYPES ───────────────────────

// Configuration that must not be modified at runtime
const dbConfig: Readonly<{
  host: string;
  port: number;
  database: string;
  poolSize: number;
}> = {
  host: "localhost",
  port: 5432,
  database: "myapp",
  poolSize: 10,
};

// dbConfig.host = "other";  // Error: Cannot assign to 'host' — readonly

// Deep readonly (Readonly is shallow — nested objects can still be mutated)
type DeepReadonly<T> = {
  readonly [K in keyof T]: T[K] extends object ? DeepReadonly<T[K]> : T[K];
};

const appConfig: DeepReadonly<AppConfig> = loadConfig();
// appConfig.database.host = "x";  // Error — deep readonly


// ─── RETURNTYPES AND PARAMETERS ──────────────────────

// Extract return type of existing functions
async function loginUser(email: string, password: string): Promise<{
  user: User;
  token: string;
  expiresAt: Date;
}> {
  // implementation
}

type LoginResult = Awaited<ReturnType<typeof loginUser>>;
// { user: User; token: string; expiresAt: Date }
// Now use LoginResult elsewhere without repeating the type

type LoginParams = Parameters<typeof loginUser>;
// [email: string, password: string]


// ─── EXCLUDE AND EXTRACT ──────────────────────────────

type AllStatuses = "draft" | "pending" | "active" | "suspended" | "deleted";

// All statuses EXCEPT deleted (for UI display)
type VisibleStatuses = Exclude<AllStatuses, "deleted">;
// "draft" | "pending" | "active" | "suspended"

// Only the "danger" statuses
type DangerStatuses = Extract<AllStatuses, "suspended" | "deleted">;
// "suspended" | "deleted"

// Remove null/undefined from a type
type MaybeUser = User | null | undefined;
type DefiniteUser = NonNullable<MaybeUser>;
// User (null and undefined removed)


// ─── REAL WORLD: Complete DTO pipeline ────────────────

// Single source of truth
type Product = {
  id: string;
  name: string;
  description: string;
  price: number;
  costPrice: number;       // internal — never expose to customers
  stock: number;
  category: string;
  supplierId: string;      // internal
  sku: string;
  isActive: boolean;
  isFeatured: boolean;
  createdAt: Date;
  updatedAt: Date;
};

// Auto-derived types — update Product, these all update automatically

// POST /admin/products
type CreateProductInput = Omit<Product, "id" | "createdAt" | "updatedAt">;

// PATCH /admin/products/:id
type UpdateProductInput = Partial<Omit<Product, "id" | "createdAt" | "updatedAt">>;

// GET /products (public catalog)
type PublicProduct = Omit<Product, "costPrice" | "supplierId" | "sku">;

// GET /products (list view — fewer fields)
type ProductListItem = Pick<Product, "id" | "name" | "price" | "category" | "isFeatured" | "stock">;

// Inventory management view
type InventoryItem = Pick<Product, "id" | "name" | "sku" | "stock" | "supplierId" | "costPrice">;`,
    bugs: `// ─── BUG 1: Partial doesn't make nested objects partial ─

type Config = {
  database: {
    host: string;
    port: number;
  };
  redis: {
    url: string;
    ttl: number;
  };
};

type PartialConfig = Partial<Config>;
// { database?: { host: string; port: number }; redis?: { url: string; ttl: number } }
// The top-level is optional, BUT database and redis themselves are still fully required!

// BUG:
const config: PartialConfig = {
  database: { host: "localhost" }
  // Error: missing 'port' in database — nested is NOT partial!
};

// FIX: Deep partial (custom utility type)
type DeepPartial<T> = {
  [K in keyof T]?: T[K] extends object ? DeepPartial<T[K]> : T[K];
};

const config2: DeepPartial<Config> = {
  database: { host: "localhost" }  // ✓ port is now optional too
};


// ─── BUG 2: Omit with union types ────────────────────

type A = { id: string; name: string; aSpecific: string };
type B = { id: string; name: string; bSpecific: string };
type AorB = A | B;

// BUG: Omit on a union works differently than expected
type WithoutId = Omit<AorB, "id">;
// Result is: { name: string } — loses aSpecific and bSpecific!
// Omit on union only keeps common properties

// FIX: Use distributive conditional types
type DistributiveOmit<T, K extends keyof any> = T extends any ? Omit<T, K> : never;
type CorrectWithoutId = DistributiveOmit<AorB, "id">;
// { name: string; aSpecific: string } | { name: string; bSpecific: string }


// ─── BUG 3: Record with enum keys ────────────────────

enum OrderStatus { Draft, Pending, Complete, Cancelled }

// BUG: if you add a new enum value, TypeScript won't error
// until you explicitly use the Record with the enum as key type
const statusLabels = {
  [OrderStatus.Draft]: "Draft",
  [OrderStatus.Pending]: "Pending",
  // forgot Complete and Cancelled!
};

// FIX: Use Record to enforce all keys are present
const statusLabelsFixed: Record<OrderStatus, string> = {
  [OrderStatus.Draft]: "Draft",
  [OrderStatus.Pending]: "Pending",
  [OrderStatus.Complete]: "Complete",
  [OrderStatus.Cancelled]: "Cancelled",
  // If you add a new enum value, TypeScript errors here
};`,
    challenge: `// CHALLENGE: Build a complete API type system

// Given this master entity:
type Article = {
  id: string;
  slug: string;
  title: string;
  content: string;
  excerpt: string;
  coverImageUrl: string;
  authorId: string;
  categoryId: string;
  tags: string[];
  status: "draft" | "review" | "published" | "archived";
  isFeatured: boolean;
  viewCount: number;
  likeCount: number;
  publishedAt: Date | null;
  scheduledFor: Date | null;
  seoTitle: string;
  seoDescription: string;
  internalNotes: string;   // never expose to public
  editHistory: { userId: string; editedAt: Date; summary: string }[];
  createdAt: Date;
  updatedAt: Date;
};

// Derive ALL of these using ONLY utility types (no manual repetition):

// 1. CreateArticleInput — for POST /admin/articles
//    (no id, viewCount, likeCount, publishedAt, createdAt, updatedAt — server manages these)

// 2. UpdateArticleInput — for PATCH /admin/articles/:id
//    (all of CreateArticleInput but optional)

// 3. PublishArticleInput — for POST /admin/articles/:id/publish
//    (only scheduledFor as optional, nothing else)

// 4. PublicArticle — for GET /articles/:slug (public)
//    (no internalNotes, editHistory, seoTitle, seoDescription, scheduledFor)

// 5. ArticleListItem — for GET /articles list
//    (only: id, slug, title, excerpt, coverImageUrl, authorId, tags, status, publishedAt, isFeatured)

// 6. ArticleStatusMap — Record type mapping each status to a display label + color
//    Must use Article["status"] as the key type (not a separate type)

// 7. Write a function transformToPublic(article: Article): PublicArticle
//    that uses destructuring + rest to remove internal fields`,
    summary: "Utility types transform existing types. Partial/Required/Readonly modify all properties. Pick/Omit select or remove properties. Record creates maps. ReturnType/Parameters extract from functions. One source of truth, many derived types."
  },

  {
    id: 6,
    title: "Type Guards & Narrowing",
    tag: "RUNTIME SAFETY",
    color: "#fb923c",
    tldr: "TypeScript infers narrower types inside conditional blocks. Type guards are the conditions that trigger narrowing. Custom type guards (predicate functions) let you narrow to any type. This is the bridge between compile-time types and runtime reality.",
    problem: `Types exist only at compile time. At runtime, data comes from APIs, user inputs, databases — it could be anything. TypeScript cannot automatically verify runtime values. Type guards let you check at runtime, and TypeScript rewards you by narrowing the type inside that check block. Without type guards, you're constantly fighting TypeScript or using unsafe 'as' assertions.`,
    analogy: `Think of a SECURITY CHECKPOINT at an airport.

Everyone arrives as an unknown person (unknown type).
The checkpoint has different lanes:
- Passport check: "if this person has a valid passport → they are a citizen"
- Boarding pass check: "if this person has a boarding pass → they are a passenger"
- Staff badge check: "if this person has a staff badge → they are an employee"

After passing a checkpoint, you KNOW what type of person they are.
You grant them specific access based on that identity.

In code:
Data arrives from an API as 'unknown' or 'any'.
You run it through a type guard.
TypeScript now KNOWS the type inside that block.
You can safely access type-specific properties.

Without guards: TypeScript would let you access any property and crash at runtime.
With guards: TypeScript only allows you to access properties that definitely exist.`,
    deep: `NARROWING TECHNIQUES (TypeScript understands these):

1. typeof — primitive types
   typeof x === "string" → string
   typeof x === "number" → number
   typeof x === "boolean" → boolean
   typeof x === "function" → Function
   Note: typeof null === "object" — famous bug in JS

2. instanceof — class instances
   x instanceof Date → Date
   x instanceof Error → Error
   x instanceof Array → Array (though Array.isArray is preferred)

3. 'in' operator — property existence
   "id" in x → x has id property

4. equality narrowing — literal checks
   x === "admin" → literal "admin"
   x.status === "published" → narrows discriminated union

5. truthiness narrowing
   if (x) — narrows away null, undefined, 0, "", false

6. type predicates — custom type guards
   function isX(arg: unknown): arg is X { ... }
   After calling isX(value) inside if(), TypeScript knows value is X

7. assertion functions — throws if not the type
   function assertIsX(arg: unknown): asserts arg is X { ... }
   After calling assertIsX(value), TypeScript knows value is X everywhere after

UNKNOWN vs ANY:
  any: TypeScript gives up — no checking at all
  unknown: TypeScript is strict — must narrow before using
  
  Use unknown for data you don't know the type of (API responses, catch blocks).
  unknown forces you to type guard before using.
  any is an escape hatch that disables checking — avoid.`,
    code: `// ─── TYPEOF NARROWING ────────────────────────────────

type FlexibleId = string | number;

function formatId(id: FlexibleId): string {
  if (typeof id === "string") {
    return id.padStart(8, "0");  // TypeScript knows: string
  }
  return id.toString().padStart(8, "0"); // TypeScript knows: number
}

// Handling multiple primitives
function processInput(value: string | number | boolean | null | undefined): string {
  if (value === null || value === undefined) {
    return "empty";  // narrowed to null | undefined
  }
  if (typeof value === "boolean") {
    return value ? "yes" : "no";  // narrowed to boolean
  }
  if (typeof value === "number") {
    return value.toFixed(2);  // narrowed to number
  }
  return value.toUpperCase(); // narrowed to string — the only remaining type
}


// ─── INSTANCEOF NARROWING ─────────────────────────────

type AppError =
  | ValidationError
  | DatabaseError
  | NetworkError
  | AuthenticationError;

class ValidationError extends Error {
  constructor(public fields: { field: string; message: string }[]) {
    super("Validation failed");
    this.name = "ValidationError";
  }
}

class DatabaseError extends Error {
  constructor(public query: string, public code: string) {
    super("Database error");
    this.name = "DatabaseError";
  }
}

class NetworkError extends Error {
  constructor(public statusCode: number, public endpoint: string) {
    super("Network error");
    this.name = "NetworkError";
  }
}

function handleError(error: AppError): void {
  if (error instanceof ValidationError) {
    // TypeScript knows: ValidationError — has .fields
    error.fields.forEach(f => console.error(\`\${f.field}: \${f.message}\`));
    return;
  }
  if (error instanceof DatabaseError) {
    // TypeScript knows: DatabaseError — has .query, .code
    logToSentry("DB_ERROR", { query: error.query, code: error.code });
    return;
  }
  if (error instanceof NetworkError) {
    // TypeScript knows: NetworkError — has .statusCode, .endpoint
    if (error.statusCode === 401) {
      redirectToLogin();
    }
    return;
  }
}


// ─── CUSTOM TYPE GUARDS ───────────────────────────────

// Type predicate syntax: arg is Type
function isString(value: unknown): value is string {
  return typeof value === "string";
}

function isUser(value: unknown): value is User {
  return (
    typeof value === "object" &&
    value !== null &&
    "id" in value && typeof (value as any).id === "string" &&
    "name" in value && typeof (value as any).name === "string" &&
    "email" in value && typeof (value as any).email === "string"
  );
}

function isArrayOf<T>(value: unknown, guard: (item: unknown) => item is T): value is T[] {
  return Array.isArray(value) && value.every(guard);
}

// Usage
async function fetchAndValidateUser(id: string): Promise<User | null> {
  const res = await fetch(\`/api/users/\${id}\`);
  const data: unknown = await res.json();

  if (isUser(data)) {
    return data;  // TypeScript knows: User
  }

  console.error("Invalid user shape:", data);
  return null;
}

// Generic guard for arrays
async function fetchUsers(): Promise<User[]> {
  const data: unknown = await fetch("/api/users").then(r => r.json());

  if (isArrayOf(data, isUser)) {
    return data;  // TypeScript knows: User[]
  }
  return [];
}


// ─── ASSERTION FUNCTIONS ─────────────────────────────

// assertX(value) — if it doesn't throw, value IS the type
function assertIsString(value: unknown): asserts value is string {
  if (typeof value !== "string") {
    throw new TypeError(\`Expected string, got \${typeof value}\`);
  }
}

function assertIsDefined<T>(value: T | null | undefined): asserts value is T {
  if (value === null || value === undefined) {
    throw new Error("Value is null or undefined");
  }
}

// Usage — after assertion, TypeScript KNOWS the type without an if block
function processOrderId(rawId: unknown): string {
  assertIsString(rawId);
  // After this line, TypeScript knows rawId is string
  return rawId.padStart(8, "0").toUpperCase(); // safe — TypeScript knows it's string
}

// Extremely useful in test setup
function setupTest() {
  const user = getTestUser();
  assertIsDefined(user);
  // Everything after here: TypeScript knows user is NOT null/undefined
  expect(user.name).toBe("Rahul");
  expect(user.email).toContain("@");
}


// ─── UNKNOWN FOR SAFE UNKNOWNS ────────────────────────

// Error handling with unknown (TypeScript 4.0+)
async function riskyOperation(): Promise<void> {
  try {
    await fetch("/api/data");
  } catch (error: unknown) {
    // error is 'unknown' — must check before using
    if (error instanceof Error) {
      console.error("Error:", error.message);  // safe
      if (error instanceof NetworkError) {
        console.error("Status:", error.statusCode);  // safe
      }
    } else if (typeof error === "string") {
      console.error("String error:", error.toUpperCase());  // safe
    } else {
      console.error("Unknown error:", JSON.stringify(error));
    }
  }
}

// Parsing API responses safely
async function parseApiResponse<T>(
  response: Response,
  validate: (data: unknown) => data is T
): Promise<T> {
  const raw: unknown = await response.json();

  if (!validate(raw)) {
    throw new Error(\`API response shape mismatch: \${JSON.stringify(raw)}\`);
  }

  return raw; // TypeScript knows: T
}


// ─── ZOD INTEGRATION (runtime + compile-time) ─────────

// import { z } // (zod - install: npm i zod);  ← install: npm i zod

// Define schema — this IS your type guard AND your type
const UserSchema = z.object({
  id: z.string().uuid(),
  name: z.string().min(2).max(100),
  email: z.string().email(),
  role: z.enum(["admin", "viewer", "editor"]),
  balance: z.number().nonnegative(),
  createdAt: z.date(),
});

// Automatically derive TypeScript type from schema
type UserFromSchema = z.infer<typeof UserSchema>;

// Parse validates AND narrows — throws ZodError if invalid
async function fetchUser(id: string): Promise<UserFromSchema> {
  const data = await fetch(\`/api/users/\${id}\`).then(r => r.json());
  return UserSchema.parse(data);  // throws if shape doesn't match
  // Returns: UserFromSchema — fully typed, runtime-validated
}

// Safe parse — returns { success, data } or { success, error }
const result = UserSchema.safeParse(untrustedData);
if (result.success) {
  result.data; // TypeScript knows: UserFromSchema
} else {
  result.error.issues; // Zod error details
}`,
    bugs: `// ─── BUG 1: Using 'as' instead of type guard ─────────

// WRONG: as is an assertion — you're telling TypeScript to trust you
// If you're wrong, runtime errors
async function getUser(id: string) {
  const data = await fetch(\`/api/users/\${id}\`).then(r => r.json());
  return data as User;  // TypeScript trusts you — but API might return error shape
}

const user = await getUser("bad_id");
user.name.toUpperCase();  // Runtime: Cannot read properties of undefined

// RIGHT: validate with type guard or Zod
async function getUserSafe(id: string): Promise<User | null> {
  const data: unknown = await fetch(\`/api/users/\${id}\`).then(r => r.json());
  if (isUser(data)) return data;
  return null;
}


// ─── BUG 2: Type guard that doesn't actually guard ────

// BUG: This guard is wrong — always returns true!
function isBadUser(value: unknown): value is User {
  return typeof value === "object";  // null is also "object"!
}

// TypeScript trusts your guard — if your guard is wrong, types are wrong
// CORRECT: thorough validation
function isGoodUser(value: unknown): value is User {
  return (
    typeof value === "object" &&
    value !== null &&                              // not null
    !Array.isArray(value) &&                       // not an array
    typeof (value as any).id === "string" &&       // has id: string
    typeof (value as any).name === "string" &&     // has name: string
    typeof (value as any).email === "string"       // has email: string
  );
}


// ─── BUG 3: Narrowing doesn't survive callbacks ───────

function processUser(user: User | null) {
  if (!user) return;

  // user is narrowed to User here
  setTimeout(function() {
    // BUG: TypeScript might warn — user could be reassigned between now and callback
    console.log(user.name);  // usually fine for const, but be aware
  }, 0);

  // FIX: Destructure before the callback to capture the value
  const { name } = user;  // captured value — definitely string
  setTimeout(() => console.log(name), 0);
}`,
    challenge: `// CHALLENGE: Build a safe data parser

// You're receiving data from multiple external sources.
// Build a complete type-safe parsing system.

// 1. Create type guards for these types:
//    - isDate(value: unknown): value is Date
//    - isPositiveNumber(value: unknown): value is number
//    - isNonEmptyString(value: unknown): value is string
//    - isOrderStatus(value: unknown): value is OrderStatus

// 2. Create a parseOrder(raw: unknown): Order function
//    that validates ALL fields of an order before returning it.
//    If ANY field is invalid, throw a descriptive error
//    saying which field failed and why.

// 3. Create a parseOrderArray(raw: unknown): Order[]
//    that validates an array of orders.
//    Collect ALL errors (not just the first) before throwing.

// 4. Create a createSafeParser<T>(guard: (v: unknown) => v is T)
//    Returns an object with:
//    - parse(data: unknown): T — throws on failure
//    - safeParse(data: unknown): { success: true; data: T } | { success: false; error: string }
//    - parseArray(data: unknown): T[] — validates each item

// Type Order for reference:
type Order = {
  id: string;
  userId: string;
  items: Array<{ productId: string; qty: number; price: number }>;
  total: number;
  status: "pending" | "processing" | "delivered" | "cancelled";
  createdAt: Date;
};`,
    summary: "Type guards narrow TypeScript's view of a type inside a conditional block. typeof, instanceof, in, equality, and custom predicates are all guards. unknown forces you to guard before using. Combine with Zod for runtime + compile-time safety."
  },

  {
    id: 7,
    title: "keyof, typeof, Mapped Types",
    tag: "TYPE METAPROGRAMMING",
    color: "#a78bfa",
    tldr: "keyof extracts all keys of a type as a union. typeof gets the TypeScript type of a value. Mapped types iterate over keys to create new types. Together they let you write types that automatically stay in sync with other types — true metaprogramming.",
    problem: `There are patterns where you need to create types derived from the STRUCTURE of other types, not just their values. A function that accepts any key of an object and returns the right value type. An object where every key corresponds to a function that processes that key's value. A type that transforms every property in a certain way. Without keyof, typeof, and mapped types, these require constant manual updating or fall back to unsafe 'any'.`,
    analogy: `keyof is like asking "What are ALL the column names in this spreadsheet?"
  type Keys = keyof User → "id" | "name" | "email" | "role" | ...
  You get all the keys as a union — dynamically, from the type.

typeof is like asking "What's the TYPE of this variable?"
  const config = { host: "localhost", port: 3000 }
  type Config = typeof config → { host: string; port: number }
  You derive the type FROM an existing value.

Mapped types are like applying a formula to every column:
  "Make every column in this spreadsheet optional"
  "Make every column in this spreadsheet readonly"
  "Turn every column into a validation function for that column's type"

Combined: they let you write self-maintaining types.
Change the shape of User — your accessor function, validator object,
and display form all update automatically.`,
    deep: `KEYOF DETAILS:
  keyof T returns a union of string literal types (the keys)
  For: type User = { id: string; name: string }
  keyof User = "id" | "name"
  
  On index signature types:
  keyof { [key: string]: number } = string | number (JS object keys)
  keyof { [key: number]: string } = number

TYPEOF DETAILS:
  typeof variable — gets the TypeScript type of that variable
  ReturnType<typeof fn> — gets the return type of a function
  typeof Class — gets the constructor type (not instance type)
  
  Very useful for: runtime objects that you want types for
  Enum-like const objects, configuration objects, factory registries

MAPPED TYPE SYNTAX:
  { [K in keyof T]: ... }
  K iterates over all keys of T
  You can: change value types, add/remove modifiers

MODIFIERS IN MAPPED TYPES:
  +readonly (or just readonly) — add readonly
  -readonly — remove readonly
  +? (or just ?) — make optional
  -? — make required (remove optional)

KEY REMAPPING (TS 4.1+):
  { [K in keyof T as NewKeyName]: ... }
  Lets you rename keys in a mapped type
  
CONDITIONAL TYPES IN MAPPED:
  { [K in keyof T]: T[K] extends string ? "text" : "other" }
  Different output type based on each property's type`,
    code: `// ─── KEYOF: SAFE PROPERTY ACCESSOR ──────────────────

type User = {
  id: string;
  name: string;
  email: string;
  balance: number;
  role: "admin" | "viewer";
  createdAt: Date;
};

// Without keyof — any key is accepted, return type is 'any'
function getBadProp(obj: any, key: string): any {
  return obj[key]; // no type safety
}

// With keyof — only valid keys accepted, return type is correct
function getProp<T, K extends keyof T>(obj: T, key: K): T[K] {
  return obj[key];
}

const user: User = { id: "u1", name: "Rahul", email: "r@r.com", balance: 5000, role: "admin", createdAt: new Date() };

const name = getProp(user, "name");       // TypeScript knows: string
const balance = getProp(user, "balance"); // TypeScript knows: number
const created = getProp(user, "createdAt"); // TypeScript knows: Date

// getProp(user, "password");  // Error: "password" is not keyof User


// ─── TYPEOF: DERIVE TYPE FROM VALUE ──────────────────

// Enum-like constant object — common pattern in TypeScript
const OrderStatus = {
  DRAFT: "draft",
  PENDING: "pending",
  PROCESSING: "processing",
  SHIPPED: "shipped",
  DELIVERED: "delivered",
  CANCELLED: "cancelled",
} as const;  // as const: makes values literal types, not just string

// Derive the union type FROM the object — automatically stays in sync
type OrderStatusType = (typeof OrderStatus)[keyof typeof OrderStatus];
// "draft" | "pending" | "processing" | "shipped" | "delivered" | "cancelled"

// Now if you add RETURNED to OrderStatus, the type updates automatically

// Same pattern for HTTP methods, currencies, countries, etc.
const HttpMethod = {
  GET: "GET", POST: "POST", PUT: "PUT", PATCH: "PATCH", DELETE: "DELETE"
} as const;
type HttpMethodType = (typeof HttpMethod)[keyof typeof HttpMethod];


// ─── MAPPED TYPES: TRANSFORM EVERY PROPERTY ───────────

// Custom Partial (Partial<T> is implemented exactly like this)
type MyPartial<T> = {
  [K in keyof T]?: T[K];
};

// Custom Required
type MyRequired<T> = {
  [K in keyof T]-?: T[K];  // -? removes optional modifier
};

// Custom Readonly
type MyReadonly<T> = {
  readonly [K in keyof T]: T[K];
};

// Mutable — remove readonly from all properties
type Mutable<T> = {
  -readonly [K in keyof T]: T[K];
};


// ─── REAL WORLD: Form field definitions ──────────────

type UserForm = {
  name: string;
  email: string;
  password: string;
  role: "admin" | "viewer";
  age: number;
};

// Automatically create form validation type
// Every field maps to a validation function for that field's type
type FormValidators<T> = {
  [K in keyof T]?: (value: T[K]) => string | null;
};

const userValidators: FormValidators<UserForm> = {
  name: (name) => name.length < 2 ? "Too short" : null,
  email: (email) => !email.includes("@") ? "Invalid email" : null,
  password: (password) => password.length < 8 ? "Too short" : null,
  age: (age) => age < 18 ? "Must be 18+" : null,
  // TypeScript ensures each validator receives the correct type for that field
  // name validator: (name: string) => ...
  // age validator: (age: number) => ...
};


// ─── MAPPED TYPE WITH CONDITIONAL TYPES ──────────────

// Create a type where string properties become "text" input
// and number properties become "number" input
type FormInputTypes<T> = {
  [K in keyof T]: T[K] extends string
    ? { type: "text"; placeholder: string }
    : T[K] extends number
    ? { type: "number"; min?: number; max?: number }
    : T[K] extends boolean
    ? { type: "checkbox" }
    : { type: "text" };
};

type ProductFormConfig = FormInputTypes<{
  name: string;
  price: number;
  stock: number;
  isActive: boolean;
}>;

// ProductFormConfig is:
// {
//   name: { type: "text"; placeholder: string };
//   price: { type: "number"; min?: number; max?: number };
//   stock: { type: "number"; min?: number; max?: number };
//   isActive: { type: "checkbox" };
// }


// ─── KEY REMAPPING ────────────────────────────────────

// Create getter method names from property names
// name → getName, email → getEmail, etc.
type Getters<T> = {
  [K in keyof T as \`get\${Capitalize<string & K>}\`]: () => T[K];
};

type UserGetters = Getters<{ name: string; email: string; balance: number }>;
// {
//   getName: () => string;
//   getEmail: () => string;
//   getBalance: () => number;
// }

// Event handlers: property → onChange handler
type ChangeHandlers<T> = {
  [K in keyof T as \`on\${Capitalize<string & K>}Change\`]: (value: T[K]) => void;
};

type FormHandlers = ChangeHandlers<UserForm>;
// {
//   onNameChange: (value: string) => void;
//   onEmailChange: (value: string) => void;
//   onPasswordChange: (value: string) => void;
//   onRoleChange: (value: "admin" | "viewer") => void;
//   onAgeChange: (value: number) => void;
// }


// ─── REAL WORLD: API endpoint registry ───────────────

// Define all endpoints in one place
const apiEndpoints = {
  getUser: "/api/users/:id",
  createUser: "/api/users",
  updateUser: "/api/users/:id",
  deleteUser: "/api/users/:id",
  listProducts: "/api/products",
  getProduct: "/api/products/:id",
} as const;

// Derive endpoint names as a type
type EndpointName = keyof typeof apiEndpoints;
// "getUser" | "createUser" | "updateUser" | "deleteUser" | "listProducts" | "getProduct"

// Type-safe endpoint caller
function callEndpoint(name: EndpointName, params?: Record<string, string>) {
  let url = apiEndpoints[name] as string;
  if (params) {
    Object.entries(params).forEach(([key, value]) => {
      url = url.replace(\`:\${key}\`, value);
    });
  }
  return fetch(url);
}

callEndpoint("getUser", { id: "u_123" });    // ✓
// callEndpoint("badEndpoint");              // Error: not a valid endpoint name`,
    bugs: `// ─── BUG 1: keyof on union type ─────────────────────

type A = { id: string; name: string; aField: string };
type B = { id: string; name: string; bField: string };

type AorB = A | B;
type KeysOfUnion = keyof AorB;  // "id" | "name" — only COMMON keys!
// aField and bField are NOT in keyof AorB

// Why? Because a value of AorB might be A (which doesn't have bField)
// or B (which doesn't have aField). TypeScript only guarantees common keys.

// If you want keys of EITHER:
type AllKeys = keyof A | keyof B;  // "id" | "name" | "aField" | "bField"


// ─── BUG 2: typeof on a type (not a value) ───────────

type User = { id: string; name: string };  // this is a TYPE

// WRONG: typeof on a type doesn't make sense
// type T = typeof User;  // Error: 'User' refers to a type but used as a value

// typeof works on VALUES (variables, constants, functions)
const user = { id: "u1", name: "Rahul" };
type UserType = typeof user;  // ✓ { id: string; name: string }

function getUser() { return { id: "u1", name: "Rahul", role: "admin" }; }
type GetUserReturn = ReturnType<typeof getUser>;  // ✓


// ─── BUG 3: Mapped type loses optional modifier ───────

type Original = { name: string; nickname?: string };

// WRONG: this mapped type makes everything required
type WrongMapped<T> = {
  [K in keyof T]: T[K] | undefined;  // adds | undefined but removes ?
};

// The difference: optional (?) means the key can be ABSENT
// | undefined means the key must EXIST but can be undefined

// RIGHT: preserve optionality
type CorrectMapped<T> = {
  [K in keyof T]: T[K];  // preserves ? from original
};`,
    challenge: `// CHALLENGE: Build a type-safe event system

// 1. Define event payload types:
type AppEvents = {
  userCreated: { userId: string; name: string; email: string };
  userDeleted: { userId: string; reason: string };
  orderPlaced: { orderId: string; userId: string; total: number; items: number };
  orderCancelled: { orderId: string; reason: string; refundAmount: number };
  paymentFailed: { userId: string; amount: number; errorCode: string };
  paymentSucceeded: { transactionId: string; userId: string; amount: number };
};

// 2. Using keyof and mapped types, create:
//    EventHandler<E extends keyof AppEvents> — type of a function that handles event E
//    EventHandlerMap — an object where each key is an event name and value is its handler
//      (make all handlers optional — you don't have to listen to all events)

// 3. Create an EventEmitter class that:
//    - on<E extends keyof AppEvents>(event: E, handler: EventHandler<E>): void
//    - off<E extends keyof AppEvents>(event: E, handler: EventHandler<E>): void
//    - emit<E extends keyof AppEvents>(event: E, payload: AppEvents[E]): void
//    TypeScript must ensure:
//    - You can only emit valid event names
//    - The payload must match the event's defined type
//    - Handlers receive the correctly typed payload

// 4. Create a createTypedEmitter() function that returns the above
//    and show example usage with all type inference working.`,
    summary: "keyof extracts keys as a union. typeof derives type from a value. Mapped types iterate over keys to transform types. Together they enable metaprogramming — types that automatically stay in sync with other types."
  },

  {
    id: 8,
    title: "Conditional Types",
    tag: "TYPE LOGIC",
    color: "#f43f5e",
    tldr: "Conditional types are if/else for the type system. T extends U ? X : Y means: if T is assignable to U, use type X, otherwise use type Y. Combined with infer, they let you extract types from other types. This is how TypeScript's advanced built-in utility types are implemented.",
    problem: `Some type relationships can't be expressed with just unions, intersections, or mapped types. Sometimes you need a type that DEPENDS on another type. "If this function is async, give me the resolved type. If it's sync, give me the return type directly." "If this property is an array, give me the element type." Conditional types make this possible.`,
    analogy: `Conditional types are TERNARY OPERATORS for types.

In code: value > 0 ? "positive" : "negative"
In types: T extends string ? "is a string" : "not a string"

Think of a CUSTOMS FORM:
"Is this item food? If YES → fill in food form. If NO → fill in goods form."
type CustomsForm<T> = T extends Food ? FoodDeclarationForm : GoodsDeclarationForm

Think of a BANK ACCOUNT UPGRADE:
"Is your balance > 100000? If YES → PremiumAccount. If NO → StandardAccount."
type AccountType<T extends number> = T extends PremiumThreshold ? PremiumAccount : StandardAccount

The infer keyword is like saying:
"Whatever type is HERE in this structure, capture it and name it X"
Type that extracts the Promise's value: T extends Promise<infer R> ? R : T
If T is Promise<User>, R is captured as User, result is User.
If T is not a Promise, result is T itself.`,
    deep: `CONDITIONAL TYPE SYNTAX:
  T extends U ? X : Y
  
  Read as: "if T is assignable to U, the type is X, otherwise Y"

DISTRIBUTIVE CONDITIONAL TYPES:
  When T is a naked type parameter (just T, not T[] or Promise<T>),
  conditional types distribute over unions:
  
  type ToArray<T> = T extends any ? T[] : never;
  ToArray<string | number> = string[] | number[]   (distributed)
  
  To prevent distribution: wrap T in a tuple
  type NoDistribute<T> = [T] extends [any] ? T[] : never;
  NoDistribute<string | number> = (string | number)[]   (not distributed)

INFER KEYWORD:
  Used within conditional types to CAPTURE a type
  T extends Array<infer E> → if T is an array, E is the element type
  T extends Promise<infer R> → if T is a promise, R is the resolved type
  T extends (arg: infer A) => any → if T is a function, A is the argument type
  T extends (...args: any) => infer R → R is the return type

BUILT-IN TYPES USING CONDITIONAL:
  type NonNullable<T> = T extends null | undefined ? never : T;
  type ReturnType<T> = T extends (...args: any) => infer R ? R : never;
  type Parameters<T> = T extends (...args: infer P) => any ? P : never;
  type Awaited<T> = T extends Promise<infer U> ? U : T;`,
    code: `// ─── BASIC CONDITIONAL TYPES ─────────────────────────

// Is T a string?
type IsString<T> = T extends string ? true : false;

type A = IsString<string>;    // true
type B = IsString<number>;    // false
type C = IsString<"hello">;   // true (literal is assignable to string)


// ─── REAL WORLD: TypeOrArray ─────────────────────────

// Accept single item OR array — always return array
type Arrayify<T> = T extends any[] ? T : T[];

function ensureArray<T>(value: T): Arrayify<T> {
  if (Array.isArray(value)) return value as Arrayify<T>;
  return [value] as Arrayify<T>;
}

// Usage:
ensureArray("hello");      // string[] ← wrapped
ensureArray([1, 2, 3]);    // number[] ← passed through


// ─── INFER: EXTRACT INNER TYPES ──────────────────────

// Extract element type from array
type ElementType<T> = T extends (infer E)[] ? E : never;

type A1 = ElementType<string[]>;           // string
type A2 = ElementType<number[]>;           // number
type A3 = ElementType<User[]>;             // User
type A4 = ElementType<string>;             // never (not an array)

// Extract resolved type from Promise
type Awaited2<T> = T extends Promise<infer R> ? Awaited2<R> : T;  // recursive!

type P1 = Awaited2<Promise<string>>;               // string
type P2 = Awaited2<Promise<Promise<User>>>;        // User (recursive unwrap)
type P3 = Awaited2<string>;                        // string (not a promise)

// Extract function return type
type ReturnType2<T> = T extends (...args: any[]) => infer R ? R : never;

function getUser(): User { return {} as User; }
type UserReturn = ReturnType2<typeof getUser>;  // User


// ─── DISTRIBUTIVE CONDITIONAL TYPES ──────────────────

// NonNullable — remove null and undefined from union
type MyNonNullable<T> = T extends null | undefined ? never : T;

type MaybeString = string | null | undefined;
type DefiniteString = MyNonNullable<MaybeString>;  // string

// How distribution works:
// MyNonNullable<string | null | undefined>
// = MyNonNullable<string> | MyNonNullable<null> | MyNonNullable<undefined>
// = string | never | never
// = string


// ─── REAL WORLD: API response typing ─────────────────

// If T is a function, get its return type (unwrapped if async)
// If T is not a function, use T as-is
type ResolvedReturn<T> = T extends (...args: any[]) => Promise<infer R>
  ? R
  : T extends (...args: any[]) => infer R
  ? R
  : T;

async function fetchOrder(id: string): Promise<Order> { return {} as Order; }
function getLocalUser(): User { return {} as User; }

type OrderResult = ResolvedReturn<typeof fetchOrder>;  // Order (Promise unwrapped)
type UserResult = ResolvedReturn<typeof getLocalUser>; // User (sync, no unwrap)


// ─── CONDITIONAL TYPES FOR API SDK ────────────────────

// A type-safe API SDK where the response type depends on the endpoint

type Endpoints = {
  "GET /users": { params: { page: number }; response: { users: User[]; total: number } };
  "GET /users/:id": { params: { id: string }; response: User };
  "POST /users": { params: CreateUserInput; response: User };
  "DELETE /users/:id": { params: { id: string }; response: { deleted: true } };
  "GET /orders": { params: { userId?: string }; response: Order[] };
};

type EndpointParams<E extends keyof Endpoints> = Endpoints[E]["params"];
type EndpointResponse<E extends keyof Endpoints> = Endpoints[E]["response"];

// Fully typed API caller
async function apiCall<E extends keyof Endpoints>(
  endpoint: E,
  params: EndpointParams<E>
): Promise<EndpointResponse<E>> {
  const [method, path] = (endpoint as string).split(" ");
  const response = await fetch(path, { method, body: JSON.stringify(params) });
  return response.json();
}

// TypeScript knows exact response types:
const users = await apiCall("GET /users", { page: 1 });
// users: { users: User[]; total: number }

const user = await apiCall("GET /users/:id", { id: "u_123" });
// user: User

const newUser = await apiCall("POST /users", { name: "Rahul", email: "r@r.com", password: "..." });
// newUser: User


// ─── DEEP TYPE UTILITIES ─────────────────────────────

// Flatten a nested type — make all properties at top level
type Flatten<T> = T extends Array<infer E> ? E : T;

type Nested = Array<Array<string>>;
type Flat = Flatten<Flatten<Nested>>;  // string

// If T is an object, extract all string-type property values
type StringValues<T> = {
  [K in keyof T]: T[K] extends string ? T[K] : never
}[keyof T];

type UserStrings = StringValues<User>;  // string | "admin" | "viewer" (all string values)`,
    bugs: `// ─── BUG 1: Forgetting distribution ─────────────────

type Wrap<T> = T extends any ? { value: T } : never;

type Result1 = Wrap<string | number>;
// { value: string } | { value: number }   ← distributed!

// If you WANT a single wrapper:
type WrapAll<T> = [T] extends [any] ? { value: T } : never;
type Result2 = WrapAll<string | number>;
// { value: string | number }   ← not distributed


// ─── BUG 2: infer in wrong position ──────────────────

// WRONG: infer must be in the extends clause
// type Bad<T> = infer T extends string ? T : never;  // syntax error

// RIGHT: infer is inside the extends type
type Good<T> = T extends Array<infer E> ? E : never;  // infer E is in extends position


// ─── BUG 3: Conditional types are deferred ───────────

// TypeScript sometimes can't resolve conditional types immediately
// when the type parameter is not yet known

function process<T>(value: T): T extends string ? string[] : number[] {
  if (typeof value === "string") {
    // TypeScript might not narrow here — it deferred evaluation
    // return value.split(","); // might error — T is still generic
    return value.split(",") as any; // need assertion in implementation
  }
  return [42] as any;
}

// This is a known limitation — conditional types in return positions
// often need the implementation to use type assertions`,
    challenge: `// CHALLENGE: Build advanced utility types

// 1. DeepRequired<T>
//    Like Required, but recursively makes ALL nested properties required
//    type Config = { db?: { host?: string; port?: number }; cache?: { ttl?: number } }
//    DeepRequired<Config> should have no optional properties at any level

// 2. DeepReadonly<T>
//    Like Readonly, but recursively makes ALL nested properties readonly

// 3. FunctionProperties<T>
//    Extracts only the function-type properties from an object type
//    type Mixed = { name: string; greet: () => void; age: number; process: (x: string) => number }
//    FunctionProperties<Mixed> should be: { greet: () => void; process: (x: string) => number }

// 4. NonFunctionProperties<T>
//    The inverse of FunctionProperties — only non-function properties

// 5. PromiseAllType<T extends readonly Promise<any>[]>
//    Given a tuple of Promise types, returns the tuple of their resolved values
//    type P = [Promise<string>, Promise<number>, Promise<User>]
//    PromiseAllType<P> should be: [string, number, User]
//    (This is what Promise.all's return type does)

// Test each one with at least 2 examples showing it works correctly.`,
    summary: "Conditional types are if/else for the type system: T extends U ? X : Y. The infer keyword captures type variables from patterns. Distributive conditional types automatically distribute over union members. Powers TypeScript's built-in utility types."
  },

  {
    id: 9,
    title: "Template Literal Types",
    tag: "STRING TYPE MAGIC",
    color: "#06b6d4",
    tldr: "Template literal types compose string literal types together — exactly like JavaScript template literals, but at the type level. They create precise string types and enable type-safe string pattern matching for things like event names, API routes, CSS property names, and more.",
    problem: `Before template literal types (TS 4.1), you couldn't type string patterns. You could say an event name is 'string' (too broad) or list every possible event name manually (tedious and error-prone). Now you can say: "an event name starts with 'on', followed by any property key of this object." Change the object, the valid event names update automatically.`,
    analogy: `Think of a NAMING CONVENTION ENFORCER.

Your company has rules:
- API routes: "/api/" + resource + "/" + id  (e.g., "/api/users/123")
- Event names: "on" + EventName (e.g., "onClick", "onChange")
- CSS variables: "--" + component + "-" + property (e.g., "--button-color")
- Database table names: "tbl_" + entity (e.g., "tbl_users")

Without template literal types: these are all just "string".
You can pass "/bad/route" and TypeScript won't complain.

With template literal types:
type ApiRoute = \`/api/\${string}/\${string}\`
type EventName = \`on\${Capitalize<string>}\`

Now TypeScript ENFORCES the pattern at compile time.
"/bad/route" — error. "onClick" — valid. "click" — error.`,
    deep: `SYNTAX:
  type T = \`prefix_\${OtherType}_suffix\`
  
  OtherType can be:
  - string, number, boolean (produces infinite set of strings)
  - Union types (produces union of all combinations)
  - Other template literals (composed)

STRING MANIPULATION INTRINSICS (built-in):
  Uppercase<S> — "hello" → "HELLO"
  Lowercase<S> — "HELLO" → "hello"
  Capitalize<S> — "hello" → "Hello"
  Uncapitalize<S> — "Hello" → "hello"

KEY POWER: combine with keyof and mapped types
  type EventName<T> = \`on\${Capitalize<string & keyof T>}\`
  Changes automatically when T changes

LIMITATION:
  TypeScript can represent template literal types conceptually,
  but very complex combinations can slow type checking.
  Keep patterns focused and specific.`,
    code: `// ─── BASIC TEMPLATE LITERAL TYPES ───────────────────

type EventName = \`on\${string}\`;
// Matches: "onClick", "onChange", "onSubmit", "onAnything..."

type ApiRoute = \`/api/\${string}\`;
// Matches: "/api/users", "/api/products", "/api/anything..."

type CssVar = \`--\${string}\`;
// Matches: "--primary-color", "--font-size", "--anything"

// With specific unions:
type Direction = "top" | "right" | "bottom" | "left";
type PaddingProp = \`padding-\${Direction}\`;
// "padding-top" | "padding-right" | "padding-bottom" | "padding-left"

type MarginProp = \`margin-\${Direction}\`;
// Same pattern — "margin-top" | "margin-right" etc.


// ─── REAL WORLD: Type-safe event system ──────────────

// Events in a product
type DomainEvents = {
  userCreated: { userId: string; email: string };
  userDeleted: { userId: string };
  orderPlaced: { orderId: string; total: number };
  orderCancelled: { orderId: string };
  paymentFailed: { userId: string; amount: number };
};

// Generate "on" + capitalized event name
type EventHandler<T extends keyof DomainEvents> =
  \`on\${Capitalize<T>}\`;

// All valid handler names — auto-generated from DomainEvents
type AllHandlers = EventHandler<keyof DomainEvents>;
// "onUserCreated" | "onUserDeleted" | "onOrderPlaced" | "onOrderCancelled" | "onPaymentFailed"

// Typed event handler map
type EventHandlerMap = {
  [K in keyof DomainEvents as \`on\${Capitalize<K>}\`]: (
    payload: DomainEvents[K]
  ) => void;
};

// EventHandlerMap is:
// {
//   onUserCreated: (payload: { userId: string; email: string }) => void;
//   onUserDeleted: (payload: { userId: string }) => void;
//   onOrderPlaced: (payload: { orderId: string; total: number }) => void;
//   ...
// }


// ─── API ROUTE TYPING ────────────────────────────────

type HttpMethod = "get" | "post" | "put" | "patch" | "delete";
type Resource = "users" | "products" | "orders" | "payments";

type ApiEndpoint = \`\${Uppercase<HttpMethod>} /api/\${Resource}\`;
// "GET /api/users" | "GET /api/products" | ... | "DELETE /api/payments"
// 5 × 4 = 20 combinations — all auto-generated

type CollectionEndpoint = \`\${Uppercase<HttpMethod>} /api/\${Resource}\`;
type ItemEndpoint = \`\${Uppercase<HttpMethod>} /api/\${Resource}/\${string}\`;


// ─── CSS-IN-TS TYPING ────────────────────────────────

type CSSProperty =
  | "color"
  | "background-color"
  | "font-size"
  | "padding"
  | "margin"
  | "border";

// Every breakpoint gets every property
type Breakpoint = "sm" | "md" | "lg" | "xl";
type ResponsiveProp = \`\${CSSProperty}@\${Breakpoint}\`;
// "color@sm" | "color@md" | ... | "border@xl"

// Tailwind-like class names
type ColorShade = 100 | 200 | 300 | 400 | 500 | 600 | 700 | 800 | 900;
type Color = "red" | "blue" | "green" | "yellow";
type TailwindColorClass = \`\${Color}-\${ColorShade}\`;
// "red-100" | "red-200" | ... | "yellow-900"


// ─── DATABASE QUERY TYPING ────────────────────────────

type Table = "users" | "products" | "orders" | "transactions";
type Ordering = "asc" | "desc";
type OrderByClause<T extends string> = \`\${T} \${Ordering}\`;

function buildQuery(
  table: Table,
  orderBy: OrderByClause<string>
): string {
  return \`SELECT * FROM \${table} ORDER BY \${orderBy}\`;
}

buildQuery("users", "name asc");      // ✓
buildQuery("orders", "createdAt desc"); // ✓
// buildQuery("admin", "id asc");      // Error: "admin" is not a Table


// ─── EXTRACTING PARTS WITH INFER ─────────────────────

// Extract the resource from an API route
type ExtractResource<T extends string> =
  T extends \`/api/\${infer R}\` ? R : never;

type UserResource = ExtractResource<"/api/users">;   // "users"
type OrderResource = ExtractResource<"/api/orders">; // "orders"
type Invalid = ExtractResource<"/bad/route">;        // never

// Extract event name from handler name
type ExtractEventName<T extends string> =
  T extends \`on\${infer E}\` ? Uncapitalize<E> : never;

type EventName1 = ExtractEventName<"onClick">;      // "click"
type EventName2 = ExtractEventName<"onChange">;     // "change"
type EventName3 = ExtractEventName<"badHandler">;   // never


// ─── REAL WORLD: i18n translation keys ───────────────

// Type-safe internationalization
type TranslationKeys = {
  "common.save": string;
  "common.cancel": string;
  "common.delete": string;
  "user.profile.title": string;
  "user.profile.edit": string;
  "order.status.pending": string;
  "order.status.delivered": string;
};

type TranslationKey = keyof TranslationKeys;

function t(key: TranslationKey): string {
  return translations[key] || key;
}

t("common.save");              // ✓
t("user.profile.title");       // ✓
// t("user.profile.invalid");  // Error: not a valid key

// Extract namespace
type ExtractNamespace<T extends string> =
  T extends \`\${infer NS}.\${string}\` ? NS : never;

type Namespaces = ExtractNamespace<TranslationKey>;
// "common" | "user" | "order"`,
    bugs: `// ─── BUG 1: Combinatorial explosion ─────────────────

// DANGEROUS: too many combinations can slow TypeScript to a crawl
type Color = "red" | "blue" | "green" | "yellow" | "purple" | "orange";
type Shade = 50 | 100 | 200 | 300 | 400 | 500 | 600 | 700 | 800 | 900 | 950;
type Variant = "solid" | "outline" | "ghost" | "link";

// 6 × 11 × 4 = 264 combinations — might be okay
type ButtonClass = \`btn-\${Color}-\${Shade}-\${Variant}\`;

// But if you add more:
// type Bad = \`\${A}-\${B}-\${C}-\${D}\` with 10 options each = 10,000 types
// TypeScript may refuse or hang. Keep combinations small.


// ─── BUG 2: Template literal with non-string types ───

type WithNumber = \`item-\${number}\`;  // valid — but matches ANY number
// "item-0" | "item-1" | ... | "item-Infinity" — infinite!

// For specific numbers, use literal union:
type ValidId = \`item-\${1 | 2 | 3 | 4 | 5}\`;
// "item-1" | "item-2" | "item-3" | "item-4" | "item-5"


// ─── BUG 3: Case sensitivity ──────────────────────────

type EventType = "click" | "change" | "submit";
// This won't work as expected:
type BadHandler = \`on\${EventType}\`;
// "onclick" | "onchange" | "onsubmit" — lowercase!

// Fix: use Capitalize
type GoodHandler = \`on\${Capitalize<EventType>}\`;
// "onClick" | "onChange" | "onSubmit" — correct!`,
    challenge: `// CHALLENGE: Build a type-safe router

// 1. Define a route system where:
//    Routes are strings like "/users", "/users/:id", "/users/:id/orders", "/orders/:id/items/:itemId"
//    Extract parameter names from route strings

//    type ExtractParams<T extends string> = ... (use infer to extract :paramName)
//    ExtractParams<"/users/:id"> should give: { id: string }
//    ExtractParams<"/users/:userId/orders/:orderId"> should give: { userId: string; orderId: string }
//    ExtractParams<"/users"> should give: {} (no params)

// 2. Create a typed router:
//    class Router<TRoutes extends Record<string, string>> where TRoutes maps route names to paths
//    router.navigate(name: keyof TRoutes, params: ExtractParams<TRoutes[keyof TRoutes]>)
//    TypeScript should enforce correct params for each route

// 3. Define these routes:
const routes = {
  home: "/",
  userList: "/users",
  userDetail: "/users/:userId",
  userOrders: "/users/:userId/orders",
  orderDetail: "/orders/:orderId",
  orderItem: "/orders/:orderId/items/:itemId",
} as const;

// Expected: TypeScript knows these are valid:
// router.navigate("userDetail", { userId: "u_123" })
// router.navigate("orderItem", { orderId: "o_456", itemId: "i_789" })

// And these are errors:
// router.navigate("userDetail", { id: "u_123" })       // wrong param name
// router.navigate("orderDetail", { orderId: "o_1", extra: "x" })  // extra param`,
    summary: "Template literal types create string types from patterns. Combined with keyof and mapped types, they auto-generate all valid combinations. Use them for event names, API routes, CSS properties, i18n keys — any string with a predictable pattern."
  },

  {
    id: 10,
    title: "Declaration Files & Module Augmentation",
    tag: "THE ECOSYSTEM LAYER",
    color: "#fbbf24",
    tldr: "Declaration files (.d.ts) describe the types of existing JavaScript code without rewriting it. Module augmentation lets you add types to existing modules. These are how the TypeScript ecosystem works — @types packages, extending Express, adding properties to Window — all of this is declaration files.",
    problem: `Not all JavaScript code is written in TypeScript. Popular libraries like Lodash, Moment, Express were written in JS. TypeScript needs to know their types to provide autocomplete and type checking. Declaration files provide these types without rewriting the libraries. Module augmentation lets you add your custom types to existing modules — like adding 'user' to Express's Request object.`,
    analogy: `Think of a TRANSLATOR with ANNOTATIONS.

You have a French cookbook (JS library) — no English.
Instead of rewriting the whole cookbook in English (rewriting in TS),
a translator writes an ANNOTATION GUIDE (.d.ts file):
"Recipe 1 takes: flour (number), eggs (number), returns: Cake"
"Recipe 2 takes: name (string), returns: string"

The cookbook itself doesn't change.
You just have a reference guide that describes what each function takes and returns.

MODULE AUGMENTATION is like adding your own STICKY NOTES to that cookbook:
"Chapter 3: I added a note — this recipe also works with coconut milk."
You didn't rewrite the chapter — you added to it.

In Express:
The Express team's annotation guide says Request has: method, url, body, headers.
You add a sticky note: "In MY app, Request also has: user, requestId, startTime."
Now TypeScript knows about YOUR custom additions.`,
    deep: `DECLARATION FILE BASICS:
  .d.ts files contain ONLY type information — no runtime code
  declare keyword: "I'm declaring that this exists in runtime JS"
  declare const, declare function, declare class, declare module

THREE KINDS OF .d.ts FILES:
  1. Library declarations — for external JS libraries (@types/lodash)
  2. Ambient declarations — for globals (window, process, env vars)
  3. Module augmentations — adding to existing modules

@types PACKAGES:
  npm install @types/your-framework @types/node @types/lodash
  These are .d.ts files published to npm for popular JS libraries
  DefinitelyTyped is the GitHub repo with 8000+ type packages

DECLARATION MERGING:
  interface, namespace, and module declarations with same name merge
  This is what makes augmentation possible
  class declarations do NOT merge

AMBIENT MODULES:
  // (module declaration) { ... }
  Describes the shape of an entire JS module
  Used when there are no @types for a library

TRIPLE-SLASH DIRECTIVES:
  /// <reference types="..." />
  Old way to include type declarations — mostly replaced by tsconfig
  Still used in .d.ts files themselves`,
    code: `// ─── BASIC DECLARATION FILE ──────────────────────────

// payment-gateway.d.ts — typing a JS payment library

// (module declaration) {
  interface PaymentSDKOptions {
    key: string;
    amount: number;
    currency: string;
    name: string;
    description?: string;
    order_id?: string;
    prefill?: {
      name?: string;
      email?: string;
      contact?: string;
    };
    theme?: {
      color?: string;
    };
    handler: (response: PaymentSDKResponse) => void;
    modal?: {
      ondismiss?: () => void;
    };
  }

  interface PaymentSDKResponse {
    gateway_payment_id: string;
    gateway_order_id: string;
    gateway_signature: string;
  }

  class PaymentSDK {
    constructor(options: PaymentSDKOptions);
    open(): void;
    on(event: "payment.failed", handler: (response: { error: PaymentSDKError }) => void): void;
  }

  interface PaymentSDKError {
    code: string;
    description: string;
    source: string;
    step: string;
    reason: string;
  }

  export = PaymentSDK;
}

// Now you can use it:
// import PaymentSDK // (payment SDK); ← JS library being typed
const rzp = new PaymentSDK({ key: "rzp_key", amount: 50000, ... });


// ─── GLOBAL DECLARATIONS ──────────────────────────────

// globals.d.ts — declare things available globally in your app

declare global {
  // Extend the Window object
  interface Window {
    analytics: {
      track: (event: string, properties?: Record<string, unknown>) => void;
      identify: (userId: string, traits?: Record<string, unknown>) => void;
      page: (name?: string, properties?: Record<string, unknown>) => void;
    };
    __APP_CONFIG__: {
      apiUrl: string;
      version: string;
      featureFlags: Record<string, boolean>;
    };
  }

  // Add global types available everywhere without import
  type Nullable<T> = T | null;
  type Optional<T> = T | undefined;
  type Maybe<T> = T | null | undefined;

  // Global constants set by webpack/vite
  const __DEV__: boolean;
  const __VERSION__: string;
  const __BUILD_DATE__: string;
}

// Now window.analytics, window.__APP_CONFIG__ are typed everywhere


// ─── MODULE AUGMENTATION: EXTENDING EXPRESS ───────────

// express-augment.d.ts
    // (in a real .d.ts file: import the library first to enable augmentation)

// (module declaration) {
  interface Request {
    // Added by your auth middleware
    user?: {
      id: string;
      email: string;
      role: "admin" | "viewer" | "editor";
      sessionId: string;
    };

    // Added by your request ID middleware
    requestId: string;
    startTime: number;

    // Added by your tenant middleware (multi-tenant SaaS)
    tenantId: string;
    tenantPlan: "free" | "pro" | "enterprise";
  }

  interface Response {
    // Added by your response helper middleware
    success: <T>(data: T, statusCode?: number) => Response;
    error: (message: string, statusCode?: number) => Response;
    paginated: <T>(items: T[], total: number, page: number) => Response;
  }
}

// Now in ANY Express handler:
app.get("/dashboard", (req, res) => {
  const userId = req.user?.id;           // TypeScript knows this exists
  const requestId = req.requestId;       // TypeScript knows this exists
  const plan = req.tenantPlan;           // TypeScript knows this exists

  res.success({ dashboard: "data" });    // TypeScript knows this exists
  res.paginated(items, 100, 1);          // TypeScript knows this exists
});


// ─── MODULE AUGMENTATION: EXTENDING LIBRARIES ─────────

// Adding methods to an existing class via declaration merging
// (the actual implementation comes from a separate mixin/plugin)

// prisma-augment.d.ts
    // (in a real .d.ts file: import the db library to enable augmentation)

// (module declaration) {
  interface PrismaClient {
    // Add a custom method (implemented separately)
    withTransaction<T>(fn: (tx: PrismaClient) => Promise<T>): Promise<T>;
    healthCheck(): Promise<{ status: "ok" | "error"; latencyMs: number }>;
  }
}


// ─── ENVIRONMENT VARIABLES TYPING ────────────────────

// env.d.ts — make process.env typed
declare global {
  namespace NodeJS {
    interface ProcessEnv {
      NODE_ENV: "development" | "production" | "test";
      PORT: string;
      DATABASE_URL: string;
      REDIS_URL: string;
      JWT_SECRET: string;
      RAZORPAY_KEY_ID: string;
      RAZORPAY_KEY_SECRET: string;
      SENDGRID_API_KEY: string;
      AWS_ACCESS_KEY_ID?: string;
      AWS_SECRET_ACCESS_KEY?: string;
      AWS_REGION?: string;
    }
  }
}

// Now process.env is typed:
const port = parseInt(process.env.PORT);      // TypeScript knows PORT is string
const dbUrl = process.env.DATABASE_URL;       // TypeScript knows DATABASE_URL is string
// const bad = process.env.UNKNOWN_VAR;       // Error: not in ProcessEnv


// ─── WRITING YOUR OWN @types ─────────────────────────

// When a JS library has no @types package:
// Create a declaration file in your project

// src/types/analytics-sdk.d.ts
// (module declaration) {
  interface TrackEvent {
    name: string;
    userId?: string;
    properties?: Record<string, string | number | boolean>;
    timestamp?: Date;
  }

  interface IdentifyUser {
    userId: string;
    traits: {
      name?: string;
      email?: string;
      plan?: string;
      [key: string]: unknown;
    };
  }

  function track(event: TrackEvent): void;
  function identify(user: IdentifyUser): void;
  function page(name: string, properties?: Record<string, unknown>): void;
  function reset(): void;
}

// tsconfig.json: include "src/types/**/*.d.ts" in typeRoots`,
    bugs: `// ─── BUG 1: Forgetting to import in augmentation ─────

// WRONG: This creates a NEW module declaration, doesn't augment Express
// (module declaration) {
  interface Request {
    user?: AuthUser;
  }
}

// RIGHT: Must import something from the module first
// import { Request } // (express); ← triggers module mode for augmentation
// (module declaration) {  // augment the right internal module
  interface Request {
    user?: AuthUser;
  }
}


// ─── BUG 2: Declaration files with implementation code ─

// WRONG: .d.ts files cannot have implementation
// payment.d.ts:
// export function processPayment(amount: number): Promise<void> {
//   // actual code here — ERROR in .d.ts
// }

// RIGHT: .d.ts only has declarations
// payment.d.ts:
declare function processPayment(amount: number): Promise<void>;
export { processPayment };

// Actual implementation is in payment.js (not TypeScript)


// ─── BUG 3: Augmenting wrong module name ─────────────

// Express internals are in "framework-core"
// NOT in "express" directly for Request/Response augmentation

// WRONG:
// (module declaration) {
  interface Request { user?: User }  // might not work as expected
}

// RIGHT:
// (module declaration) {
  interface Request { user?: User }  // correct module for Request augmentation
}`,
    challenge: `// CHALLENGE: Write complete declarations for a fictional SDK

// You're using a JS analytics SDK called "datatrack-sdk" that has no TypeScript support.
// Write the complete .d.ts file for it based on this documentation:

// datatrack-sdk documentation:
// 
// initialize(config: object): void
//   config: { apiKey: string, appName: string, debug?: boolean, endpoint?: string }
//
// track(eventName: string, properties?: object, options?: object): void
//   properties: any key-value pairs (string, number, boolean values only)
//   options: { userId?: string, timestamp?: Date, sessionId?: string }
//
// identify(userId: string, traits?: object): void
//   traits: { name?, email?, plan?, customProps?: any key-value pairs }
//
// group(groupId: string, traits?: object): void
//
// page(category?: string, name?: string, properties?: object): void
//
// reset(): void  — clears user identity
//
// getSessionId(): string
//
// EventEmitter methods: on(event, callback), off(event, callback)
//   Events: "initialized", "tracked", "error"
//   "error" callback receives: Error object
//   "tracked" callback receives: { eventName: string, timestamp: Date }
//   "initialized" callback receives: { appName: string }
//
// Also augment the Window interface to include:
// window.datatrack — the SDK instance
// And add a global type: DatatrackConfig (for the initialize config)`,
    summary: "Declaration files (.d.ts) describe JavaScript code's types. @types packages are community declaration files. Module augmentation adds your custom types to existing modules. Use globals.d.ts for window/process/environment types."
  }
];

function CodeBlock({ code }) {
  const [copied, setCopied] = useState(false);
  const copy = () => {
    navigator.clipboard.writeText(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };
  return (
    <div style={{ position: "relative", marginBottom: "20px" }}>
      <button onClick={copy} style={{
        position: "absolute", top: "10px", right: "10px", zIndex: 1,
        background: copied ? "#00ff9d18" : "#ffffff0a",
        border: `1px solid ${copied ? "#00ff9d44" : "#2a2a2a"}`,
        color: copied ? "#00ff9d" : "#555",
        padding: "4px 10px", borderRadius: "4px",
        fontSize: "10px", cursor: "pointer", letterSpacing: "1px",
        fontFamily: "monospace"
      }}>
        {copied ? "COPIED" : "COPY"}
      </button>
      <pre style={{
        background: "#0c0c0c",
        border: "1px solid #1e1e1e",
        borderRadius: "10px",
        padding: "20px",
        overflowX: "auto",
        fontSize: "11.5px",
        lineHeight: "1.85",
        color: "#c9d1d9",
        fontFamily: "'JetBrains Mono', 'Fira Code', monospace",
        margin: 0,
        whiteSpace: "pre-wrap",
        wordBreak: "break-word"
      }}>
        <code>{code}</code>
      </pre>
    </div>
  );
}

function Pill({ label, color }) {
  return (
    <span style={{
      fontSize: "9px", letterSpacing: "2px", textTransform: "uppercase",
      color: color, background: color + "15",
      border: `1px solid ${color}33`,
      padding: "3px 8px", borderRadius: "3px",
      fontFamily: "monospace"
    }}>
      {label}
    </span>
  );
}

export default function Phase2Guide() {
  const [selected, setSelected] = useState(null);
  const [completed, setCompleted] = useState({});
  const [tab, setTab] = useState("why");
  const [sidebarOpen, setSidebarOpen] = useState(true);

  const concept = selected !== null ? concepts[selected] : null;
  const completedCount = Object.values(completed).filter(Boolean).length;
  const progress = Math.round((completedCount / concepts.length) * 100);

  const tabs = [
    { key: "why", label: "The WHY" },
    { key: "deep", label: "Deep Dive" },
    { key: "code", label: "Code" },
    { key: "bugs", label: "Bugs" },
    { key: "challenge", label: "Challenge" },
  ];

  return (
    <div style={{
      minHeight: "100vh",
      background: "#070710",
      color: "#e2e8f0",
      fontFamily: "'JetBrains Mono', 'Fira Code', 'Courier New', monospace",
      display: "flex",
      flexDirection: "column"
    }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=JetBrains+Mono:ital,wght@0,300;0,400;0,500;0,700;1,400&family=Bricolage+Grotesque:opsz,wght@12..96,700;12..96,800;12..96,900&display=swap');
        * { box-sizing: border-box; margin: 0; padding: 0; }
        ::-webkit-scrollbar { width: 3px; height: 3px; }
        ::-webkit-scrollbar-thumb { background: #1e1e2e; border-radius: 2px; }
        .concept-row:hover { background: rgba(255,255,255,0.04) !important; cursor: pointer; }
        .tab-btn:hover { opacity: 1 !important; }
        .nav-btn:hover { background: rgba(255,255,255,0.07) !important; }
        .mark-btn:hover { opacity: 0.85; }
      `}</style>

      {/* Header */}
      <div style={{
        padding: "18px 28px",
        borderBottom: "1px solid #12121f",
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center",
        gap: "16px",
        background: "#0a0a18",
        flexWrap: "wrap"
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: "16px" }}>
          <div style={{
            background: "#60a5fa18",
            border: "1px solid #60a5fa33",
            borderRadius: "8px",
            padding: "8px 14px",
            fontSize: "11px",
            color: "#60a5fa",
            letterSpacing: "2px",
            textTransform: "uppercase"
          }}>
            Phase 2 / 5
          </div>
          <div>
            <div style={{ fontSize: "9px", color: "#404060", letterSpacing: "2px", textTransform: "uppercase", marginBottom: "3px" }}>
              TypeScript Mastery
            </div>
            <h1 style={{
              fontFamily: "'Bricolage Grotesque', sans-serif",
              fontSize: "clamp(16px, 2.5vw, 22px)",
              fontWeight: 900,
              color: "#fff",
              letterSpacing: "-0.5px"
            }}>
              From Types to Type Metaprogramming
            </h1>
          </div>
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: "16px", flexWrap: "wrap" }}>
          {concept && (
            <div style={{ display: "flex", gap: "4px" }}>
              <button className="nav-btn" onClick={() => { setSelected(Math.max(0, selected - 1)); setTab("why"); }}
                style={{ background: "transparent", border: "1px solid #1e1e2e", color: "#505070", padding: "6px 14px", borderRadius: "6px", cursor: "pointer", fontSize: "12px" }}>
                ←
              </button>
              <button className="nav-btn" onClick={() => { setSelected(Math.min(concepts.length - 1, selected + 1)); setTab("why"); }}
                style={{ background: "transparent", border: "1px solid #1e1e2e", color: "#505070", padding: "6px 14px", borderRadius: "6px", cursor: "pointer", fontSize: "12px" }}>
                →
              </button>
            </div>
          )}
          <div>
            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "5px" }}>
              <span style={{ fontSize: "10px", color: "#404060" }}>{completedCount}/{concepts.length} done</span>
              <span style={{ fontSize: "10px", color: "#60a5fa" }}>{progress}%</span>
            </div>
            <div style={{ width: "120px", height: "3px", background: "#12121f", borderRadius: "2px" }}>
              <div style={{
                width: `${progress}%`, height: "100%",
                background: "linear-gradient(90deg, #60a5fa, #818cf8)",
                borderRadius: "2px", transition: "width 0.4s ease"
              }} />
            </div>
          </div>
        </div>
      </div>

      <div style={{ display: "flex", flex: 1, overflow: "hidden", minHeight: "calc(100vh - 72px)" }}>

        {/* Sidebar */}
        <div style={{
          width: "240px",
          minWidth: "240px",
          borderRight: "1px solid #12121f",
          overflowY: "auto",
          padding: "16px 12px",
          background: "#08080f"
        }}>
          {!concept && (
            <div style={{
              padding: "12px 14px 20px",
              fontSize: "11px",
              color: "#303050",
              lineHeight: "1.8",
              borderBottom: "1px solid #12121f",
              marginBottom: "12px"
            }}>
              10 TypeScript concepts. From why it exists to deep type metaprogramming. Same format: the why → deep dive → code → bugs → challenge.
            </div>
          )}
          {concepts.map((c, i) => {
            const done = completed[i];
            return (
              <div
                key={i}
                className="concept-row"
                onClick={() => { setSelected(i); setTab("why"); }}
                style={{
                  display: "flex",
                  alignItems: "flex-start",
                  gap: "10px",
                  padding: "11px 12px",
                  borderRadius: "8px",
                  background: selected === i ? "#14142a" : "transparent",
                  border: `1px solid ${selected === i ? c.color + "33" : "transparent"}`,
                  marginBottom: "3px",
                  transition: "all 0.15s"
                }}
              >
                <div style={{
                  width: "20px", height: "20px", minWidth: "20px",
                  borderRadius: "4px",
                  border: `1px solid ${done ? c.color : "#1e1e2e"}`,
                  background: done ? c.color + "20" : "transparent",
                  display: "flex", alignItems: "center", justifyContent: "center",
                  fontSize: done ? "10px" : "9px",
                  color: done ? c.color : "#303050",
                  fontWeight: 600
                }}>
                  {done ? "✓" : i + 1}
                </div>
                <div>
                  <div style={{
                    fontSize: "11px",
                    fontWeight: selected === i ? 500 : 400,
                    color: selected === i ? "#e2e8f0" : (done ? "#303050" : "#8892a4"),
                    textDecoration: done ? "line-through" : "none",
                    lineHeight: "1.4",
                    marginBottom: "3px"
                  }}>
                    {c.title}
                  </div>
                  <Pill label={c.tag} color={c.color} />
                </div>
              </div>
            );
          })}
        </div>

        {/* Content */}
        {!concept ? (
          <div style={{
            flex: 1,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            flexDirection: "column",
            gap: "16px",
            color: "#303050"
          }}>
            <div style={{
              fontSize: "48px",
              fontFamily: "'Bricolage Grotesque', sans-serif",
              fontWeight: 900,
              color: "#60a5fa",
              opacity: 0.15
            }}>TS</div>
            <div style={{ fontSize: "12px", letterSpacing: "3px", textTransform: "uppercase" }}>
              Select a concept to begin
            </div>
          </div>
        ) : (
          <div style={{ flex: 1, overflowY: "auto", display: "flex", flexDirection: "column" }}>

            {/* Concept header */}
            <div style={{
              padding: "24px 32px 0",
              background: "#08080f",
              borderBottom: "1px solid #12121f"
            }}>
              <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: "16px", marginBottom: "16px", flexWrap: "wrap" }}>
                <div>
                  <Pill label={concept.tag} color={concept.color} />
                  <h2 style={{
                    fontFamily: "'Bricolage Grotesque', sans-serif",
                    fontSize: "clamp(18px, 2.5vw, 28px)",
                    fontWeight: 900,
                    color: "#fff",
                    letterSpacing: "-0.5px",
                    marginTop: "10px",
                    lineHeight: 1.2
                  }}>
                    {concept.title}
                  </h2>
                </div>
                <button
                  className="mark-btn"
                  onClick={() => setCompleted(prev => ({ ...prev, [selected]: !prev[selected] }))}
                  style={{
                    padding: "8px 18px",
                    background: completed[selected] ? "transparent" : concept.color + "18",
                    border: `1px solid ${completed[selected] ? "#1e1e2e" : concept.color + "44"}`,
                    borderRadius: "6px",
                    color: completed[selected] ? "#303050" : concept.color,
                    fontSize: "10px",
                    letterSpacing: "2px",
                    textTransform: "uppercase",
                    cursor: "pointer",
                    fontFamily: "inherit",
                    transition: "all 0.2s",
                    whiteSpace: "nowrap",
                    marginTop: "4px"
                  }}
                >
                  {completed[selected] ? "✓ done" : "mark done"}
                </button>
              </div>

              {/* TLDR */}
              <div style={{
                padding: "14px 18px",
                background: concept.color + "08",
                border: `1px solid ${concept.color}22`,
                borderRadius: "8px",
                marginBottom: "16px",
                fontSize: "12px",
                color: "#8892a4",
                lineHeight: "1.8",
                borderLeft: `3px solid ${concept.color}55`
              }}>
                <span style={{ color: concept.color, marginRight: "8px", fontSize: "9px", letterSpacing: "2px", textTransform: "uppercase" }}>tldr</span>
                {concept.tldr}
              </div>

              {/* Tabs */}
              <div style={{ display: "flex", gap: "2px", flexWrap: "wrap" }}>
                {tabs.map(t => (
                  <button
                    key={t.key}
                    className="tab-btn"
                    onClick={() => setTab(t.key)}
                    style={{
                      background: tab === t.key ? concept.color + "15" : "transparent",
                      border: "none",
                      borderBottom: `2px solid ${tab === t.key ? concept.color : "transparent"}`,
                      color: tab === t.key ? concept.color : "#404060",
                      padding: "10px 18px",
                      fontSize: "10px",
                      letterSpacing: "1.5px",
                      textTransform: "uppercase",
                      cursor: "pointer",
                      transition: "all 0.15s",
                      fontFamily: "inherit",
                      opacity: tab === t.key ? 1 : 0.7
                    }}
                  >
                    {t.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Tab content */}
            <div style={{ padding: "28px 32px", flex: 1 }}>

              {tab === "why" && (
                <div style={{ display: "flex", flexDirection: "column", gap: "28px" }}>
                  <div>
                    <div style={{ fontSize: "9px", letterSpacing: "3px", color: concept.color, marginBottom: "12px", textTransform: "uppercase", display: "flex", alignItems: "center", gap: "8px" }}>
                      <span style={{ width: "16px", height: "1px", background: concept.color, display: "inline-block" }} />
                      The Problem This Solves
                    </div>
                    <p style={{ fontSize: "13px", color: "#8892a4", lineHeight: "1.9", whiteSpace: "pre-line" }}>
                      {concept.problem}
                    </p>
                  </div>
                  <div>
                    <div style={{ fontSize: "9px", letterSpacing: "3px", color: concept.color, marginBottom: "12px", textTransform: "uppercase", display: "flex", alignItems: "center", gap: "8px" }}>
                      <span style={{ width: "16px", height: "1px", background: concept.color, display: "inline-block" }} />
                      Real World Analogy
                    </div>
                    <div style={{
                      background: "#0c0c18",
                      border: "1px solid #1e1e2e",
                      borderRadius: "10px",
                      padding: "20px 22px",
                      fontSize: "12.5px",
                      color: "#8892a4",
                      lineHeight: "2",
                      whiteSpace: "pre-line"
                    }}>
                      {concept.analogy}
                    </div>
                  </div>
                </div>
              )}

              {tab === "deep" && (
                <div>
                  <div style={{ fontSize: "9px", letterSpacing: "3px", color: concept.color, marginBottom: "14px", textTransform: "uppercase", display: "flex", alignItems: "center", gap: "8px" }}>
                    <span style={{ width: "16px", height: "1px", background: concept.color, display: "inline-block" }} />
                    Under The Hood
                  </div>
                  <div style={{
                    background: "#0c0c18",
                    border: "1px solid #1e1e2e",
                    borderRadius: "10px",
                    padding: "22px 24px",
                    fontSize: "12px",
                    color: "#8892a4",
                    lineHeight: "2.1",
                    whiteSpace: "pre-line",
                    fontFamily: "'JetBrains Mono', monospace"
                  }}>
                    {concept.deep}
                  </div>
                </div>
              )}

              {tab === "code" && (
                <div>
                  <div style={{ fontSize: "9px", letterSpacing: "3px", color: concept.color, marginBottom: "14px", textTransform: "uppercase", display: "flex", alignItems: "center", gap: "8px" }}>
                    <span style={{ width: "16px", height: "1px", background: concept.color, display: "inline-block" }} />
                    Real World Code Examples
                  </div>
                  <CodeBlock code={concept.code} />
                </div>
              )}

              {tab === "bugs" && (
                <div>
                  <div style={{ fontSize: "9px", letterSpacing: "3px", color: "#f43f5e", marginBottom: "14px", textTransform: "uppercase", display: "flex", alignItems: "center", gap: "8px" }}>
                    <span style={{ width: "16px", height: "1px", background: "#f43f5e", display: "inline-block" }} />
                    Common Bugs & Fixes
                  </div>
                  <div style={{
                    background: "#180c0c",
                    border: "1px solid #2e1e1e",
                    borderRadius: "8px",
                    padding: "12px 16px",
                    marginBottom: "16px",
                    fontSize: "11px",
                    color: "#6b3333"
                  }}>
                    These are real mistakes developers make. Understanding WHY each is wrong is more important than memorizing the fix.
                  </div>
                  <CodeBlock code={concept.bugs} />
                </div>
              )}

              {tab === "challenge" && (
                <div>
                  <div style={{ fontSize: "9px", letterSpacing: "3px", color: "#f59e0b", marginBottom: "14px", textTransform: "uppercase", display: "flex", alignItems: "center", gap: "8px" }}>
                    <span style={{ width: "16px", height: "1px", background: "#f59e0b", display: "inline-block" }} />
                    Your Challenge
                  </div>
                  <div style={{
                    background: "#14100a",
                    border: "1px solid #f59e0b22",
                    borderRadius: "8px",
                    padding: "14px 16px",
                    marginBottom: "16px",
                    fontSize: "11px",
                    color: "#806030",
                    lineHeight: "1.7"
                  }}>
                    Write this from scratch without referencing the code tab. If stuck on syntax, check the deep dive. If stuck on logic, re-read the analogy. Only check code tab as a last resort.
                  </div>
                  <CodeBlock code={concept.challenge} />
                </div>
              )}

              {/* Summary bar */}
              <div style={{
                marginTop: "32px",
                padding: "16px 20px",
                background: "#0c0c18",
                border: `1px solid ${concept.color}22`,
                borderRadius: "8px",
                display: "flex",
                alignItems: "flex-start",
                gap: "12px"
              }}>
                <span style={{ color: concept.color, fontSize: "14px", marginTop: "2px" }}>◆</span>
                <div>
                  <div style={{ fontSize: "9px", letterSpacing: "2px", color: concept.color, marginBottom: "5px", textTransform: "uppercase" }}>
                    one line summary
                  </div>
                  <p style={{ fontSize: "12px", color: "#606080", lineHeight: "1.7", margin: 0 }}>
                    {concept.summary}
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}