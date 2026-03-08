"use client"
import { useState } from "react";

const concepts = [
  {
    id: 1,
    title: "Execution Context & Call Stack",
    tag: "THE INVISIBLE ENGINE",
    color: "#00ff9d",
    tldr: "Every time JS runs code, it creates a 'context' — a box that holds variables and knows what 'this' is. The call stack is the pile of those boxes.",
    problem: `Before understanding this: you couldn't explain WHY hoisting happens, WHY 'this' changes, or WHY async code behaves the way it does. These aren't separate mysteries — they're all consequences of how execution contexts work.`,
    analogy: `Think of a restaurant kitchen.

Each ORDER is an execution context.
- It has its own ingredients (variables)
- It knows which chef is making it (this)
- It has a sequence of steps (code to execute)

The PASS (the shelf where orders wait) is the call stack.
- New order comes in → goes on top of the pass
- Chef completes top order → it leaves the pass
- Chef works on next order below

The kitchen (JS engine) can only work one order at a time — but it tracks ALL pending orders in the stack.`,
    deep: `There are TWO types of execution context:

1. GLOBAL execution context
   - Created when your JS file first runs
   - Creates the 'window' object (browser) or 'global' (Node)
   - Sets 'this' = window/global
   - Only ONE exists

2. FUNCTION execution context
   - Created every time a function is CALLED (not defined)
   - Gets its own variable environment
   - Gets its own 'this' value
   - Can be thousands of these

Each context has TWO phases:
CREATION phase:
  - Scans for var declarations → hoists them (sets to undefined)
  - Scans for function declarations → hoists them fully
  - Sets up 'this'

EXECUTION phase:
  - Runs code line by line
  - Assigns actual values to variables`,
    code: `// ─── VISUALIZING THE CALL STACK ───────────────────────

function placeOrder(item) {
  const receipt = generateReceipt(item);  // new context created
  return receipt;
}

function generateReceipt(item) {
  const tax = calculateTax(item.price);   // new context created
  return \`\${item.name}: ₹\${item.price + tax}\`;
}

function calculateTax(price) {
  return price * 0.18;                    // new context created
}

placeOrder({ name: "Coffee", price: 100 });

// CALL STACK at peak:
// [calculateTax]     ← currently executing
// [generateReceipt]  ← waiting
// [placeOrder]       ← waiting
// [global]           ← always at bottom

// As each finishes, it POPS off the stack
// calculateTax finishes → stack: [generateReceipt, placeOrder, global]
// generateReceipt finishes → stack: [placeOrder, global]
// placeOrder finishes → stack: [global]


// ─── WHY HOISTING HAPPENS (creation phase) ────────────

console.log(userName);   // undefined — NOT an error
console.log(getUser);    // [Function: getUser] — fully available
// console.log(balance); // ReferenceError — let is NOT hoisted

var userName = "Rahul";
let balance = 5000;

function getUser() {
  return userName;
}

// During CREATION phase, JS engine did this:
// var userName = undefined;  ← hoisted, set to undefined
// function getUser = [full function]  ← hoisted fully
// let balance → NOT hoisted (stays in temporal dead zone)


// ─── REAL WORLD: E-COMMERCE CHECKOUT ──────────────────

function processCheckout(cart) {
  // This function's context has: cart, totalAmount, discount
  const totalAmount = calculateTotal(cart);
  const discount = applyDiscount(totalAmount);
  return confirmOrder(discount);
}

function calculateTotal(cart) {
  // New context: has cart, total — doesn't know about processCheckout's vars
  return cart.reduce((total, item) => total + item.price, 0);
}

function applyDiscount(amount) {
  // New context: has amount — completely isolated
  return amount > 1000 ? amount * 0.9 : amount;
}

function confirmOrder(finalAmount) {
  return { status: "confirmed", amount: finalAmount };
}

const cart = [
  { name: "Laptop Stand", price: 800 },
  { name: "Keyboard", price: 500 }
];

console.log(processCheckout(cart));
// { status: 'confirmed', amount: 1170 }`,
    bugs: `// ─── BUG: Hoisting confusion with var ─────────────────

function calculateBonus(salary) {
  if (salary > 50000) {
    var bonus = salary * 0.2;  // var is hoisted to FUNCTION top
  }
  return bonus;  // works but is undefined if condition is false
                 // this is a BUG waiting to happen
}

// FIX: use let — it stays in block scope
function calculateBonusFixed(salary) {
  if (salary > 50000) {
    let bonus = salary * 0.2;
    return bonus;
  }
  return 0;  // explicit, clear
}

// ─── BUG: Stack overflow ───────────────────────────────

function infiniteRecursion() {
  return infiniteRecursion();  // pushes to stack forever
  // RangeError: Maximum call stack size exceeded
}

// FIX: always have a base case
function countdown(n) {
  if (n <= 0) return "done";   // base case — stops recursion
  return countdown(n - 1);
}`,
    challenge: `// CHALLENGE: Predict the output BEFORE running it.
// Write your answers as comments, then verify.

var company = "TechCorp";

function getEmployeeInfo() {
  console.log(company);      // Q1: what logs here?
  console.log(department);   // Q2: what logs here?
  console.log(getSalary);    // Q3: what logs here?

  var department = "Engineering";

  function getSalary() {
    return 75000;
  }
}

getEmployeeInfo();
console.log(department);     // Q4: what logs here?

// After predicting: draw the execution contexts on paper.
// Label what's in each context's variable environment.`,
    summary: "Every JS program creates execution contexts. Understanding them explains hoisting, scope, 'this', and async behavior — all at once."
  },

  {
    id: 2,
    title: "var vs let vs const",
    tag: "SCOPE & SAFETY",
    color: "#38bdf8",
    tldr: "var is function-scoped and hoisted. let and const are block-scoped and safer. This isn't style preference — it's about preventing entire categories of bugs.",
    problem: `The problem was: JavaScript needed variables. var was the only option for years. But var has a fatal flaw — it ignores block scope ({} blocks). This caused real, hard-to-debug bugs in loops, conditionals, and async code. let and const were introduced in ES6 (2015) specifically to fix these bugs.`,
    analogy: `Think of an office building.

var is like a MASTER KEY — it works anywhere on the entire floor (function).
Even if you created it in the bathroom (if block), it works in the boardroom.
Confusing. Dangerous.

let is like a ROOM KEY — it only works in the room it was made for (block).
Made it in the meeting room? Stays in the meeting room.

const is like a LOCKER — you assign it once, that's it.
You can still USE what's in the locker, but you can't replace it with something else.

A responsible company (codebase) uses room keys and lockers.
Only use master keys when you genuinely need floor-wide access.`,
    deep: `SCOPE RULES:

var → function scoped
  - Lives from the top of its function (due to hoisting)
  - Ignores if/else/for/while block boundaries
  - Can be re-declared in same scope (no error)

let → block scoped
  - Lives only inside its {} block
  - Cannot be accessed before declaration (temporal dead zone)
  - Cannot be re-declared in same scope

const → block scoped + immutable binding
  - Same as let for scope
  - The BINDING is immutable — you can't reassign the variable
  - But the VALUE can be mutated (objects and arrays can change internally)

TEMPORAL DEAD ZONE (TDZ):
  The time between entering a block and the let/const declaration.
  Accessing the variable in TDZ = ReferenceError.
  This is intentional — it catches bugs that var silently swallowed.`,
    code: `// ─── THE CLASSIC BUG: var in loops ───────────────────

// PROBLEM: You want to log 0, 1, 2 after 1 second each
for (var i = 0; i < 3; i++) {
  setTimeout(() => console.log(i), 1000 * i);
}
// Output: 3, 3, 3
// Why? var i is shared across ALL iterations.
// By the time timeouts run, loop finished, i = 3.

// FIX with let:
for (let i = 0; i < 3; i++) {
  setTimeout(() => console.log(i), 1000 * i);
}
// Output: 0, 1, 2
// Why? let creates a NEW i for each iteration. Each closure captures its own i.


// ─── REAL WORLD: User authentication ──────────────────

function authenticateUser(credentials) {
  const MAX_ATTEMPTS = 3;        // const — this never changes
  let attemptCount = 0;          // let — this changes over time
  let isAuthenticated = false;   // let — changes state

  while (attemptCount < MAX_ATTEMPTS) {
    const result = checkPassword(credentials);  // const — new each iteration

    if (result.success) {
      isAuthenticated = true;
      break;
    }

    attemptCount++;

    if (attemptCount === MAX_ATTEMPTS) {
      lockAccount(credentials.userId);
    }
  }

  return isAuthenticated;
}


// ─── const with objects (common confusion) ────────────

const user = { name: "Rahul", role: "developer" };

// This WORKS — mutating the object's contents
user.role = "senior developer";
user.salary = 80000;
console.log(user); // { name: 'Rahul', role: 'senior developer', salary: 80000 }

// This FAILS — reassigning the variable itself
// user = { name: "Someone else" }; // TypeError: Assignment to constant variable

// Why? const locks the BINDING (the pointer to the object in memory).
// It doesn't freeze the object. The pointer stays the same.
// Use Object.freeze() if you want the object itself to be immutable.

const frozenConfig = Object.freeze({
  API_URL: "https://api.company.com",
  VERSION: "2.1.0"
});
// frozenConfig.API_URL = "other"; // silently fails in non-strict, throws in strict


// ─── REAL WORLD: Financial transaction ────────────────

function processPayment(amount, userId) {
  const TRANSACTION_FEE = 0.02;      // never changes
  const transactionId = generateId(); // set once

  let status = "pending";            // changes
  let finalAmount = amount * (1 + TRANSACTION_FEE); // calculated once but let

  if (amount > 100000) {
    let requiresApproval = true;     // only needed in this block
    status = "awaiting_approval";
    notifyManager(userId, finalAmount);
    // requiresApproval is GONE after this block closes
  }

  // console.log(requiresApproval); // ReferenceError — good, it's block-scoped

  return { transactionId, status, finalAmount };
}`,
    bugs: `// ─── BUG 1: var leaks out of blocks ──────────────────

function checkEligibility(age) {
  if (age >= 18) {
    var isEligible = true;   // var leaks OUT of the if block
  }
  return isEligible;         // works if age >= 18
                             // returns undefined if age < 18 — silent bug!
}

// FIX:
function checkEligibilityFixed(age) {
  let isEligible = false;    // declared at function level with default
  if (age >= 18) {
    isEligible = true;
  }
  return isEligible;
}


// ─── BUG 2: Re-declaration with var ──────────────────

var apiKey = "key_123";
// ... 500 lines of code later ...
var apiKey = "key_456";  // No error! Silently overwrites. Dangerous.

// with let:
let apiKey2 = "key_123";
// let apiKey2 = "key_456"; // SyntaxError: Identifier already declared
// This is what you WANT — the error saves you from silent overwrites


// ─── BUG 3: const with arrays ────────────────────────

const cart = [];
cart.push({ item: "Laptop", price: 50000 });  // Works fine
cart.push({ item: "Mouse", price: 500 });      // Works fine
// cart = [];  // TypeError — can't reassign

// This is actually GOOD behavior for a cart:
// - You can add/remove items (mutable contents)
// - But you can't accidentally replace the whole cart reference`,
    challenge: `// CHALLENGE 1: Fix the bug
function createPriceTags(products) {
  var tags = [];
  for (var i = 0; i < products.length; i++) {
    setTimeout(function() {
      tags.push("Tag for: " + products[i].name); // BUG: what is i here?
    }, 100);
  }
  return tags;
}
// Fix it so each product gets the right tag.

// CHALLENGE 2: Predict what's accessible where
function bankSystem() {
  const bankName = "SBI";
  let totalBalance = 0;

  if (true) {
    const branchCode = "MUM001";
    let branchBalance = 50000;
    totalBalance += branchBalance;
  }

  // Q: Which variables can you access here?
  // console.log(bankName);      // ?
  // console.log(totalBalance);  // ?
  // console.log(branchCode);    // ?
  // console.log(branchBalance); // ?
}`,
    summary: "Use const by default. Use let when the value needs to change. Never use var in modern code. The scope rules prevent entire categories of silent bugs."
  },

  {
    id: 3,
    title: "Arrow Functions vs Regular Functions",
    tag: "THIS IS EVERYTHING",
    color: "#f59e0b",
    tldr: "Arrow functions don't have their own 'this' — they borrow it from wherever they were written. Regular functions create their own 'this' based on who calls them. This single difference explains 90% of 'this' confusion.",
    problem: `Before arrow functions (pre-ES6), callbacks were a nightmare. Every time you passed a function as a callback (to setTimeout, array methods, event handlers), 'this' changed and pointed somewhere unexpected. Developers used hacks like 'var self = this' or .bind(this). Arrow functions were created to solve this exact problem.`,
    analogy: `Imagine two types of employees:

REGULAR EMPLOYEE (regular function):
"My boss is whoever called me into the meeting."
If HR calls them → HR is their boss in that context.
If CEO calls them → CEO is their boss in that context.
Their loyalty shifts based on who summoned them.

CONTRACTOR (arrow function):
"My boss is whoever hired me from the agency — always."
Doesn't matter who calls them into a meeting.
They always report back to their original employer.
Their loyalty is fixed at the time of hiring (definition).

In React, your component methods need to be contractors.
They need to always refer back to the component (their employer),
even when React (a third party) calls them as event handlers.`,
    deep: `HOW 'this' is determined for regular functions:
  - Called as a method on object → this = that object
  - Called standalone → this = undefined (strict) or window (non-strict)
  - Called with new → this = new object being created
  - Called with .call()/.apply()/.bind() → this = whatever you specify

HOW 'this' is determined for arrow functions:
  - ALWAYS = 'this' from the enclosing lexical scope at time of DEFINITION
  - Cannot be changed. .call()/.apply()/.bind() are ignored for 'this'
  - No 'arguments' object
  - Cannot be used with 'new'
  - Cannot be used as object methods if you need 'this' to refer to the object

OTHER DIFFERENCES:
  - Arrow functions have implicit return (single expression)
  - Arrow functions cannot be generators
  - Arrow functions have no 'prototype' property`,
    code: `// ─── THE CORE DIFFERENCE ─────────────────────────────

const company = {
  name: "TechStartup",
  employees: ["Rahul", "Priya", "Arjun"],

  // Regular function — 'this' = company (called as method)
  listEmployeesRegular: function() {
    console.log("Company:", this.name); // "TechStartup" ✓

    this.employees.forEach(function(emp) {
      // Regular function inside forEach — 'this' is now LOST
      // Called by forEach, not by company object
      console.log(this.name + " employs " + emp); // undefined employs Rahul ✗
    });
  },

  // Arrow function — 'this' is inherited from listEmployeesArrow's context
  listEmployeesArrow: function() {
    console.log("Company:", this.name); // "TechStartup" ✓

    this.employees.forEach((emp) => {
      // Arrow function inherits 'this' from listEmployeesArrow
      // listEmployeesArrow's 'this' is company
      console.log(this.name + " employs " + emp); // "TechStartup employs Rahul" ✓
    });
  }
};

company.listEmployeesRegular();
company.listEmployeesArrow();


// ─── REAL WORLD: React-like component ────────────────

class ProductList {
  constructor() {
    this.products = [];
    this.loading = false;
    this.error = null;
  }

  // Regular function used as method — correct, 'this' = instance
  async fetchProducts() {
    this.loading = true;

    try {
      const response = await fetch("/api/products");
      const data = await response.json();

      // Arrow function in .then() — inherits 'this' from fetchProducts
      // fetchProducts' 'this' = ProductList instance
      data.forEach((product) => {
        this.products.push(product);  // 'this' correctly refers to instance
      });

    } catch (err) {
      this.error = err.message;
    } finally {
      this.loading = false;
    }
  }

  // Intended as event handler — use arrow to preserve 'this'
  handleSearch = (query) => {
    // 'this' is always the ProductList instance
    // even when React calls this as an onClick handler
    const results = this.products.filter(p =>
      p.name.toLowerCase().includes(query.toLowerCase())
    );
    return results;
  }
}


// ─── IMPLICIT RETURN (concise arrow functions) ────────

const products = [
  { name: "Laptop", price: 50000, inStock: true },
  { name: "Phone", price: 20000, inStock: false },
  { name: "Tablet", price: 30000, inStock: true }
];

// verbose
const available = products.filter(function(p) {
  return p.inStock === true;
});

// arrow — implicit return, same result
const available2 = products.filter(p => p.inStock);

// chained — readable data pipeline
const affordableNames = products
  .filter(p => p.inStock)
  .filter(p => p.price < 40000)
  .map(p => p.name);
// ["Tablet"]


// ─── WHEN TO USE WHICH ───────────────────────────────

// Use REGULAR when:
// 1. Object methods that need 'this' to be the object
const bankAccount = {
  balance: 10000,
  withdraw: function(amount) {   // regular — 'this' = bankAccount
    if (amount <= this.balance) {
      this.balance -= amount;
      return this.balance;
    }
    throw new Error("Insufficient funds");
  }
};

// 2. Constructor functions
function Employee(name, salary) {  // regular — used with 'new'
  this.name = name;
  this.salary = salary;
}

// Use ARROW when:
// 1. Callbacks where you need to preserve outer 'this'
// 2. Array methods (map, filter, reduce)
// 3. Short utility functions
// 4. Class properties that will be used as event handlers`,
    bugs: `// ─── BUG 1: Arrow function as object method ──────────

const wallet = {
  owner: "Rahul",
  balance: 5000,

  // Arrow function — 'this' is NOT the wallet
  // 'this' is whatever 'this' was OUTSIDE this object (probably window/undefined)
  getBalance: () => {
    return \`\${this.owner}'s balance: \${this.balance}\`; // undefined's balance: undefined
  },

  // FIX: regular function
  getBalanceFixed: function() {
    return \`\${this.owner}'s balance: \${this.balance}\`; // "Rahul's balance: 5000"
  }
};


// ─── BUG 2: Arrow function with .bind() ──────────────

const timer = {
  seconds: 0,
  start: () => {
    setInterval(() => {
      this.seconds++; // 'this' is NOT timer — arrow ignores bind
    }, 1000);
  }
};

// .bind(timer) won't help — arrow functions ignore it
// FIX: make start() a regular function
const timerFixed = {
  seconds: 0,
  start: function() {
    setInterval(() => {
      this.seconds++; // 'this' = timerFixed (inherited from start's context)
    }, 1000);
  }
};


// ─── BUG 3: Forgetting no 'arguments' object ─────────

const sum = () => {
  // console.log(arguments); // ReferenceError: arguments is not defined
};

// FIX: use rest params
const sumFixed = (...numbers) => {
  return numbers.reduce((total, n) => total + n, 0);
};
console.log(sumFixed(100, 200, 300)); // 600`,
    challenge: `// CHALLENGE: Fix all the 'this' bugs

class ShoppingCart {
  constructor(userId) {
    this.userId = userId;
    this.items = [];
    this.discounts = [];
  }

  // BUG 1: Why does this.items not work inside forEach?
  applyDiscounts(discountList) {
    discountList.forEach(function(discount) {
      if (this.items.some(item => item.category === discount.category)) {
        this.discounts.push(discount);
      }
    });
  }

  // BUG 2: Why is this.userId undefined here?
  checkout = () => {
    const orderSummary = {
      userId: this.userId,
      items: this.items,
      total: this.calculateTotal()
    };
    return orderSummary;
  }

  // BUG 3: Should this be arrow or regular?
  calculateTotal = function() {
    return this.items.reduce((sum, item) => sum + item.price, 0);
  }
}

// Fix all three bugs and explain WHY each fix works.`,
    summary: "Arrow functions fix 'this' for callbacks. Regular functions are needed for object methods and constructors. Choose based on whether you need 'this' to be dynamic or lexical."
  },

  {
    id: 4,
    title: "Closures",
    tag: "MEMORY & POWER",
    color: "#c084fc",
    tldr: "A closure is a function that remembers variables from its outer scope even after that outer function has finished running. It's how JS functions carry their backpack of remembered values.",
    problem: `Early JS had no private variables. Everything was global or function-scoped. You couldn't hide state. Anyone could overwrite your counter, your config, your auth tokens. Closures became the solution — a way to create truly private state that only your functions could access and modify.`,
    analogy: `Think of a BANK VAULT with a custom remote.

The vault (outer function) is built and sealed.
The remote (inner function) is handed to you.
The remote remembers the vault's combination (closed-over variable).

The vault constructor is GONE — he built it and left.
But your remote still works. It still knows the combination.
No one else can get the combination. It's private to the remote.

In finance terms:
A fixed deposit has a locked-in interest rate.
Even if the bank changes rates later, YOUR FD remembers ITS rate.
The original rate is closed over. It doesn't change.

In product terms:
A user session token remembers which userId it was created for.
Even when the login function is long gone, the token closure remembers.`,
    deep: `HOW CLOSURES WORK (under the hood):

When a function is created, JS attaches a [[Environment]] reference to it.
This reference points to the variable environment where it was created.

When that outer function finishes:
- Its execution context is removed from the call stack
- BUT if any inner function still holds a reference to its variables...
- The garbage collector CANNOT clean them up
- They stay in memory, accessible via the inner function's [[Environment]]

This is the closure: inner function + its [[Environment]] reference.

THREE COMMON CLOSURE PATTERNS:
1. Function factories — create specialized versions of functions
2. Module pattern — create private state
3. Memoization — cache expensive computation results

MEMORY NOTE:
Closures keep variables alive in memory.
If you create thousands of closures over large objects, you can cause memory leaks.
Always be aware of what your closures are holding onto.`,
    code: `// ─── BASIC CLOSURE ───────────────────────────────────

function createBankAccount(initialBalance) {
  let balance = initialBalance;  // private — no one outside can touch this directly

  return {
    deposit: function(amount) {
      balance += amount;
      return balance;
    },
    withdraw: function(amount) {
      if (amount > balance) throw new Error("Insufficient funds");
      balance -= amount;
      return balance;
    },
    getBalance: function() {
      return balance;
    }
  };
}

const myAccount = createBankAccount(10000);
console.log(myAccount.getBalance()); // 10000
myAccount.deposit(5000);
console.log(myAccount.getBalance()); // 15000
myAccount.withdraw(3000);
console.log(myAccount.getBalance()); // 12000

// balance is PRIVATE. This fails:
// console.log(myAccount.balance); // undefined — no direct access


// ─── FUNCTION FACTORY (powerful pattern) ──────────────

function createTaxCalculator(taxRate) {
  // taxRate is closed over — remembered forever
  return function(price) {
    return price * taxRate;
  };
}

const calculateGST = createTaxCalculator(0.18);
const calculateLuxuryTax = createTaxCalculator(0.28);
const calculateBasicTax = createTaxCalculator(0.05);

console.log(calculateGST(1000));         // 180
console.log(calculateLuxuryTax(1000));   // 280
console.log(calculateBasicTax(1000));    // 50

// createTaxCalculator ran THREE times and is DONE.
// But each returned function still remembers ITS taxRate.


// ─── REAL WORLD: Memoization ─────────────────────────

function createMemoized(expensiveFunction) {
  const cache = {};  // this cache is private, closed over

  return function(input) {
    if (cache[input] !== undefined) {
      console.log("Cache hit for:", input);
      return cache[input];
    }

    console.log("Computing for:", input);
    const result = expensiveFunction(input);
    cache[input] = result;
    return result;
  };
}

// Simulated expensive calculation (like fetching exchange rates)
function getExchangeRate(currency) {
  // Imagine this hits an API — expensive
  const rates = { USD: 83.5, EUR: 91.2, GBP: 105.3 };
  return rates[currency] || 0;
}

const memoizedRate = createMemoized(getExchangeRate);

memoizedRate("USD");  // "Computing for: USD" → 83.5
memoizedRate("USD");  // "Cache hit for: USD" → 83.5 (no recompute)
memoizedRate("EUR");  // "Computing for: EUR" → 91.2
memoizedRate("EUR");  // "Cache hit for: EUR" → 91.2


// ─── REAL WORLD: Rate limiter (backend use case) ──────

function createRateLimiter(maxRequests, windowMs) {
  const requests = {};  // userId → [timestamps], closed over

  return function(userId) {
    const now = Date.now();
    const windowStart = now - windowMs;

    if (!requests[userId]) {
      requests[userId] = [];
    }

    // Remove old requests outside the window
    requests[userId] = requests[userId].filter(time => time > windowStart);

    if (requests[userId].length >= maxRequests) {
      return { allowed: false, retryAfter: windowMs };
    }

    requests[userId].push(now);
    return { allowed: true };
  };
}

const apiLimiter = createRateLimiter(5, 60000); // 5 requests per minute

console.log(apiLimiter("user_123")); // { allowed: true }
console.log(apiLimiter("user_123")); // { allowed: true }
// ... after 5 calls:
// { allowed: false, retryAfter: 60000 }


// ─── MODULE PATTERN (pre-ES6 modules) ─────────────────

const InventoryManager = (function() {
  // Private state — only accessible through public methods
  let inventory = {};
  let totalValue = 0;

  // Private function — not exposed
  function calculateValue(item) {
    return item.price * item.quantity;
  }

  // Public interface
  return {
    addProduct: function(product) {
      inventory[product.id] = product;
      totalValue += calculateValue(product);
    },
    removeProduct: function(id) {
      if (inventory[id]) {
        totalValue -= calculateValue(inventory[id]);
        delete inventory[id];
      }
    },
    getTotalValue: function() {
      return totalValue;
    },
    getStock: function(id) {
      return inventory[id]?.quantity || 0;
    }
  };
})(); // IIFE — immediately invoked

InventoryManager.addProduct({ id: "p1", name: "Laptop", price: 50000, quantity: 10 });
InventoryManager.addProduct({ id: "p2", name: "Mouse", price: 500, quantity: 50 });
console.log(InventoryManager.getTotalValue()); // 525000
// inventory and totalValue are PRIVATE — cannot be accessed directly`,
    bugs: `// ─── BUG 1: Classic loop closure bug ────────────────

// WRONG: All functions close over the SAME 'i'
const priceFunctions = [];
for (var i = 0; i < 3; i++) {
  priceFunctions.push(function() {
    return "Price tier " + i;  // i is shared — all see i=3 when called
  });
}
console.log(priceFunctions[0]()); // "Price tier 3" ✗
console.log(priceFunctions[1]()); // "Price tier 3" ✗

// FIX 1: Use let (creates new binding per iteration)
const priceFunctions2 = [];
for (let i = 0; i < 3; i++) {
  priceFunctions2.push(function() {
    return "Price tier " + i;  // each iteration's own i
  });
}
console.log(priceFunctions2[0]()); // "Price tier 0" ✓

// FIX 2: Use IIFE to create a new scope per iteration
const priceFunctions3 = [];
for (var i = 0; i < 3; i++) {
  priceFunctions3.push((function(index) {
    return function() { return "Price tier " + index; };
  })(i));
}


// ─── BUG 2: Memory leak via closure ──────────────────

function attachHandler() {
  const HUGE_DATA = new Array(1000000).fill("data"); // 1M items

  document.getElementById("btn").addEventListener("click", function() {
    console.log("clicked");
    // This handler closes over HUGE_DATA even though it never uses it
    // HUGE_DATA cannot be garbage collected as long as this handler exists
  });
}

// FIX: Don't reference large data in closures unless needed
// Or remove event listeners when done
// Or extract only what you need before the closure`,
    challenge: `// CHALLENGE 1: Build a private counter for an e-commerce cart

// Requirements:
// - itemCount starts at 0
// - addItem(n) adds n items
// - removeItem(n) removes n (min 0)
// - getCount() returns current count
// - reset() resets to 0
// - itemCount should NOT be directly accessible or modifiable
// - Calling cartCounter.itemCount should return undefined

const cartCounter = /* your closure here */;

cartCounter.addItem(3);
cartCounter.addItem(2);
cartCounter.removeItem(1);
console.log(cartCounter.getCount()); // should be 4
console.log(cartCounter.itemCount);  // should be undefined
cartCounter.reset();
console.log(cartCounter.getCount()); // should be 0


// CHALLENGE 2: Build a function factory

// Create makeDiscount(percentage) that returns a function
// That returned function takes a price and returns the discounted price
// Make sure each returned function remembers its own percentage

const tenPercent = makeDiscount(10);
const twentyPercent = makeDiscount(20);

console.log(tenPercent(1000));   // 900
console.log(twentyPercent(1000)); // 800`,
    summary: "Closures let inner functions remember outer variables after the outer function is gone. Used for private state, factories, memoization, and module patterns."
  },

  {
    id: 5,
    title: "The 'this' Keyword",
    tag: "CONTEXT IS EVERYTHING",
    color: "#fb923c",
    tldr: "'this' refers to the object that is currently executing the function — determined by HOW the function is called, not where it's defined. Except in arrow functions, where it's always the surrounding lexical context.",
    problem: `'this' is probably the most confusing part of JavaScript for most developers. It confused people because in other OOP languages (Java, C++), 'this' always refers to the current object instance. In JS, 'this' is dynamic — it depends on the call site. This caused massive confusion and bugs when methods were passed as callbacks.`,
    analogy: `Imagine you send an email saying "Can you approve MY request?"

The word "MY" changes meaning based on WHO is reading it:
- Your manager reads it → MY = your request
- IT reads the forwarded email → MY = manager's request
- CEO reads the re-forwarded email → MY = IT's request

"MY" (this) refers to whoever is currently acting on the message.

In code:
- A method called on an object → 'this' = that object
- The SAME method extracted and called standalone → 'this' = undefined/window
- Same method bound with .bind(obj) → 'this' = obj

The function didn't change. The CALLER changed.`,
    deep: `THE 4 RULES OF 'this' (in priority order):

1. NEW BINDING (highest priority)
   new MyFunction() → 'this' = newly created object

2. EXPLICIT BINDING
   fn.call(obj) / fn.apply(obj) / fn.bind(obj) → 'this' = obj

3. IMPLICIT BINDING
   obj.method() → 'this' = obj (left of the dot)

4. DEFAULT BINDING (lowest priority)
   fn() called standalone → 'this' = undefined (strict) or window (non-strict)

ARROW FUNCTIONS:
   None of these rules apply.
   'this' = lexical 'this' from definition scope. Period.

COMMON TRAP: Implicit binding loss
   const fn = obj.method; // Extract the method
   fn();                  // Called standalone → loses obj as 'this'
   // 'this' is now undefined, NOT obj`,
    code: `// ─── ALL 4 RULES DEMONSTRATED ───────────────────────

// RULE 4: Default binding
function showDepartment() {
  console.log(this?.department); // undefined in strict, window.department in non-strict
}
showDepartment(); // undefined


// RULE 3: Implicit binding
const hrDepartment = {
  department: "Human Resources",
  headcount: 15,
  showInfo: function() {
    console.log(this.department, this.headcount); // HR has 'this'
  }
};
hrDepartment.showInfo(); // "Human Resources" 15


// RULE 2: Explicit binding
const engineeringDept = {
  department: "Engineering",
  headcount: 42
};

hrDepartment.showInfo.call(engineeringDept);   // "Engineering" 42
hrDepartment.showInfo.apply(engineeringDept);  // "Engineering" 42

const showEngineering = hrDepartment.showInfo.bind(engineeringDept);
showEngineering(); // "Engineering" 42 (permanently bound)


// RULE 1: new binding
function Department(name, budget) {
  this.name = name;      // 'this' = the new object being created
  this.budget = budget;
  this.employees = [];
}

const sales = new Department("Sales", 500000);
console.log(sales.name);   // "Sales"
console.log(sales.budget); // 500000


// ─── REAL WORLD: Event handler context loss ───────────

class NotificationService {
  constructor(userId) {
    this.userId = userId;
    this.notifications = [];
  }

  // Regular method — 'this' works when called as method
  addNotification(message) {
    this.notifications.push({
      userId: this.userId,
      message,
      timestamp: Date.now()
    });
  }

  // PROBLEM: if this is passed as a callback
  setupAutoNotify() {
    // This will BREAK — 'this' is lost when called by setInterval
    // setInterval(this.addNotification, 5000);

    // FIX 1: Arrow function wrapper
    setInterval(() => this.addNotification("Heartbeat"), 5000);

    // FIX 2: .bind()
    // setInterval(this.addNotification.bind(this), 5000);
  }
}


// ─── .call() .apply() .bind() — when to use each ─────

function generateReport(startDate, endDate) {
  return \`\${this.companyName} report from \${startDate} to \${endDate}\`;
}

const techCorp = { companyName: "TechCorp India" };
const financeInc = { companyName: "Finance Inc" };

// .call() — pass args individually, call immediately
generateReport.call(techCorp, "2024-01-01", "2024-12-31");
// "TechCorp India report from 2024-01-01 to 2024-12-31"

// .apply() — pass args as array, call immediately
const dateRange = ["2024-01-01", "2024-12-31"];
generateReport.apply(financeInc, dateRange);
// "Finance Inc report from 2024-01-01 to 2024-12-31"

// .bind() — create new function with 'this' permanently set, call later
const techCorpReport = generateReport.bind(techCorp);
techCorpReport("2024-Q1", "2024-Q2"); // call whenever needed


// ─── REAL WORLD: React class component pattern ────────

class PaymentForm {
  constructor() {
    this.amount = 0;
    this.currency = "INR";

    // Without this, handleSubmit loses 'this' when React calls it
    this.handleSubmit = this.handleSubmit.bind(this);
  }

  handleSubmit(event) {
    event.preventDefault();
    console.log(\`Processing ₹\${this.amount} in \${this.currency}\`);
    // 'this' correctly refers to PaymentForm instance
  }

  // Modern alternative: class field arrow function
  handleCancel = () => {
    // Arrow function as class field — 'this' always = instance
    console.log("Cancelling payment of", this.amount);
  }
}`,
    bugs: `// ─── BUG 1: Implicit binding loss ────────────────────

const userService = {
  domain: "myapp.com",
  getEmail: function(username) {
    return username + "@" + this.domain;  // 'this' = userService when called as method
  }
};

// Direct call — works
userService.getEmail("rahul"); // "rahul@myapp.com" ✓

// Extracted — BREAKS
const getEmailFn = userService.getEmail;
getEmailFn("rahul"); // "rahul@undefined" ✗ — 'this' is undefined/window

// FIX:
const getEmailBound = userService.getEmail.bind(userService);
getEmailBound("rahul"); // "rahul@myapp.com" ✓


// ─── BUG 2: Passing method as callback ───────────────

class OrderProcessor {
  constructor() {
    this.processedCount = 0;
  }

  process(order) {
    this.processedCount++; // 'this' is lost when called by forEach
    console.log("Processing:", order.id);
  }
}

const processor = new OrderProcessor();
const orders = [{ id: 1 }, { id: 2 }, { id: 3 }];

orders.forEach(processor.process);         // BREAKS — 'this' is undefined
orders.forEach(o => processor.process(o)); // WORKS — arrow preserves context
orders.forEach(processor.process.bind(processor)); // WORKS — explicit bind`,
    challenge: `// CHALLENGE: Trace 'this' in each scenario
// Write what 'this' refers to in each console.log

const company = {
  name: "BuildFast",
  teams: {
    name: "Engineering",
    lead: {
      name: "Priya",
      introduce: function() {
        console.log(this.name); // Q1: what is this.name?
      }
    }
  },
  listTeams: function() {
    console.log(this.name); // Q2: what is this.name?

    ["Backend", "Frontend"].forEach(function(team) {
      console.log(this.name); // Q3: what is this.name?
    });

    ["Backend", "Frontend"].forEach((team) => {
      console.log(this.name); // Q4: what is this.name?
    });
  }
};

company.teams.lead.introduce();
company.listTeams();

const fn = company.listTeams;
fn(); // Q5: what is this.name in listTeams now?`,
    summary: "'this' is determined by how a function is called. 4 rules: new > explicit (.call/.apply/.bind) > implicit (obj.method) > default (standalone). Arrow functions ignore all 4 rules — always lexical."
  },

  {
    id: 6,
    title: "Prototypes & Prototype Chain",
    tag: "HOW JS OOP ACTUALLY WORKS",
    color: "#34d399",
    tldr: "Every JS object has a hidden link to another object called its prototype. When you access a property, JS looks on the object first, then walks UP the chain until it finds it or hits null. Classes are just clean syntax over this.",
    problem: `Before classes (ES6), building reusable object templates was messy. You had constructor functions and prototype manipulation everywhere. Even now with classes, bugs appear because developers don't understand that classes ARE just prototypes. When something inherits wrong, when a method isn't found, when instanceof fails — it's always a prototype chain issue.`,
    analogy: `Think of a COMPANY HIERARCHY:

You (junior developer) need to approve a ₹500 expense.
You don't have authority → escalate to Team Lead.
Team Lead also can't → escalate to Manager.
Manager has authority → approves.

That's the prototype chain. JS walks UP the chain until it finds the property.

Or think of a PRODUCT CATALOG:
Every iPhone model has specific features.
But ALL iPhones share base features from "iPhone" parent.
And all iPhones share "Apple Device" features from above that.

When you ask "does iPhone 15 have Bluetooth?"
JS checks iPhone 15 → not found
Checks iPhone base → not found
Checks Apple Device → found: yes

The chain stops when found. If never found → undefined.`,
    deep: `EVERY OBJECT has an internal [[Prototype]] slot.
You can access it via Object.getPrototypeOf(obj) or obj.__proto__ (legacy).

WHEN you access obj.property:
1. Check obj itself → found? Return it.
2. Check obj's [[Prototype]] → found? Return it.
3. Check [[Prototype]]'s [[Prototype]] → found? Return it.
4. Continue until [[Prototype]] is null → return undefined.

FUNCTIONS have a 'prototype' property (different from [[Prototype]]).
When used with 'new', the new object's [[Prototype]] = that function's prototype.

THE CHAIN for a class instance:
instance → Class.prototype → ParentClass.prototype → Object.prototype → null

hasOwnProperty() checks only the object itself, not the chain.
This is how you tell if something is truly "owned" vs inherited.

CLASSES ARE SUGAR:
class Dog {} is equivalent to function Dog() {}
class Dog extends Animal is prototype chain setup under the hood.`,
    code: `// ─── PROTOTYPE CHAIN VISUALIZED ─────────────────────

const vehicle = {
  type: "vehicle",
  start: function() {
    return \`\${this.name} started\`;
  },
  stop: function() {
    return \`\${this.name} stopped\`;
  }
};

const car = Object.create(vehicle);  // car's [[Prototype]] = vehicle
car.name = "Car";
car.wheels = 4;
car.honk = function() {
  return "Beep beep!";
};

const myCar = Object.create(car);   // myCar's [[Prototype]] = car
myCar.name = "Tesla Model 3";
myCar.color = "black";

// Accessing myCar.start():
// 1. Check myCar → no start()
// 2. Check car (myCar's prototype) → no start()
// 3. Check vehicle (car's prototype) → found start()! Call it.
console.log(myCar.start()); // "Tesla Model 3 started"

// chain: myCar → car → vehicle → Object.prototype → null
console.log(Object.getPrototypeOf(myCar) === car);     // true
console.log(Object.getPrototypeOf(car) === vehicle);   // true


// ─── CLASSES UNDER THE HOOD ───────────────────────────

// What you write:
class Employee {
  constructor(name, department) {
    this.name = name;
    this.department = department;
  }

  introduce() {
    return \`Hi, I'm \${this.name} from \${this.department}\`;
  }

  getSummary() {
    return \`\${this.name} | \${this.department}\`;
  }
}

class Manager extends Employee {
  constructor(name, department, teamSize) {
    super(name, department);        // calls Employee constructor
    this.teamSize = teamSize;
  }

  introduce() {
    // Overrides Employee's introduce
    return \`\${super.introduce()}, managing \${this.teamSize} people\`;
  }
}

const priya = new Manager("Priya", "Engineering", 8);
console.log(priya.introduce());
// "Hi, I'm Priya from Engineering, managing 8 people"
console.log(priya.getSummary());
// "Priya | Engineering" — inherited from Employee


// WHAT JS IS ACTUALLY DOING:
// priya has: name, department, teamSize (own properties)
// priya's [[Prototype]] = Manager.prototype (has overridden introduce)
// Manager.prototype's [[Prototype]] = Employee.prototype (has getSummary, introduce)
// Employee.prototype's [[Prototype]] = Object.prototype (has toString, hasOwnProperty)

console.log(priya instanceof Manager);   // true
console.log(priya instanceof Employee);  // true
console.log(priya instanceof Object);    // true


// ─── REAL WORLD: Product system ───────────────────────

class Product {
  constructor(id, name, basePrice) {
    this.id = id;
    this.name = name;
    this.basePrice = basePrice;
    this.createdAt = new Date();
  }

  getPrice() {
    return this.basePrice;
  }

  getDisplayName() {
    return \`[\${this.id}] \${this.name}\`;
  }

  toJSON() {
    return {
      id: this.id,
      name: this.name,
      price: this.getPrice()  // polymorphic — calls the overridden version
    };
  }
}

class DiscountedProduct extends Product {
  constructor(id, name, basePrice, discountPercent) {
    super(id, name, basePrice);
    this.discountPercent = discountPercent;
  }

  getPrice() {  // Override — polymorphism
    return this.basePrice * (1 - this.discountPercent / 100);
  }

  getDisplayName() {
    return \`\${super.getDisplayName()} [-\${this.discountPercent}%]\`;
  }
}

class SubscriptionProduct extends Product {
  constructor(id, name, monthlyPrice, billingCycle) {
    super(id, name, monthlyPrice);
    this.billingCycle = billingCycle;
  }

  getPrice() {  // Override
    return this.basePrice * this.billingCycle;
  }
}

const laptop = new Product("P001", "Laptop", 50000);
const salePhone = new DiscountedProduct("P002", "Phone", 20000, 15);
const saasApp = new SubscriptionProduct("P003", "CRM Software", 2000, 12);

const products = [laptop, salePhone, saasApp];

// Polymorphism: each calls its OWN getPrice()
products.forEach(p => {
  console.log(p.getDisplayName(), "→ ₹" + p.getPrice());
});
// [P001] Laptop → ₹50000
// [P002] Phone [-15%] → ₹17000
// [P003] CRM Software → ₹24000


// ─── hasOwnProperty: own vs inherited ────────────────

console.log(salePhone.hasOwnProperty("discountPercent")); // true — own
console.log(salePhone.hasOwnProperty("getPrice"));         // false — inherited
console.log(salePhone.hasOwnProperty("name"));             // true — own (set in constructor)`,
    bugs: `// ─── BUG 1: Mutating prototype (affects ALL instances) ──

function User(name) {
  this.name = name;
}

User.prototype.permissions = ["read"]; // shared array on prototype

const user1 = new User("Rahul");
const user2 = new User("Priya");

user1.permissions.push("write"); // MUTATES the SHARED prototype array!
console.log(user2.permissions);  // ["read", "write"] — BUG! Priya got write access!

// FIX: initialize arrays in constructor (own property, not shared)
function UserFixed(name) {
  this.name = name;
  this.permissions = ["read"]; // each instance gets its OWN array
}


// ─── BUG 2: instanceof with multiple realms ───────────

// In Node.js, if you have two separate module instances,
// Array from one context !== Array from another
// Use Array.isArray() instead of instanceof Array for safety

// ─── BUG 3: Forgetting super() ───────────────────────

class Base {
  constructor(value) {
    this.value = value;
  }
}

class Derived extends Base {
  constructor(value, extra) {
    // this.extra = extra; // ReferenceError: Must call super before accessing 'this'
    super(value);          // Must call super FIRST
    this.extra = extra;    // Now 'this' is available
  }
}`,
    challenge: `// CHALLENGE: Build a simple OOP system for a fintech app

// Build these classes:
// 1. Account (base)
//    - constructor(id, owner, balance)
//    - deposit(amount)
//    - withdraw(amount) — throws if insufficient
//    - getStatement() — returns { id, owner, balance }

// 2. SavingsAccount extends Account
//    - constructor(id, owner, balance, interestRate)
//    - addInterest() — adds interest to balance
//    - withdraw(amount) — overrides: cannot go below 1000 minimum

// 3. LoanAccount extends Account
//    - constructor(id, owner, loanAmount, interestRate)
//    - balance should start as NEGATIVE (you owe money)
//    - makePayment(amount) — reduces debt
//    - getRemainingDebt()

// Requirements:
// - Use proper inheritance
// - Test polymorphism: call getStatement() on all three
// - Make sure SavingsAccount and LoanAccount don't break Account's interface`,
    summary: "Every JS object has a prototype chain. Classes are syntax sugar over prototype-based inheritance. When a property isn't found on an object, JS walks up the chain. Understanding this makes all class behavior obvious."
  },

  {
    id: 7,
    title: "Event Loop, Microtasks & Macrotasks",
    tag: "ASYNC UNDER THE HOOD",
    color: "#f472b6",
    tldr: "JS is single-threaded but handles async via the event loop. It runs synchronous code first, then microtasks (Promises), then macrotasks (setTimeout). Understanding this order is why async code behavior makes sense.",
    problem: `JS runs on a single thread — it can only do one thing at a time. But web apps need to handle network requests, timers, user events all simultaneously without freezing. The event loop is the mechanism that makes this possible. Without understanding it, async code order seems random and mysterious.`,
    analogy: `Imagine a BUSY DOCTOR's office:

The DOCTOR (JS thread) — can only see one patient at a time.
The WAITING ROOM (call stack) — who the doctor is currently seeing.
The APPOINTMENT BOOK (task queue/macrotasks) — scheduled appointments (setTimeout).
The URGENT CASES clipboard (microtask queue) — urgent cases that jump the line.

The doctor's workflow:
1. Finish seeing current patient (current synchronous code)
2. Check urgent cases clipboard FIRST (microtasks — Promises)
3. DRAIN all urgent cases before moving on
4. THEN check the next appointment (macrotask — setTimeout)
5. After that appointment, check urgent cases again
6. Repeat

This is why Promise.resolve() runs before setTimeout(0) —
Promises are urgent cases (microtasks), setTimeout is an appointment (macrotask).`,
    deep: `THE COMPONENTS:

CALL STACK: Where code executes. LIFO. Single-threaded.

WEB APIs / NODE APIs: Where async operations actually run (browser/Node handles them, not JS).
  - setTimeout, setInterval → browser timer
  - fetch → browser network
  - fs.readFile → Node I/O

MICROTASK QUEUE (higher priority):
  - Promise .then/.catch/.finally callbacks
  - queueMicrotask()
  - MutationObserver callbacks
  - async/await (which is Promise-based)

MACROTASK QUEUE (task queue, lower priority):
  - setTimeout callbacks
  - setInterval callbacks
  - I/O callbacks
  - UI rendering events

EVENT LOOP ALGORITHM:
  1. Execute all synchronous code (drain call stack)
  2. Execute ALL microtasks (drain entire queue)
  3. Execute ONE macrotask
  4. Execute ALL microtasks again
  5. Render (browser)
  6. Go to step 3`,
    code: `// ─── EXECUTION ORDER PUZZLE ──────────────────────────

console.log("1: Script start");

setTimeout(() => console.log("2: setTimeout"), 0);

Promise.resolve()
  .then(() => console.log("3: Promise 1"))
  .then(() => console.log("4: Promise 2"));

console.log("5: Script end");

// OUTPUT ORDER:
// "1: Script start"      — synchronous
// "5: Script end"        — synchronous
// "3: Promise 1"         — microtask (after all sync)
// "4: Promise 2"         — microtask (chained promise)
// "2: setTimeout"        — macrotask (after all microtasks)


// ─── REAL WORLD: API call sequence ────────────────────

console.log("App starting...");

// Macrotask — scheduled
setTimeout(() => {
  console.log("Health check ping");
}, 0);

// Microtask — promise
fetch("/api/user/profile")
  .then(res => res.json())
  .then(data => {
    console.log("User loaded:", data.name);
    // Any .then chained here is another microtask
    return fetch("/api/user/permissions"); // triggers new macrotask (network)
  })
  .then(res => res.json())
  .then(perms => console.log("Permissions loaded"));

console.log("App initialized");

// Order:
// "App starting..."        — sync
// "App initialized"        — sync
// (fetch starts in background via Web API)
// "Health check ping"      — macrotask (but network response may come first)
// "User loaded: ..."       — microtask after fetch resolves
// "Permissions loaded"     — microtask after second fetch


// ─── ASYNC/AWAIT IS JUST PROMISES ─────────────────────

// This:
async function getOrderData(orderId) {
  const order = await fetchOrder(orderId);
  const user = await fetchUser(order.userId);
  return { order, user };
}

// Is exactly this under the hood:
function getOrderDataPromise(orderId) {
  return fetchOrder(orderId)
    .then(order => {
      return fetchUser(order.userId)
        .then(user => ({ order, user }));
    });
}

// await pauses the async function and returns to the event loop.
// When the promise resolves, the continuation is queued as a microtask.


// ─── STARVING THE EVENT LOOP ──────────────────────────

// BAD: blocking the event loop with heavy sync computation
function processMillionRecords(records) {
  let result = 0;
  for (let i = 0; i < records.length; i++) {
    result += heavyComputation(records[i]); // synchronous, blocks everything
  }
  return result;
}
// While this runs: NO user input, NO network responses, NOTHING.
// The page freezes. The server can't handle new requests.

// FIX 1: Chunk the work with setTimeout (yield to event loop)
async function processInChunks(records, chunkSize = 1000) {
  let result = 0;
  for (let i = 0; i < records.length; i += chunkSize) {
    const chunk = records.slice(i, i + chunkSize);
    result += chunk.reduce((sum, r) => sum + heavyComputation(r), 0);

    // Yield to event loop between chunks
    await new Promise(resolve => setTimeout(resolve, 0));
  }
  return result;
}

// FIX 2: Use Web Workers for CPU-heavy tasks (separate thread)


// ─── MICROTASK QUEUE FLOODING ─────────────────────────

// Can microtasks starve macrotasks? YES.
function recursivePromise() {
  Promise.resolve().then(recursivePromise); // infinite microtask loop
  // macrotasks NEVER run — event loop is stuck draining microtasks
}
// Don't do this. It's the async equivalent of while(true).`,
    bugs: `// ─── BUG 1: Assuming setTimeout 0 = immediate ───────

let data = null;

setTimeout(() => {
  data = { user: "Rahul", role: "admin" };
}, 0);

if (data) {
  // NEVER reaches here — data is still null
  // setTimeout callback hasn't run yet (it's a macrotask)
  console.log(data.user);
}

// FIX: Work with the data inside the callback or use promises
setTimeout(() => {
  data = { user: "Rahul", role: "admin" };
  processData(data); // do work here
}, 0);


// ─── BUG 2: await in wrong place ─────────────────────

async function loadDashboard() {
  // BUG: these run sequentially when they could be parallel
  const user = await fetchUser();          // waits...
  const products = await fetchProducts();  // waits after user done
  const orders = await fetchOrders();      // waits after products done
  // Total time: user + products + orders (3x slower)

  // FIX: run all in parallel
  const [userP, productsP, ordersP] = await Promise.all([
    fetchUser(),
    fetchProducts(),
    fetchOrders()
  ]);
  // Total time: max(user, products, orders) — much faster
}


// ─── BUG 3: Unhandled promise rejection ─────────────

// This silently fails in older Node versions
fetch("/api/data")
  .then(res => res.json())
  .then(data => processData(data));
// If fetch fails, error is swallowed

// FIX: always handle errors
fetch("/api/data")
  .then(res => res.json())
  .then(data => processData(data))
  .catch(err => {
    console.error("Failed to load data:", err);
    showErrorToUser();
  });`,
    challenge: `// CHALLENGE 1: Predict the exact output order
// Write your answer before running

async function main() {
  console.log("A");

  setTimeout(() => console.log("B"), 0);

  const p = new Promise((resolve) => {
    console.log("C");
    resolve();
  });

  await p;
  console.log("D");

  setTimeout(() => console.log("E"), 0);

  console.log("F");
}

main();
console.log("G");

// Order: A, ?, ?, ?, ?, ?, ?


// CHALLENGE 2: Fix the performance issue
// This loads 100 user profiles sequentially — takes too long
async function loadAllProfiles(userIds) {
  const profiles = [];
  for (const id of userIds) {
    const profile = await fetchUserProfile(id); // sequential!
    profiles.push(profile);
  }
  return profiles;
}

// Rewrite it to fetch all profiles in parallel.
// Then rewrite it to fetch in batches of 10 (to avoid overwhelming the server).`,
    summary: "JS is single-threaded. The event loop handles async by queuing callbacks. Microtasks (Promises) always run before macrotasks (setTimeout). Blocking the event loop freezes everything."
  },

  {
    id: 8,
    title: "Promises & Async/Await",
    tag: "TAMING ASYNC",
    color: "#818cf8",
    tldr: "A Promise is a placeholder for a future value. async/await is clean syntax to work with Promises linearly. They exist to replace callback hell with readable, composable async code.",
    problem: `Before Promises, async operations required nested callbacks. Real apps had 5-6 levels of nesting — 'callback hell' or the 'pyramid of doom'. It was unreadable, untestable, and error handling was a nightmare. Promises introduced a chainable, composable way to handle async. async/await made it look synchronous.`,
    analogy: `You order food at a restaurant:

CALLBACK ERA: You wait AT the counter. The chef calls you directly when done.
Problem: Can't order from multiple places. Can't walk away. All orders must call you.

PROMISE ERA: You get a TOKEN (Promise).
- Token is PENDING while food is being made.
- Token RESOLVES when food is ready.
- Token REJECTS if they're out of ingredients.
You can walk away. Show the token when you want food.
Chain orders: "When food is ready → get drinks → get dessert."

ASYNC/AWAIT ERA: Same token, but you can now say:
"I'll wait here until my order is ready, then continue my tasks."
Looks like you're waiting inline, but you're not blocking the kitchen.

Promise.all = order from multiple counters, wait for ALL of them.
Promise.race = order from multiple counters, take whichever comes first.`,
    deep: `PROMISE STATES (never goes back):
  PENDING → neither fulfilled nor rejected
  FULFILLED → operation succeeded, has a value
  REJECTED → operation failed, has a reason

PROMISE METHODS:
  .then(onFulfilled, onRejected) → chains fulfilled callbacks
  .catch(onRejected) → handles rejection
  .finally(callback) → runs regardless of outcome
  Promise.all([...]) → wait for ALL, reject if ANY rejects
  Promise.allSettled([...]) → wait for ALL, report each outcome
  Promise.race([...]) → first one to settle wins
  Promise.any([...]) → first FULFILLED wins (ignores rejections)

async/await rules:
  - async function ALWAYS returns a Promise
  - await can ONLY be used inside async functions
  - await unwraps the Promise value
  - await pauses ONLY the async function (not the event loop)
  - Errors from awaited rejections can be caught with try/catch`,
    code: `// ─── PROMISE FROM SCRATCH ────────────────────────────

// This is what fetch() returns (conceptually)
function fetchUserProfile(userId) {
  return new Promise((resolve, reject) => {
    // Simulate async operation (DB query, API call)
    setTimeout(() => {
      if (userId <= 0) {
        reject(new Error("Invalid user ID"));
        return;
      }
      resolve({ id: userId, name: "Rahul", role: "developer" });
    }, 300);
  });
}


// ─── CALLBACK HELL vs PROMISES vs ASYNC/AWAIT ─────────

// CALLBACK HELL (old way):
getUserId(function(userId) {
  getProfile(userId, function(profile) {
    getPermissions(profile.role, function(permissions) {
      getAuditLog(userId, function(log) {
        renderDashboard(profile, permissions, log, function(result) {
          // 5 levels deep. Error handling at each level. Unreadable.
        });
      });
    });
  });
});

// PROMISE CHAIN:
getUserId()
  .then(userId => getProfile(userId))
  .then(profile => Promise.all([
    Promise.resolve(profile),
    getPermissions(profile.role)
  ]))
  .then(([profile, permissions]) => Promise.all([
    Promise.resolve(profile),
    Promise.resolve(permissions),
    getAuditLog(profile.id)
  ]))
  .then(([profile, permissions, log]) => renderDashboard(profile, permissions, log))
  .catch(err => handleError(err));

// ASYNC/AWAIT (cleanest):
async function loadDashboard() {
  try {
    const userId = await getUserId();
    const profile = await getProfile(userId);
    const [permissions, auditLog] = await Promise.all([
      getPermissions(profile.role),
      getAuditLog(userId)
    ]);

    return renderDashboard(profile, permissions, auditLog);
  } catch (err) {
    handleError(err);
  }
}


// ─── REAL WORLD: E-commerce order processing ──────────

class OrderService {
  async createOrder(userId, cartItems) {
    // Step 1: Validate everything in parallel
    const [user, stockCheck, paymentMethod] = await Promise.all([
      this.validateUser(userId),
      this.checkStock(cartItems),
      this.getPaymentMethod(userId)
    ]);

    if (!stockCheck.available) {
      throw new Error(\`Out of stock: \${stockCheck.items.join(", ")}\`);
    }

    // Step 2: Process payment
    const payment = await this.processPayment({
      userId,
      amount: this.calculateTotal(cartItems),
      method: paymentMethod
    });

    // Step 3: Create order (depends on payment)
    const order = await this.saveOrder({
      userId,
      items: cartItems,
      paymentId: payment.id,
      status: "confirmed"
    });

    // Step 4: Side effects in parallel (don't wait for these to respond to user)
    Promise.all([
      this.sendConfirmationEmail(user.email, order),
      this.updateInventory(cartItems),
      this.notifyWarehouse(order)
    ]).catch(err => this.logSideEffectError(err)); // handle separately

    return order;
  }
}


// ─── Promise.all vs Promise.allSettled vs Promise.race ─

const paymentGateways = ["razorpay", "paytm", "stripe"];

// Promise.all — ALL must succeed, ANY failure = total failure
async function chargeAll(amount) {
  try {
    const results = await Promise.all(
      paymentGateways.map(gw => chargeGateway(gw, amount))
    );
    return results;
  } catch (err) {
    // Even if 1 fails, we catch here — other 2 results lost
    console.error("One gateway failed:", err);
  }
}

// Promise.allSettled — get results of ALL regardless of outcome
async function checkAllGateways(amount) {
  const results = await Promise.allSettled(
    paymentGateways.map(gw => chargeGateway(gw, amount))
  );

  results.forEach((result, i) => {
    if (result.status === "fulfilled") {
      console.log(paymentGateways[i], "succeeded:", result.value);
    } else {
      console.log(paymentGateways[i], "failed:", result.reason);
    }
  });
}

// Promise.race — use fastest gateway (retry pattern)
async function fastestGateway(amount) {
  return Promise.race(
    paymentGateways.map(gw => chargeGateway(gw, amount))
  );
}

// Promise.any — first success (ignore failures until all fail)
async function firstSuccessfulGateway(amount) {
  try {
    return await Promise.any(
      paymentGateways.map(gw => chargeGateway(gw, amount))
    );
  } catch (err) {
    // AggregateError: all failed
    throw new Error("All payment gateways failed");
  }
}`,
    bugs: `// ─── BUG 1: Forgetting to return in .then() ─────────

fetchUser(id)
  .then(user => {
    fetchProfile(user.id); // BUG: not returned! Chain gets undefined
  })
  .then(profile => {
    console.log(profile); // undefined — because previous .then returned nothing
  });

// FIX:
fetchUser(id)
  .then(user => fetchProfile(user.id)) // return the promise!
  .then(profile => console.log(profile));


// ─── BUG 2: Sequential when parallel is possible ──────

async function loadUserData(userId) {
  const profile = await fetchProfile(userId);   // 300ms
  const orders = await fetchOrders(userId);     // 400ms
  const wishlist = await fetchWishlist(userId); // 200ms
  // Total: 900ms — sequential!
}

// FIX: parallel
async function loadUserDataFast(userId) {
  const [profile, orders, wishlist] = await Promise.all([
    fetchProfile(userId),
    fetchOrders(userId),
    fetchWishlist(userId)
  ]);
  // Total: ~400ms (max of the three)
}


// ─── BUG 3: try/catch not wrapping await ─────────────

async function saveData(data) {
  try {
    const result = validateData(data); // sync — throws if invalid
  } catch (syncErr) {
    console.error("Validation failed");
    return;
  }

  // BUG: this await is OUTSIDE the try/catch
  const saved = await database.save(data); // if this rejects — UNHANDLED!
  return saved;
}

// FIX: wrap all awaits in try/catch
async function saveDataFixed(data) {
  try {
    const result = validateData(data);
    const saved = await database.save(data);
    return saved;
  } catch (err) {
    console.error("Save failed:", err);
    throw err; // re-throw if caller needs to know
  }
}`,
    challenge: `// CHALLENGE: Build a resilient API fetcher

// Requirements:
// 1. fetchWithRetry(url, maxRetries = 3, delayMs = 1000)
//    - Fetches the URL
//    - If it fails, waits delayMs then retries
//    - After maxRetries, throws the last error
//    - On each retry, log: "Retry attempt X of Y"

// 2. fetchWithTimeout(url, timeoutMs = 5000)
//    - Fetches URL but rejects if it takes longer than timeoutMs
//    - Hint: use Promise.race() with a timeout promise

// 3. fetchWithFallback(primaryUrl, fallbackUrl)
//    - Tries primary URL first
//    - If primary fails, tries fallback
//    - If both fail, throws error with both failure messages

// Test them:
// fetchWithRetry("/api/flaky-endpoint", 3, 500)
// fetchWithTimeout("/api/slow-endpoint", 2000)
// fetchWithFallback("/api/primary", "/api/backup")`,
    summary: "Promises represent future values with 3 states. async/await is syntactic sugar over Promises. Use Promise.all for parallel, allSettled when you need all results, race for timeouts, any for first success."
  },

  {
    id: 9,
    title: "Destructuring & Spread/Rest",
    tag: "CLEAN CODE PATTERNS",
    color: "#2dd4bf",
    tldr: "Destructuring extracts values from arrays/objects cleanly. Spread copies/merges. Rest collects remaining items. Together they enable immutable data patterns and clean function signatures.",
    problem: `Before destructuring (ES6), extracting values from objects and arrays was verbose and repetitive. Before spread, merging objects required Object.assign() or loops. These patterns are everywhere in modern JS — React props, API responses, function parameters. Not knowing them deeply means you can't read or write modern code fluently.`,
    analogy: `DESTRUCTURING is like unpacking a delivery box:
Instead of: box.laptop, box.charger, box.manual
You say: "Give me laptop, charger, manual from this box"
const { laptop, charger, manual } = deliveryBox;

SPREAD is like emptying contents:
Spreading a box into a new box — copies everything.
Spreading two boxes into one — merges them.

REST is like saying "everything else":
"I want the laptop... and pack the REST back up."
const { laptop, ...everythingElse } = deliveryBox;

In finance: destructuring is like breaking down a P&L statement
into its components (revenue, expenses, profit) for individual use.`,
    deep: `DESTRUCTURING RULES:
  - Default values: const { name = "Anonymous" } = user
  - Renaming: const { name: userName } = user
  - Nested: const { address: { city } } = user
  - Array position: const [first, , third] = array (skip with comma)
  - Mixed: const { scores: [first, second] } = data

SPREAD OPERATOR (...) RULES:
  - Copies array: [...arr] — shallow copy
  - Merges arrays: [...arr1, ...arr2]
  - Copies object: {...obj} — shallow copy
  - Merges objects: {...obj1, ...obj2} — right side wins on conflict
  - Pass array as function args: fn(...args)
  - Order matters in object spread for overrides

REST PARAMETER RULES:
  - Must be LAST parameter
  - Only ONE rest parameter allowed
  - Collects remaining into a real Array (unlike arguments object)
  - Works in destructuring too: const [first, ...rest] = array`,
    code: `// ─── OBJECT DESTRUCTURING IN DEPTH ──────────────────

const apiResponse = {
  status: 200,
  data: {
    user: {
      id: "u_123",
      name: "Rahul Kumar",
      email: "rahul@techcorp.com",
      address: {
        city: "Mumbai",
        state: "Maharashtra",
        pincode: "400001"
      }
    },
    permissions: ["read", "write", "deploy"],
    metadata: { lastLogin: "2024-01-15", sessionCount: 42 }
  }
};

// Basic
const { status, data } = apiResponse;

// Renaming (when variable name conflicts or needs clarity)
const { status: httpStatus, data: responseData } = apiResponse;

// Nested destructuring
const { data: { user: { name, email, address: { city } } } } = apiResponse;
console.log(name, email, city); // "Rahul Kumar" "rahul@techcorp.com" "Mumbai"

// Default values (when property might not exist)
const { data: { user: { phone = "Not provided", role = "viewer" } } } = apiResponse;
console.log(phone); // "Not provided"
console.log(role);  // "viewer"


// ─── FUNCTION PARAMETERS — most common use case ───────

// Without destructuring — verbose
function createInvoice(options) {
  const customerId = options.customerId;
  const items = options.items;
  const discount = options.discount || 0;
  const currency = options.currency || "INR";
}

// With destructuring — clean, self-documenting
function createInvoiceClean({
  customerId,
  items,
  discount = 0,
  currency = "INR",
  taxRate = 0.18
}) {
  const subtotal = items.reduce((sum, item) => sum + item.price * item.qty, 0);
  const discounted = subtotal * (1 - discount);
  const tax = discounted * taxRate;

  return {
    customerId,
    subtotal,
    discount: subtotal * discount,
    tax,
    total: discounted + tax,
    currency
  };
}

createInvoiceClean({
  customerId: "c_456",
  items: [
    { name: "Laptop", price: 50000, qty: 1 },
    { name: "Mouse", price: 500, qty: 2 }
  ],
  discount: 0.1,
  currency: "INR"
});


// ─── SPREAD FOR IMMUTABLE UPDATES (React/Redux pattern) ─

const userState = {
  id: "u_123",
  name: "Rahul",
  settings: {
    theme: "dark",
    language: "en",
    notifications: true
  }
};

// WRONG: mutating state directly
userState.name = "Rahul Kumar";                   // mutates original
userState.settings.theme = "light";               // deep mutation

// RIGHT: spread creates new objects (immutable update)
const updatedUser = {
  ...userState,                                    // copy everything
  name: "Rahul Kumar"                              // override name
};

// Deep update (must spread nested too)
const updatedSettings = {
  ...userState,
  settings: {
    ...userState.settings,
    theme: "light"                                 // only change theme
  }
};

console.log(userState.name);          // "Rahul" — original unchanged
console.log(updatedUser.name);        // "Rahul Kumar"
console.log(userState.settings.theme); // "dark" — unchanged
console.log(updatedSettings.settings.theme); // "light"


// ─── REST IN FUNCTIONS ────────────────────────────────

// Collect any number of arguments
function logActivity(userId, action, ...metadata) {
  console.log(\`User \${userId} performed: \${action}\`);
  if (metadata.length > 0) {
    console.log("Additional data:", metadata);
  }
}

logActivity("u_123", "LOGIN");
// "User u_123 performed: LOGIN"

logActivity("u_123", "PURCHASE", { orderId: "o_456" }, { amount: 5000 }, { item: "Laptop" });
// "User u_123 performed: PURCHASE"
// "Additional data: [{ orderId: 'o_456' }, { amount: 5000 }, { item: 'Laptop' }]"


// ─── REST IN DESTRUCTURING ────────────────────────────

const { password, ...publicProfile } = {
  id: "u_123",
  name: "Rahul",
  email: "rahul@techcorp.com",
  password: "hashed_secret",
  role: "admin"
};

// Never send password to frontend
sendToClient(publicProfile);
// { id: "u_123", name: "Rahul", email: "rahul@techcorp.com", role: "admin" }


// ─── REAL WORLD: API response transformation ──────────

async function getUserProfile(userId) {
  const response = await fetch(\`/api/users/\${userId}\`);
  const { data: { user, permissions }, status } = await response.json();

  // Destructure and reshape for frontend
  const {
    id,
    name,
    email,
    avatar = "/default-avatar.png",
    settings: { theme = "light", language = "en" } = {}
  } = user;

  return {
    id,
    name,
    email,
    avatar,
    preferences: { theme, language },
    canEdit: permissions.includes("write"),
    canAdmin: permissions.includes("admin")
  };
}`,
    bugs: `// ─── BUG 1: Shallow copy with spread ─────────────────

const order = {
  id: "o_123",
  items: [{ name: "Laptop", qty: 1 }]  // nested array
};

const orderCopy = { ...order };

orderCopy.items.push({ name: "Mouse", qty: 2 }); // mutates ORIGINAL!
console.log(order.items.length); // 2 — BUG! original was modified

// Why? Spread is SHALLOW. orderCopy.items points to SAME array as order.items

// FIX for nested arrays/objects:
const deepCopy = {
  ...order,
  items: [...order.items]  // spread the nested array too
};


// ─── BUG 2: Spread order matters ─────────────────────

const defaults = { theme: "light", language: "en", notifications: true };
const userPrefs = { theme: "dark", fontSize: 14 };

// RIGHT: user prefs override defaults (user is last)
const merged = { ...defaults, ...userPrefs };
// { theme: "dark", language: "en", notifications: true, fontSize: 14 }

// WRONG: defaults would override user prefs (defaults is last)
const wrong = { ...userPrefs, ...defaults };
// { theme: "light", language: "en", notifications: true, fontSize: 14 }
// user's "dark" theme was overwritten!


// ─── BUG 3: Destructuring undefined ──────────────────

async function getConfig() {
  const response = await fetch("/api/config");
  const { settings: { apiUrl, timeout } } = await response.json();
  // BUG: if settings is null/undefined, this throws
  // TypeError: Cannot destructure property 'apiUrl' of undefined
}

// FIX: provide default for the nested object
async function getConfigFixed() {
  const response = await fetch("/api/config");
  const { settings: { apiUrl = "/api", timeout = 5000 } = {} } = await response.json();
  // = {} provides a fallback if settings is undefined
}`,
    challenge: `// CHALLENGE 1: Transform this API response for the frontend

const rawApiResponse = {
  success: true,
  data: {
    products: [
      { product_id: "p1", product_name: "Laptop", base_price: 50000, stock_qty: 10, category_name: "Electronics", is_active: true },
      { product_id: "p2", product_name: "Phone", base_price: 20000, stock_qty: 0, category_name: "Electronics", is_active: true },
      { product_id: "p3", product_name: "Desk", base_price: 8000, stock_qty: 5, category_name: "Furniture", is_active: false }
    ],
    pagination: { current_page: 1, total_pages: 5, per_page: 10 }
  }
};

// Using destructuring + spread + rest, transform it to:
// {
//   products: [
//     { id: "p1", name: "Laptop", price: 50000, inStock: true, category: "Electronics" },
//     ...  (only active products)
//   ],
//   pagination: { page: 1, totalPages: 5, perPage: 10 }
// }

// CHALLENGE 2: Write a mergeConfig function
// mergeConfig(defaults, userConfig, envConfig)
// - envConfig should override userConfig which overrides defaults
// - nested objects should be deep merged, not replaced
// - arrays should be concatenated (not replaced)`,
    summary: "Destructuring extracts values cleanly. Spread copies/merges shallowly. Rest collects remaining items. These enable immutable update patterns critical for React, Redux, and clean API transformations."
  },

  {
    id: 10,
    title: "Higher Order Functions — map, filter, reduce",
    tag: "FUNCTIONAL THINKING",
    color: "#fb7185",
    tldr: "Higher-order functions take functions as arguments or return functions. map transforms every item. filter keeps items that pass a test. reduce accumulates all items into one value. Together they replace most loops.",
    problem: `Traditional for loops mix the WHAT (iterate) with the HOW (transform/filter). They're verbose, stateful, and easy to mutate accidentally. Functional array methods separate concerns — you define what transformation to apply, and the method handles the iteration. The result is code that reads like plain English and is much harder to break.`,
    analogy: `Think of a FACTORY ASSEMBLY LINE:

map = TRANSFORMER STATION
Every product on the belt goes through.
Each one gets modified in the same way.
Belt in: [raw metal, raw metal, raw metal]
Belt out: [shaped part, shaped part, shaped part]

filter = QUALITY CONTROL STATION
Every product is inspected.
Only products that PASS go through.
Belt in: [good, defective, good, defective, good]
Belt out: [good, good, good]

reduce = FINAL ASSEMBLY STATION
All parts on the belt get combined into ONE finished product.
Belt in: [part1, part2, part3, part4]
Result: one complete product

In finance:
map → calculate tax on each transaction
filter → find only failed transactions
reduce → sum all transaction amounts into total revenue`,
    deep: `HOW THEY WORK:

map(callback):
  - Calls callback(item, index, array) for EVERY item
  - Returns a NEW array of the same length
  - Original array is UNCHANGED
  - If callback returns undefined, that element is undefined in new array

filter(callback):
  - Calls callback(item, index, array) for EVERY item
  - Keeps item if callback returns TRUTHY
  - Returns a NEW array (possibly shorter)
  - Original array is UNCHANGED

reduce(callback, initialValue):
  - Calls callback(accumulator, item, index, array) for EVERY item
  - accumulator starts as initialValue
  - Return value of callback becomes next accumulator
  - Returns SINGLE final accumulator value
  - If no initialValue, first item is accumulator, starts from index 1

KEY INSIGHT:
  map and filter can ALWAYS be implemented with reduce.
  reduce is the most powerful of the three.
  But use the most specific one for readability.`,
    code: `// ─── MAP: TRANSFORM EVERY ITEM ───────────────────────

const products = [
  { id: "p1", name: "Laptop", price: 50000, category: "Electronics" },
  { id: "p2", name: "Desk", price: 8000, category: "Furniture" },
  { id: "p3", name: "Phone", price: 20000, category: "Electronics" },
  { id: "p4", name: "Chair", price: 5000, category: "Furniture" }
];

// Add GST to all prices
const withGST = products.map(product => ({
  ...product,
  priceWithTax: product.price * 1.18,
  taxAmount: product.price * 0.18
}));

// Get just the names (transform objects to strings)
const productNames = products.map(p => p.name);
// ["Laptop", "Desk", "Phone", "Chair"]

// Transform for API response (rename fields, add computed values)
const apiProducts = products.map(({ id, name, price, category }) => ({
  productId: id,
  displayName: name.toUpperCase(),
  formattedPrice: \`₹\${price.toLocaleString("en-IN")}\`,
  categorySlug: category.toLowerCase()
}));


// ─── FILTER: KEEP ITEMS THAT PASS ─────────────────────

const transactions = [
  { id: "t1", amount: 5000, status: "success", type: "credit" },
  { id: "t2", amount: 2000, status: "failed", type: "debit" },
  { id: "t3", amount: 15000, status: "success", type: "credit" },
  { id: "t4", amount: 500, status: "pending", type: "debit" },
  { id: "t5", amount: 8000, status: "success", type: "debit" }
];

const successfulTransactions = transactions.filter(t => t.status === "success");
const highValueFailed = transactions.filter(t => t.status === "failed" && t.amount > 1000);
const credits = transactions.filter(t => t.type === "credit");

// Multiple conditions — readable chaining
const largeSuccessfulCredits = transactions
  .filter(t => t.status === "success")
  .filter(t => t.type === "credit")
  .filter(t => t.amount > 10000);
// [{ id: "t3", amount: 15000, status: "success", type: "credit" }]


// ─── REDUCE: ACCUMULATE INTO ONE VALUE ────────────────

// Sum all amounts
const totalAmount = transactions.reduce((sum, t) => sum + t.amount, 0);
// 30500

// Group by status
const groupedByStatus = transactions.reduce((groups, transaction) => {
  const { status } = transaction;
  if (!groups[status]) {
    groups[status] = [];
  }
  groups[status].push(transaction);
  return groups;
}, {});
// { success: [...], failed: [...], pending: [...] }

// Count by type
const countByType = transactions.reduce((counts, t) => ({
  ...counts,
  [t.type]: (counts[t.type] || 0) + 1
}), {});
// { credit: 2, debit: 3 }

// Build a lookup map (id → transaction)
const transactionMap = transactions.reduce((map, t) => ({
  ...map,
  [t.id]: t
}), {});
// { t1: {...}, t2: {...}, ... } — O(1) lookup by ID


// ─── REAL WORLD: Sales dashboard data ────────────────

const orders = [
  { id: "o1", userId: "u1", amount: 5000, product: "Laptop", status: "delivered", date: "2024-01" },
  { id: "o2", userId: "u2", amount: 500, product: "Mouse", status: "delivered", date: "2024-01" },
  { id: "o3", userId: "u1", amount: 20000, product: "Phone", status: "cancelled", date: "2024-02" },
  { id: "o4", userId: "u3", amount: 8000, product: "Desk", status: "delivered", date: "2024-02" },
  { id: "o5", userId: "u2", amount: 2000, product: "Keyboard", status: "delivered", date: "2024-02" }
];

// Total revenue from delivered orders only
const revenue = orders
  .filter(o => o.status === "delivered")
  .reduce((total, o) => total + o.amount, 0);
// 15500

// Revenue by month
const revenueByMonth = orders
  .filter(o => o.status === "delivered")
  .reduce((monthly, o) => ({
    ...monthly,
    [o.date]: (monthly[o.date] || 0) + o.amount
  }), {});
// { "2024-01": 5500, "2024-02": 10000 }

// Top customers (by total spend)
const customerSpend = orders
  .filter(o => o.status === "delivered")
  .reduce((spending, o) => ({
    ...spending,
    [o.userId]: (spending[o.userId] || 0) + o.amount
  }), {});

const topCustomers = Object.entries(customerSpend)
  .map(([userId, total]) => ({ userId, total }))
  .sort((a, b) => b.total - a.total);
// [{ userId: "u3", total: 8000 }, { userId: "u1", total: 5000 }, ...]


// ─── CHAINING FOR READABILITY ─────────────────────────

const report = orders
  .filter(o => o.status === "delivered")               // only delivered
  .filter(o => o.date.startsWith("2024-02"))            // only Feb
  .map(o => ({ ...o, amountWithTax: o.amount * 1.18 })) // add tax
  .sort((a, b) => b.amount - a.amount)                  // sort by amount desc
  .slice(0, 3)                                          // top 3
  .map(o => \`\${o.product}: ₹\${o.amount}\`);              // format for display

// ["Desk: ₹8000", "Keyboard: ₹2000"]`,
    bugs: `// ─── BUG 1: Forgetting reduce's initial value ────────

const amounts = [100, 200, 300];
amounts.reduce((sum, n) => sum + n);        // works: 600
[].reduce((sum, n) => sum + n);             // TypeError: Reduce of empty array
[].reduce((sum, n) => sum + n, 0);          // 0 — safe

// ALWAYS provide initialValue when the array might be empty


// ─── BUG 2: map when filter is needed (or vice versa) ─

const users = [
  { name: "Rahul", active: true },
  { name: "Priya", active: false }
];

// WRONG: using map to "filter"
const activeUsersBug = users.map(u => u.active ? u : null);
// [{ name: "Rahul", active: true }, null] — null pollutes the array

// RIGHT:
const activeUsers = users.filter(u => u.active);
// [{ name: "Rahul", active: true }]


// ─── BUG 3: Mutating inside map ───────────────────────

const inventory = [
  { id: "p1", stock: 10 },
  { id: "p2", stock: 0 }
];

// WRONG: mutating original objects inside map
const updated = inventory.map(item => {
  item.inStock = item.stock > 0; // mutates the original object!
  return item;
});

// RIGHT: return new objects
const updatedClean = inventory.map(item => ({
  ...item,
  inStock: item.stock > 0  // new property on new object
}));`,
    challenge: `// CHALLENGE: Build a complete reporting pipeline

const salesData = [
  { salesId: "s1", rep: "Rahul", region: "North", product: "CRM", amount: 50000, month: "Jan", closed: true },
  { salesId: "s2", rep: "Priya", region: "South", product: "ERP", amount: 120000, month: "Jan", closed: true },
  { salesId: "s3", rep: "Arjun", region: "North", product: "CRM", amount: 30000, month: "Feb", closed: false },
  { salesId: "s4", rep: "Rahul", region: "North", product: "ERP", amount: 80000, month: "Feb", closed: true },
  { salesId: "s5", rep: "Priya", region: "South", product: "CRM", amount: 45000, month: "Jan", closed: true },
  { salesId: "s6", rep: "Arjun", region: "East", product: "ERP", amount: 95000, month: "Feb", closed: true }
];

// Using ONLY map, filter, reduce (no for loops):

// Q1: Total closed revenue
// Expected: 390000

// Q2: Revenue by region (only closed deals)
// Expected: { North: 130000, South: 165000, East: 95000 }

// Q3: Top performing rep (by closed revenue)
// Expected: { rep: "Priya", total: 165000 }

// Q4: List of unique products
// Expected: ["CRM", "ERP"]

// Q5: Monthly summary — { month, totalDeals, closedDeals, revenue }
// Expected: [
//   { month: "Jan", totalDeals: 3, closedDeals: 3, revenue: 215000 },
//   { month: "Feb", totalDeals: 3, closedDeals: 2, revenue: 175000 }
// ]`,
    summary: "map transforms every item into something new. filter keeps items passing a test. reduce folds all items into one value. Chaining these three replaces most loops with readable, immutable data pipelines."
  }
];

const tagStyle = {
  "THE INVISIBLE ENGINE": "#00ff9d",
  "SCOPE & SAFETY": "#38bdf8",
  "THIS IS EVERYTHING": "#f59e0b",
  "MEMORY & POWER": "#c084fc",
  "CONTEXT IS EVERYTHING": "#fb923c",
  "HOW JS OOP ACTUALLY WORKS": "#34d399",
  "ASYNC UNDER THE HOOD": "#f472b6",
  "TAMING ASYNC": "#818cf8",
  "CLEAN CODE PATTERNS": "#2dd4bf",
  "FUNCTIONAL THINKING": "#fb7185"
};

function CodeBlock({ code }) {
  const [copied, setCopied] = useState(false);
  const copy = () => {
    navigator.clipboard.writeText(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };
  return (
    <div style={{ position: "relative", marginBottom: "24px" }}>
      <button onClick={copy} style={{
        position: "absolute", top: "10px", right: "10px",
        background: copied ? "#00ff9d22" : "#ffffff11",
        border: `1px solid ${copied ? "#00ff9d44" : "#333"}`,
        color: copied ? "#00ff9d" : "#666",
        padding: "4px 10px", borderRadius: "4px",
        fontSize: "10px", cursor: "pointer", letterSpacing: "1px",
        fontFamily: "monospace", zIndex: 1
      }}>
        {copied ? "COPIED" : "COPY"}
      </button>
      <pre style={{
        background: "#0d0d0d",
        border: "1px solid #1e1e1e",
        borderRadius: "10px",
        padding: "20px",
        overflowX: "auto",
        fontSize: "12px",
        lineHeight: "1.8",
        color: "#d4d4d4",
        fontFamily: "'IBM Plex Mono', monospace",
        margin: 0,
        whiteSpace: "pre-wrap",
        wordBreak: "break-word"
      }}>
        <code>{code}</code>
      </pre>
    </div>
  );
}

function Section({ label, color, children }) {
  return (
    <div style={{ marginBottom: "32px" }}>
      <div style={{
        fontSize: "9px", letterSpacing: "3px", textTransform: "uppercase",
        color: color, marginBottom: "14px", display: "flex", alignItems: "center", gap: "8px"
      }}>
        <span style={{ width: "20px", height: "1px", background: color, display: "inline-block" }} />
        {label}
      </div>
      {children}
    </div>
  );
}

export default function Phase1Guide() {
  const [selected, setSelected] = useState(null);
  const [completed, setCompleted] = useState({});
  const [tab, setTab] = useState("why");

  const concept = selected !== null ? concepts[selected] : null;
  const completedCount = Object.values(completed).filter(Boolean).length;

  const tabs = [
    { key: "why", label: "The WHY" },
    { key: "deep", label: "Deep Dive" },
    { key: "code", label: "Code" },
    { key: "bugs", label: "Bugs" },
    { key: "challenge", label: "Challenge" }
  ];

  return (
    <div style={{
      minHeight: "100vh",
      background: "#080808",
      color: "#e5e5e5",
      fontFamily: "'IBM Plex Mono', 'Courier New', monospace",
      display: "flex",
      flexDirection: "column"
    }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=IBM+Plex+Mono:ital,wght@0,300;0,400;0,500;0,600;1,400&family=Syne:wght@700;800;900&display=swap');
        * { box-sizing: border-box; }
        ::-webkit-scrollbar { width: 3px; height: 3px; }
        ::-webkit-scrollbar-thumb { background: #222; border-radius: 2px; }
        .concept-row:hover { background: rgba(255,255,255,0.03) !important; cursor: pointer; }
        .tab-btn:hover { color: #fff !important; }
        .nav-arrow:hover { background: rgba(255,255,255,0.08) !important; }
      `}</style>

      {/* Top bar */}
      <div style={{
        padding: "20px 32px",
        borderBottom: "1px solid #141414",
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center",
        flexWrap: "wrap",
        gap: "12px"
      }}>
        <div>
          <span style={{ fontSize: "9px", letterSpacing: "3px", color: "#444", textTransform: "uppercase" }}>
            Phase 1 of 5
          </span>
          <h1 style={{
            fontFamily: "'Syne', sans-serif",
            fontSize: "clamp(16px, 3vw, 24px)",
            fontWeight: 900,
            margin: "4px 0 0",
            color: "#fff",
            letterSpacing: "-0.5px"
          }}>
            JS Foundations — The WHY Layer
          </h1>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: "16px" }}>
          {concept && (
            <div style={{ display: "flex", gap: "6px" }}>
              <button className="nav-arrow" onClick={() => { setSelected(Math.max(0, selected - 1)); setTab("why"); }}
                style={{ background: "transparent", border: "1px solid #222", color: "#555", padding: "6px 12px", borderRadius: "6px", cursor: "pointer", fontSize: "12px" }}>
                ←
              </button>
              <button className="nav-arrow" onClick={() => { setSelected(Math.min(concepts.length - 1, selected + 1)); setTab("why"); }}
                style={{ background: "transparent", border: "1px solid #222", color: "#555", padding: "6px 12px", borderRadius: "6px", cursor: "pointer", fontSize: "12px" }}>
                →
              </button>
            </div>
          )}
          <div style={{ textAlign: "right" }}>
            <div style={{ fontSize: "11px", color: "#00ff9d" }}>{completedCount}/{concepts.length}</div>
            <div style={{ width: "100px", height: "2px", background: "#1a1a1a", borderRadius: "1px", marginTop: "4px" }}>
              <div style={{ width: `${(completedCount / concepts.length) * 100}%`, height: "100%", background: "#00ff9d", borderRadius: "1px", transition: "width 0.3s" }} />
            </div>
          </div>
        </div>
      </div>

      <div style={{ display: "flex", flex: 1, overflow: "hidden", minHeight: "calc(100vh - 80px)" }}>

        {/* Sidebar */}
        <div style={{
          width: concept ? "260px" : "100%",
          minWidth: concept ? "220px" : "auto",
          borderRight: concept ? "1px solid #141414" : "none",
          overflowY: "auto",
          padding: "20px 14px"
        }}>
          {!concept && (
            <div style={{ padding: "8px 16px 20px", fontSize: "12px", color: "#444", lineHeight: "1.7" }}>
              10 concepts. Each one has: the why, the deep dive, code with real examples, common bugs, and a challenge.
              <br /><br />
              Don't rush. One concept per day minimum.
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
                  padding: "12px 12px",
                  borderRadius: "8px",
                  background: selected === i ? "rgba(255,255,255,0.05)" : "transparent",
                  border: `1px solid ${selected === i ? c.color + "33" : "transparent"}`,
                  marginBottom: "3px",
                  transition: "all 0.15s"
                }}
              >
                <div style={{
                  width: "22px", height: "22px", minWidth: "22px",
                  borderRadius: "5px",
                  border: `1px solid ${done ? c.color : "#2a2a2a"}`,
                  background: done ? c.color + "22" : "transparent",
                  display: "flex", alignItems: "center", justifyContent: "center",
                  fontSize: done ? "11px" : "9px",
                  color: done ? c.color : "#333",
                  fontWeight: 600
                }}>
                  {done ? "✓" : i + 1}
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{
                    fontSize: "11px", fontWeight: 500,
                    color: selected === i ? "#fff" : (done ? "#555" : "#aaa"),
                    textDecoration: done ? "line-through" : "none",
                    lineHeight: "1.4",
                    marginBottom: "3px"
                  }}>
                    {c.title}
                  </div>
                  <div style={{ fontSize: "9px", color: c.color, opacity: 0.7, letterSpacing: "1px" }}>
                    {c.tag}
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Content area */}
        {concept && (
          <div style={{ flex: 1, overflowY: "auto", display: "flex", flexDirection: "column" }}>

            {/* Concept header */}
            <div style={{
              padding: "28px 32px 20px",
              borderBottom: "1px solid #141414",
              background: "#0a0a0a"
            }}>
              <div style={{ fontSize: "9px", letterSpacing: "3px", color: concept.color, marginBottom: "8px", textTransform: "uppercase" }}>
                {concept.tag}
              </div>
              <h2 style={{
                fontFamily: "'Syne', sans-serif",
                fontSize: "clamp(18px, 3vw, 30px)",
                fontWeight: 900,
                margin: "0 0 12px",
                color: "#fff",
                letterSpacing: "-0.5px"
              }}>
                {concept.title}
              </h2>
              <p style={{
                fontSize: "13px", color: "#888",
                margin: "0 0 20px",
                lineHeight: "1.8",
                maxWidth: "700px",
                borderLeft: `3px solid ${concept.color}44`,
                paddingLeft: "16px"
              }}>
                {concept.tldr}
              </p>

              {/* Tabs */}
              <div style={{ display: "flex", gap: "4px", flexWrap: "wrap" }}>
                {tabs.map(t => (
                  <button
                    key={t.key}
                    className="tab-btn"
                    onClick={() => setTab(t.key)}
                    style={{
                      background: tab === t.key ? concept.color + "18" : "transparent",
                      border: `1px solid ${tab === t.key ? concept.color + "55" : "#222"}`,
                      color: tab === t.key ? concept.color : "#555",
                      padding: "6px 14px",
                      borderRadius: "6px",
                      fontSize: "10px",
                      letterSpacing: "1.5px",
                      textTransform: "uppercase",
                      cursor: "pointer",
                      transition: "all 0.15s",
                      fontFamily: "inherit"
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
                <div>
                  <Section label="The Problem This Solves" color={concept.color}>
                    <p style={{ fontSize: "13px", color: "#aaa", lineHeight: "1.9", margin: 0 }}>
                      {concept.problem}
                    </p>
                  </Section>
                  <Section label="Real World Analogy" color={concept.color}>
                    <div style={{
                      background: "#0d0d0d",
                      border: "1px solid #1e1e1e",
                      borderRadius: "10px",
                      padding: "20px",
                      fontSize: "13px",
                      color: "#aaa",
                      lineHeight: "2",
                      whiteSpace: "pre-line"
                    }}>
                      {concept.analogy}
                    </div>
                  </Section>
                </div>
              )}

              {tab === "deep" && (
                <Section label="How It Works Under The Hood" color={concept.color}>
                  <div style={{
                    background: "#0d0d0d",
                    border: "1px solid #1e1e1e",
                    borderRadius: "10px",
                    padding: "20px",
                    fontSize: "12.5px",
                    color: "#aaa",
                    lineHeight: "2",
                    whiteSpace: "pre-line",
                    fontFamily: "'IBM Plex Mono', monospace"
                  }}>
                    {concept.deep}
                  </div>
                </Section>
              )}

              {tab === "code" && (
                <Section label="Code Examples — Real World" color={concept.color}>
                  <CodeBlock code={concept.code} />
                </Section>
              )}

              {tab === "bugs" && (
                <Section label="Common Bugs & How To Fix Them" color="#ef4444">
                  <CodeBlock code={concept.bugs} />
                </Section>
              )}

              {tab === "challenge" && (
                <div>
                  <Section label="Your Challenge — Write It Yourself" color="#f59e0b">
                    <div style={{
                      background: "#0d0d0d",
                      border: "1px solid #f59e0b22",
                      borderRadius: "10px",
                      padding: "16px 20px",
                      fontSize: "12px",
                      color: "#888",
                      lineHeight: "1.7",
                      marginBottom: "16px"
                    }}>
                      Don't look at previous tabs while solving. Write it from scratch. If you get stuck — look at the deep dive, not the code tab.
                    </div>
                    <CodeBlock code={concept.challenge} />
                  </Section>
                </div>
              )}

              {/* Summary + complete */}
              <div style={{
                marginTop: "32px",
                padding: "20px",
                background: `${concept.color}08`,
                border: `1px solid ${concept.color}22`,
                borderRadius: "10px",
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                gap: "16px",
                flexWrap: "wrap"
              }}>
                <div>
                  <div style={{ fontSize: "9px", letterSpacing: "2px", color: concept.color, marginBottom: "6px", textTransform: "uppercase" }}>
                    one line summary
                  </div>
                  <p style={{ fontSize: "12px", color: "#aaa", margin: 0, lineHeight: "1.7", maxWidth: "500px" }}>
                    {concept.summary}
                  </p>
                </div>
                <button
                  onClick={() => setCompleted(prev => ({ ...prev, [selected]: !prev[selected] }))}
                  style={{
                    padding: "10px 20px",
                    background: completed[selected] ? "transparent" : concept.color + "18",
                    border: `1px solid ${completed[selected] ? "#333" : concept.color + "55"}`,
                    borderRadius: "8px",
                    color: completed[selected] ? "#444" : concept.color,
                    fontSize: "10px",
                    letterSpacing: "2px",
                    textTransform: "uppercase",
                    cursor: "pointer",
                    transition: "all 0.2s",
                    fontFamily: "inherit",
                    whiteSpace: "nowrap"
                  }}
                >
                  {completed[selected] ? "✓ done" : "mark done"}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}