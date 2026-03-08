"use client"
import { useState, useEffect } from "react";


const concepts = [
  {
    id: 1,
    title: "Big-O & Complexity Analysis",
    tag: "Time · Space · Amortized",
    color: "#e8943a",
    tldr: "Big-O is not about being fast. It is about how your code degrades as input grows. O(n²) at n=100 is fine. At n=100,000 it crashes your server. Every performance bug in production traces back to a complexity problem that nobody analyzed.",
    why: `You write a function that works perfectly in development on 50 records. It works fine in staging on 500. It brings down production on 50,000. This is not a server problem. It is a complexity problem.

Big-O matters in backend development because:
  - A nested loop over database results is O(n²) — you won't notice until n gets large.
  - Using .includes() inside a loop is O(n²) — use a Set instead for O(n).
  - Sorting on every request when data rarely changes is wasteful.
  - Recursive functions without memoization can have exponential complexity.

The goal: before writing a solution, ask — as the input grows 10x, how does my code grow?
  O(1)       — constant: doesn't matter how big n is.
  O(log n)   — logarithmic: binary search. 1 billion → 30 steps.
  O(n)       — linear: one pass through data. Fine.
  O(n log n) — sort. Fine for most inputs.
  O(n²)      — quadratic: nested loops. Dangerous above n=10,000.
  O(2ⁿ)      — exponential: only for tiny inputs.

The practical rule: if n can exceed 10,000, you need better than O(n²).`,

    analogy: `SEARCHING A PHONE BOOK as complexity classes:

O(1) — Constant:
  You have the page number memorized.
  No matter if the book has 100 or 100 million names — same effort.
  Example: hash table lookup.

O(log n) — Logarithmic:
  Open the book to the middle. Is the name before or after?
  Go to the middle of the relevant half. Repeat.
  1,000,000 names → 20 steps maximum.
  Example: binary search.

O(n) — Linear:
  Read every single name from page 1 until you find it.
  1,000,000 names → up to 1,000,000 steps.
  Example: linear search through unsorted array.

O(n log n) — Linearithmic:
  Divide the book into halves, sort each half, merge them.
  1,000,000 names → ~20,000,000 steps.
  Example: merge sort.

O(n²) — Quadratic:
  For each name, compare it against every other name.
  1,000 names → 1,000,000 comparisons.
  10,000 names → 100,000,000 comparisons.
  Example: bubble sort, nested loops.

O(2ⁿ) — Exponential:
  For each name, try all possible subsets.
  40 names → 1,099,511,627,776 operations.
  Example: naive recursive fibonacci, subset generation.

AMORTIZED COMPLEXITY — the average over many operations:
  A dynamic array (like JavaScript Array) doubles in size when full.
  Most .push() operations: O(1).
  Occasional resize: O(n) (copying all elements).
  Amortized over n pushes: O(1) per push on average.
  This is why JavaScript arrays are fast even though they occasionally resize.

SPACE COMPLEXITY:
  Recursion uses stack space proportional to call depth.
  A recursive function that goes n levels deep: O(n) space.
  This is why deep recursion can stack overflow — space runs out, not time.`,

    deep: `COMPLEXITY ANALYSIS TOOLKIT:

RULE 1 — Drop constants:
  O(3n) = O(n). O(n/2) = O(n).
  Constants matter for performance tuning. Not for Big-O classification.

RULE 2 — Drop non-dominant terms:
  O(n² + n) = O(n²). The n term is irrelevant at scale.
  O(n + log n) = O(n).

RULE 3 — Sequential steps add:
  for loop: O(n)
  then another for loop: O(n)
  Total: O(n + n) = O(2n) = O(n)

RULE 4 — Nested steps multiply:
  outer loop: O(n)
    inner loop: O(m)
  Total: O(n × m)
  If m = n: O(n²)

RULE 5 — Recursion: draw the call tree:
  fibonacci(n) calls fibonacci(n-1) and fibonacci(n-2)
  Each call spawns 2 more. 2 levels deep: 4 calls. n levels: 2ⁿ calls.
  Complexity: O(2ⁿ) without memoization.
  With memoization: O(n) — each subproblem computed once.

COMMON COMPLEXITIES IN BACKEND CODE:
  Array access by index:        O(1)
  Array/String search (.indexOf):  O(n)
  Set/Map lookup:               O(1) average
  Object property access:       O(1) average
  Array sort (.sort()):         O(n log n)
  Array .includes() in a loop: O(n²) — use a Set
  String concatenation in loop: O(n²) — use array.join()
  Recursive fibonacci:          O(2ⁿ)
  Recursive fibonacci (memoized): O(n)
  Binary search:                O(log n)
  BFS/DFS on graph (V vertices, E edges): O(V + E)
  Merge sort:                   O(n log n)

RECOGNIZING COMPLEXITY IN BACKEND CODE:
  .filter().map().reduce() chained: O(3n) = O(n). Fine.
  .find() inside a .map(): O(n²). Use a Map to reduce to O(n).
  Nested database queries (N+1): O(n) queries. Use JOIN or batch.
  Recursive function without base case: infinite / O(∞).
  JSON.stringify on huge object: O(n) where n is number of keys/values.

SPACE COMPLEXITY TRAPS:
  Building an array in a loop: O(n) space — fine.
  Recursion depth n: O(n) stack space — can overflow for large n.
  Caching all results: O(n) space — tradeoff vs recomputing.
  Flat map of 2D array: O(n×m) space.

INTERVIEW PATTERN — how to analyze any function:
  1. What is n? (length of input, number of elements)
  2. Count the loops — nested? sequential?
  3. Check for recursion — draw a small call tree.
  4. Check for hidden O(n) operations inside loops (.includes, .indexOf, string +).
  5. State both time and space complexity.`,

    code: `// COMPLEXITY IN REAL BACKEND CODE ───────────────────

// PROBLEM: Find users who placed orders in the last 7 days
// (Common N+1 pattern disguised as clean code)

// O(n²) — WRONG ─────────────────────────────────────
async function getActiveUsersBad(users) {
  const activeUsers = [];
  for (const user of users) {            // O(n)
    const orders = await db.query(       // O(n) DB calls inside loop = O(n²) total
      "SELECT 1 FROM orders WHERE user_id = $1 AND created_at > NOW() - INTERVAL '7 days' LIMIT 1",
      [user.id]
    );
    if (orders.rows.length > 0) activeUsers.push(user);
  }
  return activeUsers;
  // 1,000 users = 1,001 DB queries. 10,000 users = 10,001 queries.
  // This kills production databases.
}

// O(n) — RIGHT ───────────────────────────────────────
async function getActiveUsersGood(users) {
  // ONE query to get all active user IDs
  const result = await db.query(
    "SELECT DISTINCT user_id FROM orders WHERE created_at > NOW() - INTERVAL '7 days'"
  );
  const activeIds = new Set(result.rows.map(r => r.user_id));  // O(n) to build, O(1) lookup

  return users.filter(u => activeIds.has(u.id));  // O(n) — single pass
  // Total: 2 DB queries regardless of how many users.
}


// O(n²) vs O(n) — find duplicates ───────────────────

// O(n²) — nested loop comparison
function findDuplicatesBad(arr) {
  const dupes = [];
  for (let i = 0; i < arr.length; i++) {          // O(n)
    for (let j = i + 1; j < arr.length; j++) {    // O(n) nested
      if (arr[i] === arr[j] && !dupes.includes(arr[i])) {  // .includes is O(n)!
        dupes.push(arr[i]);                        // Total: O(n³) !!!
      }
    }
  }
  return dupes;
}

// O(n) — use a hash set
function findDuplicatesGood(arr) {
  const seen  = new Set();
  const dupes = new Set();
  for (const val of arr) {          // single pass: O(n)
    if (seen.has(val)) dupes.add(val);  // O(1) set operations
    else seen.add(val);
  }
  return [...dupes];
  // Total: O(n) time, O(n) space. Tradeoff: uses more memory, dramatically faster.
}


// AMORTIZED ANALYSIS — dynamic array resizing ────────

class DynamicArray {
  constructor() {
    this.data     = new Array(1);
    this.length   = 0;
    this.capacity = 1;
  }

  push(item) {
    if (this.length === this.capacity) {
      this._resize();  // O(n) — rare
    }
    this.data[this.length] = item;
    this.length++;
    // Average (amortized): O(1) because resize happens exponentially less often
  }

  _resize() {
    this.capacity *= 2;
    const newData = new Array(this.capacity);
    for (let i = 0; i < this.length; i++) {
      newData[i] = this.data[i];  // copy all: O(n)
    }
    this.data = newData;
    // n pushes total: 1 + 2 + 4 + ... + n copies = 2n total work = O(1) amortized
  }

  get(index) {
    if (index < 0 || index >= this.length) throw new Error("Index out of bounds");
    return this.data[index];  // O(1)
  }
}


// MEMOIZATION — converting O(2ⁿ) to O(n) ────────────

// O(2ⁿ) — naive recursion
function fibBad(n) {
  if (n <= 1) return n;
  return fibBad(n - 1) + fibBad(n - 2);
  // fib(50): ~1 trillion recursive calls. Will hang Node.js.
}

// O(n) time, O(n) space — memoized
function fibMemo(n, memo = new Map()) {
  if (n <= 1) return n;
  if (memo.has(n)) return memo.get(n);  // O(1) lookup
  const result = fibMemo(n - 1, memo) + fibMemo(n - 2, memo);
  memo.set(n, result);
  return result;
  // Each value computed exactly once. 50 → 50 computations, not 1 trillion.
}

// O(n) time, O(1) space — bottom-up (best)
function fibDP(n) {
  if (n <= 1) return n;
  let prev = 0, curr = 1;
  for (let i = 2; i <= n; i++) {
    [prev, curr] = [curr, prev + curr];  // only keep last 2 values
  }
  return curr;
}


// COMPLEXITY COMPARISON TABLE (benchmark in your head):
// n = 1,000,000 (1 million inputs)
// O(1):         1 operation
// O(log n):     ~20 operations
// O(n):         1,000,000 operations        (~1ms)
// O(n log n):   ~20,000,000 operations      (~20ms)
// O(n²):        1,000,000,000,000 ops       → DO NOT USE
// O(2ⁿ):        unreachable in finite time`,

    bugs: `// BUG 1: Hidden O(n²) with .includes() inside a loop

function processOrdersBad(orders, blockedUserIds) {
  return orders.filter(order => {
    return !blockedUserIds.includes(order.userId);
    // blockedUserIds.includes() is O(m) where m = blockedUserIds.length
    // orders.filter() is O(n)
    // Total: O(n × m) — for 10k orders, 1k blocked users: 10,000,000 ops
  });
}

function processOrdersGood(orders, blockedUserIds) {
  const blockedSet = new Set(blockedUserIds);        // O(m) to build, O(1) lookup
  return orders.filter(order => !blockedSet.has(order.userId));  // O(n)
  // Total: O(n + m) instead of O(n × m)
  // Rule: if you check membership inside a loop, use a Set, not an Array.
}


// BUG 2: String concatenation in a loop — O(n²) hidden

function buildCsvBad(rows) {
  let csv = "";
  for (const row of rows) {
    csv += row.join(",") + "\\n";
    // Each += creates a NEW string (copies all previous chars) = O(n) per iteration
    // Total: O(1 + 2 + 3 + ... + n) = O(n²)
    // For 100k rows: 10 billion character copies
  }
  return csv;
}

function buildCsvGood(rows) {
  const lines = [];
  for (const row of rows) {
    lines.push(row.join(","));  // O(1) per push (amortized)
  }
  return lines.join("\\n");    // ONE string concatenation at the end: O(n)
  // Or use a stream for huge datasets.
}


// BUG 3: Sorting inside a loop (O(n² log n))

// Imagine: render a sorted list of comments each time a new one is added
function addCommentBad(comments, newComment) {
  comments.push(newComment);
  return comments.sort((a, b) => b.likes - a.likes);  // O(n log n) on every insert
  // If called n times: O(n² log n) total
}

// Fix: maintain sorted order on insert (O(n) per insert, O(n²) total but simpler)
// OR: sort once when needed (lazy evaluation)
// OR: use a sorted data structure (min-heap / balanced BST)

function addCommentGood(sortedComments, newComment) {
  // Binary search for insertion point: O(log n) to find, O(n) to insert (array shift)
  let lo = 0, hi = sortedComments.length;
  while (lo < hi) {
    const mid = (lo + hi) >> 1;
    if (sortedComments[mid].likes > newComment.likes) lo = mid + 1;
    else hi = mid;
  }
  sortedComments.splice(lo, 0, newComment);  // O(n) shift, but no re-sort
  return sortedComments;
}`,

    challenge: `// CHALLENGE: Complexity audit and optimization of a real API handler.

// The following code has 4 distinct complexity problems.
// For each: identify the complexity, explain why it is bad at scale,
// and provide the optimized version.

async function generateInvoiceReport(month, year) {
  const allUsers    = await db.query("SELECT * FROM users");             // returns all users
  const allOrders   = await db.query("SELECT * FROM orders");            // returns all orders
  const allProducts = await db.query("SELECT * FROM products");          // returns all products

  const report = [];

  for (const user of allUsers.rows) {                                    // Problem 1
    const userOrders = allOrders.rows.filter(o =>
      o.user_id === user.id &&
      new Date(o.created_at).getMonth() === month - 1 &&
      new Date(o.created_at).getFullYear() === year
    );

    if (userOrders.length === 0) continue;

    let total = 0;
    const lineItems = [];

    for (const order of userOrders) {                                    // Problem 2
      const items = JSON.parse(order.items);
      for (const item of items) {
        const product = allProducts.rows.find(p => p.id === item.productId);  // Problem 3
        lineItems.push({ product: product.name, qty: item.qty, price: product.price * item.qty });
        total += product.price * item.qty;
      }
    }

    const tag = report.find(r => r.userId === user.id);                  // Problem 4
    if (!tag) report.push({ userId: user.id, name: user.name, total, lineItems });
  }

  return report.sort((a, b) => b.total - a.total);
}

// For each problem:
// 1. State current complexity
// 2. State what it becomes at scale (1M users, 10M orders)
// 3. Provide the fixed version
// 4. State new complexity

// Bonus: rewrite the entire function optimally using a single SQL query.`
  },

  {
    id: 2,
    title: "Arrays & Strings",
    tag: "Two Pointers · Sliding Window · Hashing",
    color: "#e8943a",
    tldr: "Arrays and strings are the foundation of 60% of DSA problems. Two pointers eliminate nested loops. Sliding window solves all contiguous subarray/substring problems. Prefix sums convert range queries from O(n) to O(1). These three patterns alone unlock most medium-level problems.",
    why: `Arrays are the most common data structure in interviews AND in production code. The patterns you learn here apply directly:
  - Two pointers: merging sorted arrays, removing duplicates, pair-sum problems.
  - Sliding window: rate limiting windows, analytics over time ranges, moving averages.
  - Hashing: any "find matching/duplicate/most-frequent" problem.
  - Prefix sums: range aggregate queries, running totals.

The mental model shift: instead of reaching for nested loops, ask — can I use two pointers moving toward each other? Can I maintain a window as I scan? Can I precompute prefix sums?

That question alone transforms O(n²) solutions into O(n).`,

    analogy: `TWO POINTERS as SYNCHRONIZED READING:
  Problem: find two numbers in a sorted array that add to a target.
  Naive: try every pair — O(n²).
  Two pointers: start with one pointer at each end.
    If sum too small: move left pointer right (increase sum).
    If sum too large: move right pointer left (decrease sum).
    If equal: found it.
  Each pointer moves at most n steps. Total: O(n).
  Like two people reading a book from opposite ends, meeting in the middle.

SLIDING WINDOW as a TRAIN WINDOW:
  You're on a train, window shows 5 seats at a time.
  Problem: find the 5 consecutive seats with the most legroom.
  Naive: check every group of 5 from scratch — O(n×k).
  Sliding window: as window moves one seat right,
    subtract the seat that left, add the new seat.
  O(n) total — one pass, constant work per step.

HASHING as a PERSONAL ADDRESS BOOK:
  Problem: find which names in list A also appear in list B.
  Naive: for each name in A, search all of B — O(n×m).
  Hash: put all of B into a Set (O(m)). For each name in A, check Set (O(1)).
  Total: O(n+m). The Set is your address book — instant lookup.

PREFIX SUMS as RUNNING BANK BALANCE:
  Problem: sum of elements from index i to j, 1000 different queries.
  Naive: add up elements from i to j each time — O(n) per query.
  Prefix sum: precompute running totals: prefix[k] = sum of first k elements.
  Query: sum(i,j) = prefix[j+1] - prefix[i]. O(1) per query after O(n) setup.
  Like knowing your bank balance at every day and computing any date range instantly.`,

    deep: `TWO POINTER PATTERNS:

PATTERN 1 — Opposite ends (sorted array):
  left = 0, right = n-1
  while left < right: check condition, move left right or right left
  Use: pair sum, pair with difference k, container with most water

PATTERN 2 — Same direction (remove/filter):
  slow = 0 (write position), fast = 0 (read position)
  for each element: if it satisfies condition, write to slow position, advance slow
  Use: remove duplicates in-place, move zeros to end

PATTERN 3 — Merge (two sorted arrays):
  p1 = 0, p2 = 0
  while both have elements: compare, take smaller, advance that pointer
  Use: merge sorted arrays, merge k sorted lists (with heap)

SLIDING WINDOW PATTERNS:

FIXED SIZE WINDOW:
  Initialize: compute window[0..k-1]
  Slide: remove leftmost element, add new rightmost element
  Track: running sum/max/whatever
  Use: moving average, max sum subarray of size k

VARIABLE SIZE WINDOW (expand/shrink):
  right expands window one element at a time
  when condition violated: shrink from left until valid again
  Track: max/min window size seen
  Use: longest substring without repeats, smallest subarray with sum ≥ k
  Template:
    left = 0
    for right from 0 to n-1:
      add arr[right] to window
      while window violates condition:
        remove arr[left], left++
      update answer

HASHING PATTERNS:

COUNT FREQUENCY:
  freq = {}
  for x in arr: freq[x] = (freq[x] || 0) + 1
  Use: anagram check, most frequent element, group anagrams

TWO-SUM COMPLEMENT:
  seen = {}
  for x in arr: if (target - x) in seen: found pair
                else: seen[x] = index
  Use: two-sum, subarray sum = k (with prefix sums)

PREFIX SUM PATTERNS:
  prefix[0] = 0
  for i from 0 to n-1: prefix[i+1] = prefix[i] + arr[i]
  sum(i, j) = prefix[j+1] - prefix[i]

  Prefix sum + hash map: count subarrays with sum = k
  seen = {0: 1}  (empty prefix has sum 0)
  running = 0
  for x in arr:
    running += x
    count += seen[running - k] || 0
    seen[running] = (seen[running] || 0) + 1`,

    code: `// TWO POINTERS ───────────────────────────────────────

// Pattern 1: Pair sum in sorted array
function twoSum(sorted, target) {
  let left = 0, right = sorted.length - 1;
  while (left < right) {
    const sum = sorted[left] + sorted[right];
    if (sum === target)  return [sorted[left], sorted[right]];
    if (sum < target)    left++;   // need bigger sum — move left pointer right
    else                 right--;  // need smaller sum — move right pointer left
  }
  return null;
}

// Pattern 2: Remove duplicates from sorted array in-place
function removeDuplicates(arr) {
  if (arr.length === 0) return 0;
  let slow = 0;
  for (let fast = 1; fast < arr.length; fast++) {
    if (arr[fast] !== arr[slow]) {
      slow++;
      arr[slow] = arr[fast];  // write pointer advances only on unique element
    }
    // fast always advances — reads everything
    // slow only advances when it writes a unique element
  }
  return slow + 1;  // length of deduplicated array
}

// Pattern 3: Container with most water
function maxWater(heights) {
  let left = 0, right = heights.length - 1, max = 0;
  while (left < right) {
    const water = Math.min(heights[left], heights[right]) * (right - left);
    max = Math.max(max, water);
    // Move the shorter side — moving the taller one can only decrease or keep water same
    if (heights[left] < heights[right]) left++;
    else right--;
  }
  return max;
}


// SLIDING WINDOW ──────────────────────────────────────

// Fixed window: max sum subarray of size k
function maxSumSubarray(arr, k) {
  let windowSum = 0;
  for (let i = 0; i < k; i++) windowSum += arr[i];  // build first window

  let maxSum = windowSum;
  for (let i = k; i < arr.length; i++) {
    windowSum += arr[i] - arr[i - k];  // slide: add new element, remove old
    maxSum = Math.max(maxSum, windowSum);
  }
  return maxSum;
}

// Variable window: longest substring without repeating characters
function longestUniqueSubstring(s) {
  const charIndex = new Map();  // char → most recent index seen
  let left = 0, maxLen = 0;

  for (let right = 0; right < s.length; right++) {
    const c = s[right];
    // If we've seen this char inside current window: shrink from left past it
    if (charIndex.has(c) && charIndex.get(c) >= left) {
      left = charIndex.get(c) + 1;  // jump left past the duplicate
    }
    charIndex.set(c, right);
    maxLen = Math.max(maxLen, right - left + 1);
  }
  return maxLen;
}

// Variable window: minimum window substring
function minWindowSubstring(s, t) {
  const need = new Map();
  for (const c of t) need.set(c, (need.get(c) || 0) + 1);

  let have = 0, required = need.size;
  let left = 0, minLen = Infinity, minStart = 0;
  const window = new Map();

  for (let right = 0; right < s.length; right++) {
    const c = s[right];
    window.set(c, (window.get(c) || 0) + 1);
    if (need.has(c) && window.get(c) === need.get(c)) have++;

    while (have === required) {
      if (right - left + 1 < minLen) { minLen = right - left + 1; minStart = left; }
      const lc = s[left];
      window.set(lc, window.get(lc) - 1);
      if (need.has(lc) && window.get(lc) < need.get(lc)) have--;
      left++;
    }
  }
  return minLen === Infinity ? "" : s.slice(minStart, minStart + minLen);
}


// HASHING ─────────────────────────────────────────────

// Group anagrams: strings with same characters together
function groupAnagrams(words) {
  const map = new Map();
  for (const w of words) {
    const key = w.split("").sort().join("");  // sorted chars = canonical anagram key
    if (!map.has(key)) map.set(key, []);
    map.get(key).push(w);
  }
  return [...map.values()];
  // O(n × k log k) where k = max word length
}

// Two sum (unsorted)
function twoSumHash(nums, target) {
  const seen = new Map();  // value → index
  for (let i = 0; i < nums.length; i++) {
    const complement = target - nums[i];
    if (seen.has(complement)) return [seen.get(complement), i];
    seen.set(nums[i], i);
  }
  return [];
}


// PREFIX SUMS ─────────────────────────────────────────

// Build prefix sum array
function buildPrefix(arr) {
  const prefix = new Array(arr.length + 1).fill(0);
  for (let i = 0; i < arr.length; i++) prefix[i + 1] = prefix[i] + arr[i];
  return prefix;
}

// Range sum query: O(1) per query after O(n) preprocessing
function rangeSum(prefix, left, right) {
  return prefix[right + 1] - prefix[left];
}

// Count subarrays with sum equal to k
function subarraySum(nums, k) {
  const seen = new Map([[0, 1]]);  // running sum → count of times seen
  let running = 0, count = 0;
  for (const n of nums) {
    running += n;
    // If (running - k) was seen before: subarray between then and now sums to k
    count += seen.get(running - k) || 0;
    seen.set(running, (seen.get(running) || 0) + 1);
  }
  return count;
}


// REAL BACKEND USAGE — rate limit window ─────────────
// Sliding window rate limiter (in-memory, for illustration)

class SlidingWindowCounter {
  constructor(limit, windowMs) {
    this.limit    = limit;
    this.windowMs = windowMs;
    this.users    = new Map();  // userId → array of timestamps
  }

  isAllowed(userId) {
    const now  = Date.now();
    const cutoff = now - this.windowMs;

    if (!this.users.has(userId)) this.users.set(userId, []);
    const times = this.users.get(userId);

    // Remove timestamps outside window (two-pointer style: shrink from left)
    while (times.length > 0 && times[0] < cutoff) times.shift();

    if (times.length >= this.limit) return false;
    times.push(now);
    return true;
  }
}`,

    bugs: `// BUG 1: Off-by-one in sliding window boundary

function maxSumWindowBad(arr, k) {
  let windowSum = 0;
  for (let i = 0; i <= k; i++) windowSum += arr[i];  // BUG: should be i < k
  // Initializes window of size k+1, not k.
  // For k=3, arr=[1,2,3,4,5]: sums arr[0..3] = 10 instead of arr[0..2] = 6.
  let max = windowSum;
  for (let i = k + 1; i < arr.length; i++) {         // BUG: should start at k
    windowSum += arr[i] - arr[i - k];
    max = Math.max(max, windowSum);
  }
  return max;
}

function maxSumWindowGood(arr, k) {
  let windowSum = 0;
  for (let i = 0; i < k; i++) windowSum += arr[i];   // exactly k elements: indices 0..k-1
  let max = windowSum;
  for (let i = k; i < arr.length; i++) {              // start from index k
    windowSum += arr[i] - arr[i - k];                 // add new right: arr[k], remove old left: arr[0]
    max = Math.max(max, windowSum);
  }
  return max;
}


// BUG 2: Two-pointer on unsorted array

function hasPairWithSumBad(arr, target) {
  let left = 0, right = arr.length - 1;
  while (left < right) {
    const sum = arr[left] + arr[right];
    if (sum === target) return true;
    if (sum < target) left++;
    else right--;
  }
  return false;
  // BUG: two-pointer only works on SORTED arrays!
  // [3, 1, 4, 2], target=5: answer is true (1+4 or 3+2)
  // Two pointers: 3+2=5 → found. Lucky here.
  // [1, 3, 2, 4], target=5: 1+4=5 → found. But:
  // [2, 4, 1, 3], target=5: 2+3=5 → found.
  // [4, 2, 3, 1], target=5: 4+1=5 → true.
  // Seems to work by chance but fails on: [10, 3, 1, 6], target=9: 10+6=16→right--, 10+1=11→right--, 10+3=13→right-- then left>right → false. But 3+6=9 exists! MISSED IT.
}

function hasPairWithSumGood(arr, target) {
  const sorted = [...arr].sort((a, b) => a - b);  // sort first: O(n log n)
  let left = 0, right = sorted.length - 1;
  while (left < right) {
    const sum = sorted[left] + sorted[right];
    if (sum === target) return true;
    if (sum < target) left++;
    else right--;
  }
  return false;
  // OR use hash set for O(n) without sorting:
  // const seen = new Set();
  // for (const n of arr) { if (seen.has(target - n)) return true; seen.add(n); }
}


// BUG 3: Forgetting the empty-string/empty-array edge cases

function longestSubstringBad(s) {
  const map = new Map();
  let left = 0, max = 0;
  for (let right = 0; right < s.length; right++) {
    // Fine for non-empty strings.
    // Called with s = "": loop never runs, returns 0. OK actually.
    // Called with s = null: s.length throws TypeError.
    const c = s[right];
    if (map.has(c) && map.get(c) >= left) left = map.get(c) + 1;
    map.set(c, right);
    max = Math.max(max, right - left + 1);
  }
  return max;
}

function longestSubstringGood(s) {
  if (!s || s.length === 0) return 0;  // guard clause
  const map = new Map();
  let left = 0, max = 0;
  for (let right = 0; right < s.length; right++) {
    const c = s[right];
    if (map.has(c) && map.get(c) >= left) left = map.get(c) + 1;
    map.set(c, right);
    max = Math.max(max, right - left + 1);
  }
  return max;
}`,

    challenge: `// CHALLENGE: Implement all core patterns from scratch.

// Part 1: Two Pointers
//   a) sortedSquares(arr): given sorted array (may have negatives),
//      return array of squares in sorted order. O(n) — no sorting allowed after squaring.
//   b) threeSum(arr): find all unique triplets that sum to 0. O(n²).
//   c) trappingRainWater(heights): how much water is trapped between bars. O(n).

// Part 2: Sliding Window
//   a) maxVowels(s, k): max vowels in any substring of length k. O(n).
//   b) longestSubarrayWithOnesAfterDeletion(arr): longest subarray of 1s
//      after deleting exactly one element. O(n).
//   c) longestRepeatingCharReplacement(s, k): longest substring where
//      you can replace at most k characters to make all same. O(n).

// Part 3: Hashing
//   a) topKFrequent(nums, k): return k most frequent elements. O(n log k).
//   b) longestConsecutiveSequence(nums): longest sequence of consecutive ints. O(n).
//   c) isValidSudoku(board): validate a 9x9 sudoku board. O(1) (fixed size).

// Part 4: Prefix Sums
//   a) productExceptSelf(nums): for each index, product of all other elements.
//      No division allowed. O(n).
//   b) maxSubarraySum(nums): maximum sum of any contiguous subarray (Kadane's). O(n).
//   c) numSubarraysWithSum(nums, goal): count subarrays that sum to goal. O(n).

// For each solution: state time and space complexity before writing the code.`
  },

  {
    id: 3,
    title: "Hash Maps & Sets",
    tag: "O(1) Lookup · Frequency · Grouping",
    color: "#e8943a",
    tldr: "Hash maps are the single most powerful tool for turning O(n²) into O(n). If you find yourself searching an array inside a loop, stop and ask: can I preload this into a hash map? The answer is almost always yes, and it almost always drops your complexity by a factor of n.",
    why: `Hash maps (JavaScript's Map and Object, Python's dict) are the Swiss Army knife of DSA. They solve:
  - Any "find matching pair" problem: two-sum, four-sum, pair with difference k.
  - Any "count/frequency" problem: most common element, anagram check, first non-repeating.
  - Any "grouping" problem: group anagrams, isomorphic strings.
  - Any "seen before" problem: detect cycle, first duplicate, valid parentheses.
  - Cache/memoization: store computed results to avoid recomputation.

The mental model: whenever you need to answer "have I seen X before?" or "how many times have I seen X?", a hash map gives you that answer in O(1).

The collision handling, load factor, and amortized O(1) guarantee are important to understand for interviews and for knowing when hash maps degrade to O(n).`,

    analogy: `A HASH MAP as an INFINITE FILING CABINET:
  Every drawer is labeled with a number (the hash).
  You convert your key ("user_123") to a drawer number using a formula (the hash function).
  You open that specific drawer: O(1) — no searching.
  You store or retrieve the value in that drawer.

  COLLISION: two keys hash to the same drawer number.
  Solution 1 — Separate chaining: each drawer holds a linked list of (key, value) pairs.
    Check each pair in the list for exact key match.
    If only a few collisions: still nearly O(1).
    Worst case (all keys collide): O(n) — like a single drawer with everything.
  Solution 2 — Open addressing: if drawer is full, try next drawer.

  LOAD FACTOR: how full the cabinet is.
  If cabinet is 70% full: too many collisions, performance degrades.
  When load factor exceeds threshold (~0.75): RESIZE — double the cabinet size, rehash all keys.
  This is why Map operations are amortized O(1), not strictly O(1).

  HASH FUNCTION quality matters:
  A bad hash function puts everything in drawer #1: O(n) lookups.
  A good hash function distributes keys uniformly: O(1) lookups.
  JavaScript's V8 engine uses highly optimized hash functions for strings and integers.

  JavaScript Map vs Object:
  Object: keys must be strings or symbols.
  Map: keys can be any value (objects, functions, primitives).
  Map: maintains insertion order. Object: not guaranteed (though modern JS usually does).
  Map: .size property. Object: Object.keys(o).length.
  For DSA: use Map for correctness and clarity.`,

    deep: `HASH MAP INTERNALS (simplified):

  HASH FUNCTION:
  Takes a key (any type), returns an integer (the bucket index).
  For strings: sum of character codes × prime, modulo bucket count.
  For integers: the integer itself modulo bucket count.
  For objects: memory address (this is why two different objects with same content are different keys).

  BUCKET COUNT:
  Usually a power of 2 or a prime number.
  Prime numbers reduce patterns in hash function modulo operations.

  RESIZE:
  When entries / buckets > 0.75 (load factor threshold):
  Create new array with double the buckets.
  Re-hash all existing entries into new buckets.
  This is O(n) but happens rarely — amortized O(1).

  AMORTIZED ANALYSIS:
  n insertions with occasional O(n) resize.
  Total work: n + n/2 + n/4 + ... = 2n (geometric series).
  Per insertion: 2n/n = O(1) amortized.

  WHEN HASH MAPS DEGRADE:
  Hash collision attack: attacker crafts keys that all hash to bucket 0.
  HashMap becomes a linked list: O(n) lookups.
  Defense: randomized hash seeds (JavaScript's V8 does this by default).

  PRACTICAL LIMITS:
  Map in V8: up to ~16 million entries before memory pressure.
  Set lookup: O(1) average. Never use Array.includes() when Set.has() is available.
  Deletion from Map: O(1) amortized.
  Iteration: O(n) — you visit every entry.

COMMON PATTERNS:

  FREQUENCY MAP:
  const freq = new Map();
  for (const x of arr) freq.set(x, (freq.get(x) || 0) + 1);

  TWO-SUM PATTERN:
  const seen = new Map();  // value → index
  for (let i = 0; i < nums.length; i++) {
    if (seen.has(target - nums[i])) return [seen.get(target - nums[i]), i];
    seen.set(nums[i], i);
  }

  LRU CACHE (Map preserves insertion order):
  Use Map: most recent access → delete and re-insert → goes to end.
  Least recently used → first key in Map.
  get(key): if exists, delete + re-insert (move to MRU end). O(1).
  put(key, val): insert (if over capacity, delete first key). O(1).`,

    code: `// CORE HASH MAP PATTERNS ─────────────────────────────

// Frequency counter
function frequencyMap(arr) {
  const freq = new Map();
  for (const x of arr) freq.set(x, (freq.get(x) || 0) + 1);
  return freq;
}

// Most frequent element
function mostFrequent(arr) {
  const freq = frequencyMap(arr);
  let maxCount = 0, result = null;
  for (const [val, count] of freq) {
    if (count > maxCount) { maxCount = count; result = val; }
  }
  return result;
}

// Isomorphic strings: can s be mapped to t by consistent char substitution?
function isIsomorphic(s, t) {
  if (s.length !== t.length) return false;
  const sToT = new Map(), tToS = new Map();
  for (let i = 0; i < s.length; i++) {
    const sc = s[i], tc = t[i];
    if ((sToT.has(sc) && sToT.get(sc) !== tc) ||
        (tToS.has(tc) && tToS.get(tc) !== sc)) return false;
    sToT.set(sc, tc);
    tToS.set(tc, sc);
  }
  return true;
}


// LRU CACHE — the classic Map-based O(1) implementation ─

class LRUCache {
  constructor(capacity) {
    this.capacity = capacity;
    this.cache    = new Map();  // Map preserves insertion order — key insight
  }

  get(key) {
    if (!this.cache.has(key)) return -1;
    const val = this.cache.get(key);
    // Move to end (most recently used): delete + re-insert
    this.cache.delete(key);
    this.cache.set(key, val);
    return val;
  }

  put(key, value) {
    if (this.cache.has(key)) this.cache.delete(key);  // remove to re-insert at end
    this.cache.set(key, value);
    if (this.cache.size > this.capacity) {
      // Delete LRU: first key in Map (oldest insertion)
      const lruKey = this.cache.keys().next().value;
      this.cache.delete(lruKey);
    }
  }
}
// Used in: Redis eviction policy, HTTP cache, CDN caching, memoization.


// FIRST NON-REPEATING CHARACTER ───────────────────────

function firstUnique(s) {
  const freq = new Map();
  for (const c of s) freq.set(c, (freq.get(c) || 0) + 1);
  for (const c of s) { if (freq.get(c) === 1) return c; }
  return null;
  // Two passes through s. O(n) time, O(k) space where k = alphabet size.
}


// LONGEST CONSECUTIVE SEQUENCE ────────────────────────

function longestConsecutive(nums) {
  const set = new Set(nums);  // O(n) build, O(1) lookup
  let best = 0;

  for (const n of set) {
    // Only start counting from the beginning of a sequence
    if (!set.has(n - 1)) {
      let curr = n, length = 1;
      while (set.has(curr + 1)) { curr++; length++; }
      best = Math.max(best, length);
    }
  }
  return best;
  // O(n): each element is visited at most twice (once in outer loop, once in inner).
  // The "only start if n-1 not in set" check ensures we never start a chain from the middle.
}


// VALID PARENTHESES (stack + hash map) ────────────────

function isValidParentheses(s) {
  const pairs = new Map([[")","("], ["]","["], ["}","{"]]);
  const stack = [];
  for (const c of s) {
    if (!pairs.has(c)) { stack.push(c); continue; }  // it's an opener
    if (stack.length === 0 || stack[stack.length - 1] !== pairs.get(c)) return false;
    stack.pop();
  }
  return stack.length === 0;
}


// SUBARRAY SUM EQUALS K (prefix sum + hash map) ───────

function subarraySum(nums, k) {
  // seen[x] = number of times prefix sum x has been seen
  const seen = new Map([[0, 1]]);  // prefix sum of 0 seen once (before any elements)
  let running = 0, count = 0;
  for (const n of nums) {
    running += n;
    // How many previous prefix sums were (running - k)?
    // Those subarrays between then and now sum to exactly k.
    count += seen.get(running - k) || 0;
    seen.set(running, (seen.get(running) || 0) + 1);
  }
  return count;
}


// REAL BACKEND: Cache-aside pattern using Map ─────────

class UserCache {
  constructor(ttlMs = 60000) {
    this.cache = new Map();   // userId → { data, expiresAt }
    this.ttl   = ttlMs;
  }

  get(userId) {
    const entry = this.cache.get(userId);
    if (!entry) return null;
    if (Date.now() > entry.expiresAt) { this.cache.delete(userId); return null; }
    return entry.data;
  }

  set(userId, data) {
    this.cache.set(userId, { data, expiresAt: Date.now() + this.ttl });
    // Simple eviction: if cache grows too large, clear oldest 20%
    if (this.cache.size > 10000) {
      let evict = Math.floor(this.cache.size * 0.2);
      for (const key of this.cache.keys()) {
        if (evict-- <= 0) break;
        this.cache.delete(key);
      }
    }
  }

  invalidate(userId) { this.cache.delete(userId); }
}`,

    bugs: `// BUG 1: Using object instead of Map for non-string keys

function groupByLength(words) {
  const groups = {};
  for (const w of words) {
    const len = w.length;  // numeric key
    if (!groups[len]) groups[len] = [];
    groups[len].push(w);
  }
  return groups;
  // Seems fine. Problem: numeric keys become strings in objects.
  // groups[1] and groups["1"] are the same key.
  // Mostly harmless with numbers. But consider:
  const m1 = {}, m2 = {};
  m1[{}] = "a"; m1[{}] = "b";
  // Both {} hash to "[object Object]" as a string key — collision!
  // Object keys are always strings/symbols. Two different objects become the same key.
}

function groupByLengthGood(words) {
  const groups = new Map();
  for (const w of words) {
    const len = w.length;
    if (!groups.has(len)) groups.set(len, []);
    groups.get(len).push(w);
  }
  return groups;
  // Map: keys are compared by identity/value, not string coercion.
  // Safe for any key type.
}


// BUG 2: Mutating a Map while iterating it

function removeExpiredBad(cache) {
  for (const [key, val] of cache) {
    if (val.expiresAt < Date.now()) {
      cache.delete(key);  // modifying the Map you're iterating over
      // Behavior is defined in JavaScript (unlike some languages)
      // but still considered bad practice and can cause subtle bugs
      // in environments or implementations that handle it differently.
    }
  }
}

function removeExpiredGood(cache) {
  const toDelete = [];
  for (const [key, val] of cache) {
    if (val.expiresAt < Date.now()) toDelete.push(key);
  }
  for (const key of toDelete) cache.delete(key);
  // Collect first, then delete. Clear intent, no mutation during iteration.
}


// BUG 3: Forgetting that Map.get returns undefined, not 0

function countCharsBAD(s) {
  const freq = {};
  for (const c of s) {
    freq[c]++;  // freq[c] is undefined on first occurrence: undefined + 1 = NaN
  }
  return freq;
}

function countCharsBetter(s) {
  const freq = new Map();
  for (const c of s) {
    freq.set(c, freq.get(c) + 1);
    //            ^^^^^^^^^ undefined + 1 = NaN! Same bug with Map.get.
  }
  return freq;
}

function countCharsGood(s) {
  const freq = new Map();
  for (const c of s) {
    freq.set(c, (freq.get(c) || 0) + 1);  // (undefined || 0) = 0
    // Or: freq.set(c, (freq.get(c) ?? 0) + 1);  // nullish coalescing — handles 0 correctly
  }
  return freq;
}`,

    challenge: `// CHALLENGE: Implement hash-map-based solutions for these problems.
// State time and space complexity before each solution.

// Part 1: Core patterns
//   a) twoSumAllPairs(nums, target): return ALL pairs (not just one) that sum to target.
//      No pair counted twice. O(n).
//   b) wordFrequencyTopK(text, k): given a paragraph string, return k most frequent words.
//      Ignore punctuation, case-insensitive. O(n log k).
//   c) groupAnagramsII(words): group strings that are anagrams. Return groups sorted by size desc.

// Part 2: Advanced patterns
//   a) longestSubarrayWithAtMostKDistinctChars(s, k): longest substring with at most k
//      distinct characters. O(n).
//   b) fourSum(nums, target): find all unique quadruplets summing to target. O(n³).
//   c) smallestWindowContainingAllChars(s, t): minimum window in s containing all chars of t.

// Part 3: LRU Cache extension
//   Build LRUCacheWithTTL:
//   - get(key): returns value or -1. Accessing refreshes TTL.
//   - put(key, value, ttlMs): store with per-entry TTL.
//   - Expired entries are evicted lazily on access AND proactively every 30 seconds.
//   - getStats(): { size, hits, misses, evictions }

// Part 4: Design problem
//   Design a TimeMap (time-based key-value store):
//   - set(key, value, timestamp): store value at given timestamp.
//   - get(key, timestamp): return the value with the largest timestamp <= given timestamp.
//     Return "" if none exists.
//   Operations called in increasing timestamp order.
//   Target: O(1) set, O(log n) get.`
  },

  {
    id: 4,
    title: "Linked Lists",
    tag: "Pointers · Reversal · Cycle Detection",
    color: "#e8943a",
    tldr: "Linked lists are about pointer manipulation. Every hard linked list problem becomes easy once you internalize: draw it first, move the pointers step by step, always handle null. Slow/fast pointers detect cycles and find midpoints. Dummy head nodes eliminate edge cases. Three-pointer reversal rewires any list.",
    why: `Linked lists appear in:
  - Interview problems at every company (medium-difficulty staple).
  - Implementing LRU cache (Map + doubly linked list = O(1) operations).
  - OS memory allocation (free list is a linked list).
  - Database buffer pool management.
  - Undo/redo history in editors.

The skill being tested is not "do you know what a linked list is" but "can you manipulate pointers without losing track of nodes?" The pointer manipulation mindset — keeping references before you overwrite them — transfers to many other problems.

The patterns:
  - Dummy head: eliminates special cases for empty list or head modifications.
  - Slow/fast pointers: find middle, detect cycle, find cycle start.
  - Reversal: three pointers (prev, curr, next), always draw before coding.
  - Merge sorted lists: classic two-pointer merge.`,

    analogy: `A LINKED LIST as a TREASURE HUNT:
  Each clue (node) tells you: your value AND where the next clue is.
  You start at clue 1 (head). Follow the chain.
  Last clue points to null — the treasure (end of list).

  ACCESS BY INDEX: O(n).
  To read clue #50: must read clues 1 through 49 first.
  Unlike arrays: no direct address arithmetic.

  INSERTION/DELETION: O(1) if you have the node.
  To insert a clue between clue A and clue B:
  New clue points to B. A now points to new clue.
  Two pointer reassignments. No shifting (unlike arrays).

  REVERSAL — the lock and key problem:
  You have: A → B → C → D → null
  You want: D → C → B → A → null
  Problem: when you change A's pointer to null, you lose B.
  Solution: save B before changing A's pointer.
  Three-pointer technique: prev=null, curr=A, next=B
    1. Save next = curr.next
    2. Point curr.next = prev (reverse the pointer)
    3. Move prev = curr
    4. Move curr = next
  Repeat until curr is null. prev is now the new head.

  CYCLE DETECTION — Floyd's algorithm (tortoise and hare):
  Two runners on the list. Slow: 1 step at a time. Fast: 2 steps.
  If there's a cycle: fast laps slow — they must meet inside the cycle.
  If no cycle: fast reaches null.
  Why they always meet: in a cycle of length L, fast gains 1 step per iteration.
  They meet within L iterations — O(n) total.

  Finding cycle START:
  After meeting: reset slow to head. Keep fast at meeting point.
  Both move 1 step at a time. They meet at cycle start.
  (Mathematical proof: distance from head to cycle start = distance from meeting point to cycle start)`,

    deep: `PATTERNS IN DETAIL:

DUMMY HEAD:
  When a problem might modify the head node, create a dummy node that points to head.
  Return dummy.next at the end.
  Eliminates: "if head is null", "if we're removing the head", "if list is empty" checks.
  Example: remove nth from end — dummy head simplifies boundary conditions.

SLOW/FAST POINTER USE CASES:
  Find middle: slow moves 1, fast moves 2.
    When fast reaches end: slow is at middle.
    Even length: slow at second of two middles.
  Detect cycle: fast and slow — if they meet: cycle exists.
  Find cycle start: after detection, reset slow to head, both move 1 step.
  Find kth from end: advance fast k steps first. Then move both at same pace.
    When fast reaches end: slow is kth from end.

REVERSAL APPLICATIONS:
  Palindrome check: reverse second half, compare with first half.
  Reorder list: split in half, reverse second half, merge alternating.
  Reverse in groups of k: reverse each group, connect groups.

MERGE SORTED LISTS:
  Two pointers, one per list. Always take the smaller head.
  Use dummy head to simplify.
  O(n + m) where n, m are list lengths.

MERGE K SORTED LISTS:
  Naive: merge two at a time — O(nk²).
  Better: use a min-heap. Always take the minimum.
  Add each list's head to heap. Remove min, add that node's next.
  O(n log k) where n = total nodes, k = number of lists.`,

    code: `// NODE CLASS ──────────────────────────────────────────
class ListNode {
  constructor(val, next = null) { this.val = val; this.next = next; }
}

// Helper: array to linked list
function toList(arr) {
  const dummy = new ListNode(0);
  let curr = dummy;
  for (const v of arr) { curr.next = new ListNode(v); curr = curr.next; }
  return dummy.next;
}

// Helper: linked list to array
function toArray(head) {
  const res = [];
  while (head) { res.push(head.val); head = head.next; }
  return res;
}


// REVERSAL — the three-pointer dance ─────────────────
function reverseList(head) {
  let prev = null, curr = head;
  while (curr) {
    const next = curr.next;  // 1. save next (crucial — we're about to overwrite curr.next)
    curr.next  = prev;       // 2. reverse the pointer
    prev       = curr;       // 3. advance prev
    curr       = next;       // 4. advance curr
  }
  return prev;  // prev is the new head (last node of original list)
}

// Recursive reversal (elegant, but O(n) stack space)
function reverseListRec(head) {
  if (!head || !head.next) return head;
  const newHead = reverseListRec(head.next);  // reverse the rest
  head.next.next = head;   // the node after current should now point BACK to current
  head.next      = null;   // current's next becomes null (it's the new tail)
  return newHead;
}

// Reverse in groups of k
function reverseKGroup(head, k) {
  const dummy = new ListNode(0); dummy.next = head;
  let groupPrev = dummy;

  while (true) {
    const kth = getKth(groupPrev, k);  // find the kth node from groupPrev
    if (!kth) break;
    const groupNext = kth.next;

    // Reverse group
    let prev = groupNext, curr = groupPrev.next;
    while (curr !== groupNext) {
      const next = curr.next;
      curr.next = prev;
      prev = curr; curr = next;
    }
    const tmp = groupPrev.next;
    groupPrev.next = kth;
    groupPrev = tmp;
  }
  return dummy.next;
}

function getKth(curr, k) {
  while (curr && k > 0) { curr = curr.next; k--; }
  return curr;
}


// SLOW/FAST POINTERS ─────────────────────────────────

// Find middle of linked list
function findMiddle(head) {
  let slow = head, fast = head;
  while (fast && fast.next) {
    slow = slow.next;
    fast = fast.next.next;
  }
  return slow;  // at middle (second middle for even-length)
}

// Detect cycle (Floyd's algorithm)
function hasCycle(head) {
  let slow = head, fast = head;
  while (fast && fast.next) {
    slow = slow.next;
    fast = fast.next.next;
    if (slow === fast) return true;  // node identity comparison (===)
  }
  return false;
}

// Find cycle start
function detectCycleStart(head) {
  let slow = head, fast = head;
  // Phase 1: detect
  while (fast && fast.next) {
    slow = slow.next; fast = fast.next.next;
    if (slow === fast) break;
  }
  if (!fast || !fast.next) return null;  // no cycle

  // Phase 2: find start — reset slow to head, keep fast at meeting point
  slow = head;
  while (slow !== fast) { slow = slow.next; fast = fast.next; }
  return slow;  // they meet at the cycle start
}

// Kth from end (one pass)
function nthFromEnd(head, k) {
  const dummy = new ListNode(0); dummy.next = head;
  let fast = dummy, slow = dummy;
  for (let i = 0; i <= k; i++) fast = fast.next;  // advance fast k+1 steps
  while (fast) { slow = slow.next; fast = fast.next; }
  return slow.next;  // slow.next is the kth from end
}


// MERGE SORTED LISTS ─────────────────────────────────

function mergeTwoSorted(l1, l2) {
  const dummy = new ListNode(0);
  let curr = dummy;
  while (l1 && l2) {
    if (l1.val <= l2.val) { curr.next = l1; l1 = l1.next; }
    else                  { curr.next = l2; l2 = l2.next; }
    curr = curr.next;
  }
  curr.next = l1 || l2;  // attach remaining
  return dummy.next;
}

// Merge k sorted lists using a min-heap
class MinHeap {
  constructor() { this.heap = []; }
  push(node) {
    this.heap.push(node);
    let i = this.heap.length - 1;
    while (i > 0) {
      const parent = (i - 1) >> 1;
      if (this.heap[parent].val <= this.heap[i].val) break;
      [this.heap[parent], this.heap[i]] = [this.heap[i], this.heap[parent]];
      i = parent;
    }
  }
  pop() {
    const top = this.heap[0];
    const last = this.heap.pop();
    if (this.heap.length > 0) {
      this.heap[0] = last;
      let i = 0;
      while (true) {
        let smallest = i;
        const l = 2*i+1, r = 2*i+2;
        if (l < this.heap.length && this.heap[l].val < this.heap[smallest].val) smallest = l;
        if (r < this.heap.length && this.heap[r].val < this.heap[smallest].val) smallest = r;
        if (smallest === i) break;
        [this.heap[smallest], this.heap[i]] = [this.heap[i], this.heap[smallest]];
        i = smallest;
      }
    }
    return top;
  }
  size() { return this.heap.length; }
}

function mergeKSorted(lists) {
  const heap = new MinHeap();
  for (const head of lists) if (head) heap.push(head);
  const dummy = new ListNode(0); let curr = dummy;
  while (heap.size() > 0) {
    const node = heap.pop();
    curr.next = node; curr = curr.next;
    if (node.next) heap.push(node.next);
  }
  return dummy.next;
}


// PALINDROME LINKED LIST ──────────────────────────────
function isPalindrome(head) {
  const mid      = findMiddle(head);
  const reversed = reverseList(mid);
  let   l = head, r = reversed;
  while (r) {
    if (l.val !== r.val) return false;
    l = l.next; r = r.next;
  }
  return true;
  // Note: modifies the list. In interviews: often acceptable. In prod: restore after checking.
}`,

    bugs: `// BUG 1: Losing the reference to next before overwriting

function reverseListBad(head) {
  let prev = null, curr = head;
  while (curr) {
    curr.next = prev;   // BUG: overwrites curr.next without saving it first
    prev      = curr;
    curr      = curr.next;  // curr.next is now prev (already reversed!) — wrong
    // Correct: curr = next where next was saved before the overwrite
  }
  return prev;
}

function reverseListGood(head) {
  let prev = null, curr = head;
  while (curr) {
    const next = curr.next;  // SAVE first
    curr.next  = prev;       // then overwrite
    prev       = curr;
    curr       = next;       // use saved value
  }
  return prev;
}


// BUG 2: Off-by-one in fast pointer initialization for kth from end

function kthFromEndBad(head, k) {
  let fast = head, slow = head;
  for (let i = 0; i < k; i++) fast = fast.next;  // advance fast k steps
  while (fast.next) {          // stop when fast.next is null
    slow = slow.next;
    fast = fast.next;
  }
  return slow;
  // BUG: if k equals the length of the list, fast becomes null after the loop.
  // Then fast.next throws: Cannot read property 'next' of null.
  // Edge case: remove the head (k = length).
}

function kthFromEndGood(head, k) {
  const dummy = new ListNode(0); dummy.next = head;
  let fast = dummy, slow = dummy;
  for (let i = 0; i < k + 1; i++) {
    fast = fast.next;
    if (!fast) throw new Error("k exceeds list length");
  }
  while (fast) { slow = slow.next; fast = fast.next; }
  return slow.next;
  // Using dummy node: when fast is null, slow.next is the kth from end.
  // k = length: slow stays at dummy, slow.next = head = correct answer.
}


// BUG 3: Infinite loop when cycle detection stops incorrectly

function hasCycleBad(head) {
  let slow = head, fast = head.next;  // BUG: fast starts one ahead
  while (fast && fast.next) {
    if (slow === fast) return true;
    slow = slow.next;
    fast = fast.next.next;
  }
  return false;
  // For a list of length 2 with a cycle back to head:
  // Start: slow=head, fast=head.next
  // Iteration 1: slow=head.next, fast=head (wrapped via cycle)
  // Iteration 2: slow=head, fast=head.next
  // They never converge — infinite loop!
}

function hasCycleGood(head) {
  let slow = head, fast = head;  // BOTH start at head
  while (fast && fast.next) {
    slow = slow.next;
    fast = fast.next.next;
    if (slow === fast) return true;  // check AFTER moving
  }
  return false;
}`,

    challenge: `// CHALLENGE: Implement these linked list problems from scratch.
// Draw the pointer movements before writing code for each one.

// Part 1: Core operations
//   a) addTwoNumbers(l1, l2): each list represents a number in reverse digit order.
//      Return sum as linked list. Handle carry. (e.g., 342 + 465 = 807)
//   b) removeNthFromEnd(head, n): one pass only. O(n) time, O(1) space.
//   c) swapPairs(head): swap every two adjacent nodes (not values, actual nodes).

// Part 2: Reorder and restructure
//   a) reorderList(head): reorder L0→Ln→L1→Ln-1→L2→Ln-2→...
//      In-place, do not modify values. (split at middle, reverse second half, merge alternating)
//   b) oddEvenList(head): group all nodes at odd indices first, then even indices.
//      Maintain relative order within each group. O(n) time, O(1) space.
//   c) flattenMultilevelDoublyLinkedList(head): each node may have a child
//      pointer to another doubly linked list. Flatten into single-level list.

// Part 3: Cycle problems
//   a) Given a linked list, return the node where the cycle starts (or null).
//      Must use O(1) space. Implement both phases of Floyd's algorithm with
//      written explanation of WHY the math works.

// Part 4: LRU Cache
//   Implement LRUCache without using JavaScript's Map (use your own doubly linked list + hash map):
//   - DoublyLinkedList with insertFront, removeNode, removeLast operations
//   - HashMap: key → node
//   - get(key): move node to front, return value
//   - put(key, value): add to front, evict last if over capacity
//   All operations: O(1).
//   Explain why you need both a DLL and a HashMap (what each structure provides).`
  },

  {
    id: 5,
    title: "Trees & Binary Search",
    tag: "BST · DFS · BFS · Recursion",
    color: "#e8943a",
    tldr: "Trees are recursive structures. Every tree problem either uses DFS (go deep first — understand a subtree before moving on) or BFS (level by level — process all nodes at same depth first). Master these two traversals and you can solve 80% of tree problems. Binary search is a generalization of the same idea.",
    why: `Trees appear everywhere in software:
  - File systems (directory tree).
  - Database B-trees (indexes).
  - DOM (the HTML you render).
  - JSON parsing (AST — abstract syntax tree).
  - Decision trees in ML.
  - Network routing (spanning trees).

Interview-wise, tree problems are the most common medium-difficulty category after arrays. Understanding DFS and BFS deeply means you can handle:
  - BST validation, insertion, deletion.
  - Level order traversal (BFS).
  - Path sum problems (DFS).
  - Lowest common ancestor.
  - Serialize/deserialize a tree.
  - Balance checking.

Binary search is the same idea applied to a sorted space: eliminate half the search space at each step.`,

    analogy: `A TREE as an ORGANIZATIONAL HIERARCHY:
  CEO (root) has direct reports.
  Each direct report has their own team (subtrees).
  Leaves: individual contributors — no direct reports.

  DFS — diving deep into one branch:
  Walk the org chart by: go down one chain as far as possible (to a leaf),
  then backtrack and try the next branch.
  Like doing a deep-dive interview with the CEO's entire left division
  before moving to the right division.

  BFS — breadth first, level by level:
  Interview the CEO. Then all VPs. Then all directors. Then all managers.
  Level by level. Use a queue: add a person's direct reports when you meet them.

  RECURSION for trees — the key insight:
  Any subtree looks exactly like the full tree.
  A tree is: a root + left subtree + right subtree.
  Every tree function can be expressed as: "solve for the root, recursively solve for left and right subtrees."
  Example: height of tree = 1 + max(height(left), height(right)).

  BST PROPERTY:
  For any node: all values in left subtree < node's value < all values in right subtree.
  Search: at each node, if target < value go left; if target > value go right. O(log n) in balanced tree.
  Inorder traversal of BST gives sorted values — extremely useful.

  BINARY SEARCH as BST navigation:
  Sorted array is like a perfectly balanced BST "flattened".
  Mid element is the root. Left half is left subtree. Right half is right subtree.
  Searching: go left (lo..mid-1) or right (mid+1..hi) based on comparison.`,

    deep: `DFS TRAVERSAL ORDERS:

PREORDER (Root → Left → Right):
  Visit root, then left subtree, then right subtree.
  Use: copy a tree, serialize a tree, prefix expression.
  Pattern: process node BEFORE recursive calls.

INORDER (Left → Root → Right):
  Visit left subtree, then root, then right subtree.
  On a BST: visits nodes in sorted order.
  Use: get sorted values from BST, kth smallest in BST.
  Pattern: process node BETWEEN recursive calls.

POSTORDER (Left → Right → Root):
  Visit left subtree, right subtree, then root.
  Use: delete a tree (delete children before parent), calculate expression values.
  Pattern: process node AFTER recursive calls (bottom-up).

BFS (LEVEL ORDER):
  Uses a queue. Visit all nodes at depth k before any at depth k+1.
  Use: shortest path in unweighted tree, level averages, zigzag traversal.
  Pattern: enqueue root, process until queue empty:
    node = dequeue()
    process(node)
    if node.left: enqueue(node.left)
    if node.right: enqueue(node.right)

BST OPERATIONS:
  Search: O(log n) balanced, O(n) worst (skewed).
  Insert: O(log n) average. Find correct leaf position, insert.
  Delete: O(log n). Three cases:
    1. Leaf: just remove.
    2. One child: replace node with child.
    3. Two children: replace with inorder successor (smallest in right subtree), delete successor.

BINARY SEARCH TEMPLATE:
  lo = 0, hi = n - 1
  while lo <= hi:
    mid = lo + ((hi - lo) >> 1)  // avoid overflow (vs (lo+hi)/2)
    if arr[mid] === target: return mid
    if arr[mid] < target: lo = mid + 1
    else: hi = mid - 1
  return -1  // not found

  FIND LEFTMOST (first occurrence):
  when arr[mid] === target: save mid, then hi = mid - 1 (keep searching left)

  FIND RIGHTMOST (last occurrence):
  when arr[mid] === target: save mid, then lo = mid + 1 (keep searching right)

  BINARY SEARCH ON ANSWER (powerful generalization):
  When: you need to find the minimum/maximum value that satisfies a condition.
  Binary search on the answer space, not the array.
  Example: "minimum capacity such that k workers can finish in d days"
  Check(capacity): can all work be done with this capacity? O(n).
  Binary search on capacity from min to max.`,

    code: `// TREE NODE ───────────────────────────────────────────
class TreeNode {
  constructor(val, left = null, right = null) { this.val = val; this.left = left; this.right = right; }
}


// DFS TRAVERSALS ─────────────────────────────────────

// Recursive (clean, natural)
function inorder(root, result = []) {
  if (!root) return result;
  inorder(root.left, result);
  result.push(root.val);
  inorder(root.right, result);
  return result;
}

// Iterative inorder (avoids stack overflow for deep trees)
function inorderIterative(root) {
  const result = [], stack = [];
  let curr = root;
  while (curr || stack.length > 0) {
    while (curr) { stack.push(curr); curr = curr.left; }  // go left as far as possible
    curr = stack.pop();
    result.push(curr.val);  // process node
    curr = curr.right;       // then go right
  }
  return result;
}


// BFS — LEVEL ORDER ──────────────────────────────────

function levelOrder(root) {
  if (!root) return [];
  const result = [], queue = [root];
  while (queue.length > 0) {
    const levelSize = queue.length;  // number of nodes at current level
    const level = [];
    for (let i = 0; i < levelSize; i++) {
      const node = queue.shift();  // Note: use shift() here; for production use a proper queue class
      level.push(node.val);
      if (node.left)  queue.push(node.left);
      if (node.right) queue.push(node.right);
    }
    result.push(level);
  }
  return result;
}

// Right-side view (last node of each level)
function rightSideView(root) {
  if (!root) return [];
  const result = [], queue = [root];
  while (queue.length > 0) {
    const size = queue.length;
    for (let i = 0; i < size; i++) {
      const node = queue.shift();
      if (i === size - 1) result.push(node.val);  // last node of this level
      if (node.left)  queue.push(node.left);
      if (node.right) queue.push(node.right);
    }
  }
  return result;
}


// CORE TREE PROBLEMS ─────────────────────────────────

// Maximum depth / height
function maxDepth(root) {
  if (!root) return 0;
  return 1 + Math.max(maxDepth(root.left), maxDepth(root.right));
}

// Diameter (longest path through any node)
function diameterOfBinaryTree(root) {
  let diameter = 0;
  function depth(node) {
    if (!node) return 0;
    const l = depth(node.left), r = depth(node.right);
    diameter = Math.max(diameter, l + r);  // path through this node
    return 1 + Math.max(l, r);             // return depth upward
  }
  depth(root);
  return diameter;
}

// Validate BST
function isValidBST(root, min = -Infinity, max = Infinity) {
  if (!root) return true;
  if (root.val <= min || root.val >= max) return false;
  return isValidBST(root.left,  min, root.val) &&   // left: max becomes current value
         isValidBST(root.right, root.val, max);       // right: min becomes current value
}

// Lowest Common Ancestor
function lowestCommonAncestor(root, p, q) {
  if (!root || root === p || root === q) return root;
  const left  = lowestCommonAncestor(root.left,  p, q);
  const right = lowestCommonAncestor(root.right, p, q);
  if (left && right) return root;  // p and q found in different subtrees — root is LCA
  return left || right;            // both in same subtree — return the non-null one
}

// Path sum: does any root-to-leaf path sum to target?
function hasPathSum(root, target) {
  if (!root) return false;
  if (!root.left && !root.right) return root.val === target;  // leaf: check remaining
  return hasPathSum(root.left,  target - root.val) ||
         hasPathSum(root.right, target - root.val);
}

// Serialize and deserialize
function serialize(root) {
  if (!root) return "null";
  return root.val + "," + serialize(root.left) + "," + serialize(root.right);
}

function deserialize(data) {
  const vals = data.split(",");
  let i = 0;
  function build() {
    if (vals[i] === "null") { i++; return null; }
    const node = new TreeNode(parseInt(vals[i++]));
    node.left  = build();
    node.right = build();
    return node;
  }
  return build();
}


// BINARY SEARCH ──────────────────────────────────────

// Classic: find target index, return -1 if not found
function binarySearch(arr, target) {
  let lo = 0, hi = arr.length - 1;
  while (lo <= hi) {
    const mid = lo + ((hi - lo) >> 1);
    if      (arr[mid] === target) return mid;
    else if (arr[mid] < target)   lo = mid + 1;
    else                          hi = mid - 1;
  }
  return -1;
}

// Find first occurrence (leftmost position)
function lowerBound(arr, target) {
  let lo = 0, hi = arr.length;
  while (lo < hi) {
    const mid = (lo + hi) >> 1;
    if (arr[mid] < target) lo = mid + 1;
    else                   hi = mid;
  }
  return lo;  // first index where arr[lo] >= target
}

// Binary search on answer: minimum rotated sorted array
function findMin(nums) {
  let lo = 0, hi = nums.length - 1;
  while (lo < hi) {
    const mid = (lo + hi) >> 1;
    if (nums[mid] > nums[hi]) lo = mid + 1;  // min is in right half
    else                       hi = mid;      // min is in left half (including mid)
  }
  return nums[lo];
}

// Search in rotated sorted array
function searchRotated(nums, target) {
  let lo = 0, hi = nums.length - 1;
  while (lo <= hi) {
    const mid = (lo + hi) >> 1;
    if (nums[mid] === target) return mid;
    if (nums[lo] <= nums[mid]) {  // left half is sorted
      if (nums[lo] <= target && target < nums[mid]) hi = mid - 1;
      else lo = mid + 1;
    } else {                      // right half is sorted
      if (nums[mid] < target && target <= nums[hi]) lo = mid + 1;
      else hi = mid - 1;
    }
  }
  return -1;
}`,

    bugs: `// BUG 1: Wrong binary search loop condition and midpoint calculation

function binarySearchBad(arr, target) {
  let lo = 0, hi = arr.length;  // BUG 1: hi should be arr.length - 1
  while (lo < hi) {             // BUG 2: should be lo <= hi
    const mid = (lo + hi) / 2;  // BUG 3: not integer, not overflow-safe
    if      (arr[mid] === target) return mid;
    else if (arr[mid] < target)   lo = mid + 1;
    else                          hi = mid;     // BUG 4: should be mid - 1
  }
  return -1;
  // Combined: will miss the last element, use float index, potentially infinite loop.
}

function binarySearchGood(arr, target) {
  let lo = 0, hi = arr.length - 1;  // inclusive bounds
  while (lo <= hi) {                  // equal means one element left to check
    const mid = lo + ((hi - lo) >> 1);  // integer, overflow-safe
    if      (arr[mid] === target) return mid;
    else if (arr[mid] < target)   lo = mid + 1;
    else                          hi = mid - 1;  // mid is not target, exclude it
  }
  return -1;
}


// BUG 2: Not handling null in tree recursion

function heightBad(root) {
  return 1 + Math.max(heightBad(root.left), heightBad(root.right));
  // When root.left is null: heightBad(null) hits this line again.
  // null.left throws TypeError.
  // Missing: base case for null node.
}

function heightGood(root) {
  if (!root) return 0;  // base case: null has height 0
  return 1 + Math.max(heightGood(root.left), heightGood(root.right));
}


// BUG 3: Validating BST only with parent comparison (misses the range constraint)

function isValidBSTBad(root) {
  if (!root) return true;
  if (root.left  && root.left.val  >= root.val) return false;
  if (root.right && root.right.val <= root.val) return false;
  return isValidBSTBad(root.left) && isValidBSTBad(root.right);
  // Fails for:     10
  //               /  \\
  //              5    15
  //             / \\
  //            1   12   ← 12 > 10 (root), violates BST, but 12 > 5 so local check passes
  // Returns true, should return false.
}

function isValidBSTGood(root, min = -Infinity, max = Infinity) {
  if (!root) return true;
  if (root.val <= min || root.val >= max) return false;
  return isValidBSTGood(root.left,  min, root.val) &&
         isValidBSTGood(root.right, root.val, max);
  // Each node is checked against the ENTIRE range of valid values, not just its parent.
}`,

    challenge: `// CHALLENGE: Implement these tree and binary search problems.
// For recursion problems: write the base case first, then the recursive case.

// Part 1: Tree construction and traversal
//   a) buildTreeFromPreorderInorder(preorder, inorder): construct tree from two traversals.
//      The first element of preorder is always the root.
//      Use inorder to determine left/right split. O(n²) naive → O(n) with hash map.
//   b) zigzagLevelOrder(root): return level order traversal alternating left-to-right
//      and right-to-left on each level.
//   c) verticalOrderTraversal(root): group nodes by vertical column,
//      within same column order by row, then value.

// Part 2: Path problems (all DFS)
//   a) maxPathSum(root): maximum path sum — path can start and end at any node.
//      Negative nodes can be excluded. (Hard — the key insight: at each node, decide
//      whether to include both children, just one, or just the node itself.)
//   b) allRootToLeafPaths(root): return all root-to-leaf paths as strings ("1->2->5").
//   c) sumOfLeftLeaves(root): sum all left leaf nodes.

// Part 3: BST operations
//   a) kthSmallestInBST(root, k): kth smallest element. O(k) space, O(n) time with inorder.
//      Bonus: O(h) space with iterative inorder.
//   b) insertIntoBST(root, val): insert a value, return new root.
//   c) deleteFromBST(root, key): handle all three deletion cases.

// Part 4: Binary search on answer
//   a) minEatingSpeed(piles, h): koko can eat k bananas/hour. Return minimum k
//      such that she can eat all piles in h hours. Binary search on k.
//   b) capacityToShipPackagesInDDays(weights, days): minimum ship capacity.
//      Binary search on capacity.
//   c) findPeakElement(nums): return index of any peak element (element greater than neighbors).
//      O(log n) — binary search on the slope direction.`
  },

  {
    id: 6,
    title: "Graphs & BFS/DFS",
    tag: "Adjacency · Topological Sort · Union-Find",
    color: "#e8943a",
    tldr: "Graphs are the most general data structure. Trees are graphs. Linked lists are graphs. Every 'relationship' problem is a graph problem. BFS finds shortest paths. DFS finds connectivity. Topological sort orders dependencies. Union-Find detects if two things are connected. These primitives unlock system design problems too.",
    why: `Graphs model real-world relationships:
  - Social network: users are nodes, friendships are edges.
  - Maps: cities are nodes, roads are edges (weighted by distance).
  - Dependency resolution: npm packages are nodes, dependencies are edges (DAG).
  - Course prerequisites: courses are nodes, prerequisites are edges.
  - Network routing: routers are nodes, connections are edges.

In backend development:
  - Detecting circular dependencies in module loading.
  - Finding the shortest path for route optimization.
  - Topological sort for task scheduling with dependencies.
  - Union-Find for network connectivity (are servers A and B in the same cluster?).

The algorithms here — BFS, DFS, Dijkstra, topological sort — power every map app, every recommendation system, every dependency manager you use daily.`,

    analogy: `A GRAPH as a CITY MAP:
  Nodes = intersections.
  Edges = streets (undirected = two-way, directed = one-way).
  Weights = distances or travel times.

  BFS = RIPPLE from a stone in water.
  Throw a stone at your starting location.
  Ripple expands one ring at a time — equidistant nodes first.
  BFS finds shortest path in UNWEIGHTED graph.
  The first time BFS reaches a destination: guaranteed shortest.

  DFS = ADVENTURER exploring a maze.
  Go as far as possible in one direction. Hit a dead end. Backtrack. Try another direction.
  DFS answers: can I reach this destination at all? What are all possible paths?
  Not guaranteed shortest — might take a long detour before finding the destination.

  TOPOLOGICAL SORT = GETTING DRESSED IN THE MORNING.
  You must put on underwear before pants. Socks before shoes.
  There's a dependency order. A valid topological sort gives you one valid ordering.
  Only works for DAGs (Directed Acyclic Graphs — no cycles).
  If there's a cycle (socks require pants, pants require socks): impossible.

  UNION-FIND = FRIEND GROUPS at a PARTY.
  Initially: everyone is their own group.
  "Are Alice and Bob in the same group?" — find their group leaders. Same leader = same group.
  "Alice and Bob just became friends" — union their groups.
  Find and union both O(α(n)) ≈ O(1) with path compression.

  DIJKSTRA = BEST GPS NAVIGATION.
  Like BFS but considers road length.
  Always explores the closest unvisited intersection next.
  Guarantees shortest path for non-negative edge weights.`,

    deep: `GRAPH REPRESENTATIONS:

ADJACENCY LIST (most common, efficient for sparse graphs):
  Map<node, List<neighbor>>
  Space: O(V + E) where V = vertices, E = edges.
  Finding neighbors: O(degree of node).
  Use for: most graph problems where edges << V².

ADJACENCY MATRIX:
  matrix[i][j] = 1 if edge from i to j.
  Space: O(V²) — expensive for large sparse graphs.
  Finding neighbors: O(V) per node.
  Use for: dense graphs, or when you frequently check if edge (u,v) exists.

EDGE LIST:
  List of (u, v, weight) tuples.
  Space: O(E).
  Use for: Kruskal's MST algorithm (sort edges by weight).

BFS TEMPLATE:
  const visited = new Set([start]);
  const queue = [start];
  while (queue.length > 0) {
    const node = queue.shift();  // dequeue
    for (const neighbor of graph[node]) {
      if (!visited.has(neighbor)) {
        visited.add(neighbor);
        queue.push(neighbor);
      }
    }
  }
  Time: O(V + E). Space: O(V).

DFS TEMPLATE (recursive):
  const visited = new Set();
  function dfs(node) {
    visited.add(node);
    for (const neighbor of graph[node]) {
      if (!visited.has(neighbor)) dfs(neighbor);
    }
  }
  Time: O(V + E). Space: O(V) stack.

TOPOLOGICAL SORT (Kahn's BFS-based):
  1. Compute in-degree for each node.
  2. Enqueue all nodes with in-degree 0 (no prerequisites).
  3. Process queue: for each node, decrement in-degree of its neighbors.
     When a neighbor's in-degree hits 0: enqueue it.
  4. If processed count < total nodes: cycle exists.
  Use: task scheduling, course prerequisites, build systems.

UNION-FIND:
  parent[i] = i initially (each node is its own root).
  find(i): follow parent pointers to root (with path compression).
  union(a, b): set root of a's group to root of b's group (by rank for balance).
  Path compression: during find, set every node's parent directly to root.
  Union by rank: always attach smaller tree to larger.
  Amortized: O(α(n)) per operation — effectively O(1).`,

    code: `// GRAPH SETUP ─────────────────────────────────────────
// Build adjacency list from edge list
function buildGraph(n, edges, directed = false) {
  const graph = Array.from({ length: n }, () => []);
  for (const [u, v] of edges) {
    graph[u].push(v);
    if (!directed) graph[v].push(u);  // undirected: add both directions
  }
  return graph;
}


// BFS — shortest path in unweighted graph ─────────────
function shortestPath(graph, start, end) {
  if (start === end) return 0;
  const visited = new Set([start]);
  const queue   = [[start, 0]];  // [node, distance]
  while (queue.length > 0) {
    const [node, dist] = queue.shift();
    for (const neighbor of graph[node]) {
      if (!visited.has(neighbor)) {
        if (neighbor === end) return dist + 1;
        visited.add(neighbor);
        queue.push([neighbor, dist + 1]);
      }
    }
  }
  return -1;  // unreachable
}

// Multi-source BFS — shortest distance from any source
function multiSourceBFS(grid, sources) {
  const rows = grid.length, cols = grid[0].length;
  const dist  = Array.from({ length: rows }, () => new Array(cols).fill(Infinity));
  const queue = [];
  for (const [r, c] of sources) { dist[r][c] = 0; queue.push([r, c]); }
  const dirs = [[0,1],[0,-1],[1,0],[-1,0]];
  let head = 0;
  while (head < queue.length) {
    const [r, c] = queue[head++];
    for (const [dr, dc] of dirs) {
      const nr = r + dr, nc = c + dc;
      if (nr >= 0 && nr < rows && nc >= 0 && nc < cols && dist[nr][nc] === Infinity) {
        dist[nr][nc] = dist[r][c] + 1;
        queue.push([nr, nc]);
      }
    }
  }
  return dist;
}


// DFS — connected components, cycle detection ─────────
function countComponents(n, edges) {
  const graph   = buildGraph(n, edges);
  const visited = new Set();
  let components = 0;
  function dfs(node) {
    visited.add(node);
    for (const nb of graph[node]) if (!visited.has(nb)) dfs(nb);
  }
  for (let i = 0; i < n; i++) {
    if (!visited.has(i)) { dfs(i); components++; }
  }
  return components;
}

// Detect cycle in directed graph (DFS with coloring: 0=unvisited, 1=in-progress, 2=done)
function hasCycleDirected(graph, n) {
  const color = new Array(n).fill(0);
  function dfs(node) {
    color[node] = 1;  // gray: currently in DFS stack
    for (const nb of graph[node]) {
      if (color[nb] === 1) return true;   // back edge to gray node = cycle
      if (color[nb] === 0 && dfs(nb)) return true;
    }
    color[node] = 2;  // black: fully processed
    return false;
  }
  for (let i = 0; i < n; i++) {
    if (color[i] === 0 && dfs(i)) return true;
  }
  return false;
}


// TOPOLOGICAL SORT (Kahn's algorithm) ─────────────────
function topoSort(n, prerequisites) {
  const graph   = Array.from({ length: n }, () => []);
  const inDegree = new Array(n).fill(0);
  for (const [course, prereq] of prerequisites) {
    graph[prereq].push(course);
    inDegree[course]++;
  }
  const queue = [];
  for (let i = 0; i < n; i++) if (inDegree[i] === 0) queue.push(i);
  const order = [];
  let   head  = 0;
  while (head < queue.length) {
    const node = queue[head++];
    order.push(node);
    for (const nb of graph[node]) {
      inDegree[nb]--;
      if (inDegree[nb] === 0) queue.push(nb);
    }
  }
  return order.length === n ? order : [];  // empty if cycle (can't complete all courses)
}


// UNION-FIND ─────────────────────────────────────────
class UnionFind {
  constructor(n) {
    this.parent = Array.from({ length: n }, (_, i) => i);
    this.rank   = new Array(n).fill(0);
    this.count  = n;  // number of connected components
  }

  find(x) {
    if (this.parent[x] !== x) {
      this.parent[x] = this.find(this.parent[x]);  // path compression: flatten tree
    }
    return this.parent[x];
  }

  union(x, y) {
    const rx = this.find(x), ry = this.find(y);
    if (rx === ry) return false;  // already connected
    // Union by rank: attach smaller tree to root of larger
    if      (this.rank[rx] < this.rank[ry]) this.parent[rx] = ry;
    else if (this.rank[rx] > this.rank[ry]) this.parent[ry] = rx;
    else { this.parent[ry] = rx; this.rank[rx]++; }
    this.count--;
    return true;
  }

  connected(x, y) { return this.find(x) === this.find(y); }
}

// Number of islands using Union-Find
function numIslands(grid) {
  const rows = grid.length, cols = grid[0].length;
  const uf = new UnionFind(rows * cols);
  let water = 0;
  const idx = (r, c) => r * cols + c;
  const dirs = [[0,1],[1,0]];  // only right and down (avoid double-counting)
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      if (grid[r][c] === "0") { water++; continue; }
      for (const [dr, dc] of dirs) {
        const nr = r + dr, nc = c + dc;
        if (nr < rows && nc < cols && grid[nr][nc] === "1") {
          uf.union(idx(r, c), idx(nr, nc));
        }
      }
    }
  }
  return uf.count - water;
}


// DIJKSTRA — weighted shortest path ───────────────────
class MinHeap {
  constructor() { this.h = []; }
  push([d, n]) {
    this.h.push([d, n]);
    let i = this.h.length - 1;
    while (i > 0) {
      const p = (i-1)>>1;
      if (this.h[p][0] <= this.h[i][0]) break;
      [this.h[p], this.h[i]] = [this.h[i], this.h[p]]; i = p;
    }
  }
  pop() {
    const top = this.h[0], last = this.h.pop();
    if (this.h.length) {
      this.h[0] = last; let i = 0;
      while (true) {
        let s = i; const l = 2*i+1, r = 2*i+2;
        if (l < this.h.length && this.h[l][0] < this.h[s][0]) s = l;
        if (r < this.h.length && this.h[r][0] < this.h[s][0]) s = r;
        if (s === i) break;
        [this.h[s], this.h[i]] = [this.h[i], this.h[s]]; i = s;
      }
    }
    return top;
  }
  size() { return this.h.length; }
}

function dijkstra(n, edges, src) {
  const graph = Array.from({ length: n }, () => []);
  for (const [u, v, w] of edges) { graph[u].push([v, w]); graph[v].push([u, w]); }
  const dist = new Array(n).fill(Infinity); dist[src] = 0;
  const heap = new MinHeap(); heap.push([0, src]);
  while (heap.size() > 0) {
    const [d, u] = heap.pop();
    if (d > dist[u]) continue;  // stale entry
    for (const [v, w] of graph[u]) {
      if (dist[u] + w < dist[v]) {
        dist[v] = dist[u] + w;
        heap.push([dist[v], v]);
      }
    }
  }
  return dist;
}`,

    bugs: `// BUG 1: Not marking node as visited when enqueueing (visits nodes multiple times)

function bfsBad(graph, start) {
  const queue = [start];
  const visited = new Set();
  while (queue.length > 0) {
    const node = queue.shift();
    visited.add(node);  // BUG: marking visited on dequeue, not enqueue
    for (const nb of graph[node]) {
      if (!visited.has(nb)) {
        queue.push(nb);  // same node can be enqueued multiple times before processed
      }
    }
  }
  // For a grid: a cell can be enqueued from 4 neighbors before it's dequeued.
  // Result: same node processed 4 times. Exponential blowup in dense graphs.
}

function bfsGood(graph, start) {
  const visited = new Set([start]);  // mark visited when ENQUEUING
  const queue   = [start];
  while (queue.length > 0) {
    const node = queue.shift();
    for (const nb of graph[node]) {
      if (!visited.has(nb)) {
        visited.add(nb);   // mark BEFORE enqueue — prevents duplicate enqueue
        queue.push(nb);
      }
    }
  }
}


// BUG 2: DFS stack overflow on large graphs

function dfsBad(graph, start) {
  const visited = new Set([start]);
  function dfs(node) {
    for (const nb of graph[node]) {
      if (!visited.has(nb)) {
        visited.add(nb);
        dfs(nb);  // recursive — call stack grows with path length
      }
    }
  }
  dfs(start);
  // Graph with 100,000 nodes in a chain: 100,000 recursive calls.
  // Default Node.js call stack: ~10,000-15,000 frames.
  // Stack overflow on graphs with long paths.
}

function dfsIterative(graph, start) {
  const visited = new Set([start]);
  const stack   = [start];
  while (stack.length > 0) {
    const node = stack.pop();
    for (const nb of graph[node]) {
      if (!visited.has(nb)) {
        visited.add(nb);
        stack.push(nb);
      }
    }
  }
  // Explicit stack on heap — no call stack depth limit.
}


// BUG 3: Using shift() on large queues — O(n²) total for BFS

function bfsSlowQueue(graph, start) {
  const queue = [start];
  while (queue.length > 0) {
    const node = queue.shift();  // O(n) per shift — shifts all remaining elements
    // For 100,000 nodes: 100,000 shifts averaging 50,000 each = 5 billion ops.
    // BFS becomes O(n²) instead of O(n+e).
  }
}

// Fix: use a proper deque or pointer trick
function bfsFastQueue(graph, start) {
  const queue = [start];
  let head = 0;
  while (head < queue.length) {
    const node = queue[head++];  // O(1) — just advance a pointer
    for (const nb of graph[node]) queue.push(nb);
  }
  // Uses more memory (doesn't free early elements) but O(1) dequeue.
  // For production: use a circular buffer or linkedlist-based deque.
}`,

    challenge: `// CHALLENGE: Solve these graph problems with optimal algorithms.

// Part 1: Grid problems (treat grid as implicit graph)
//   a) wallsAndGates(rooms): given grid with: -1=wall, 0=gate, INF=empty room,
//      fill each empty room with distance to nearest gate. Multi-source BFS.
//   b) rottenOranges(grid): 0=empty, 1=fresh, 2=rotten. Each minute rotten spreads.
//      Return minutes until all fresh are rotten, or -1 if impossible.
//   c) pacificAtlantic(heights): water can flow to adjacent equal/lower cells.
//      Return cells that can reach both Pacific (top/left edges) and Atlantic (bottom/right).

// Part 2: Topological sort applications
//   a) courseScheduleII(numCourses, prerequisites): return valid order to take all courses.
//      Return empty array if impossible (cycle).
//   b) alienDictionary(words): given words in alien language sorted order, determine
//      the alien alphabet character ordering. Return order or "" if invalid.

// Part 3: Union-Find applications
//   a) accountsMerge(accounts): merge accounts that share email addresses.
//      Emails are nodes, accounts create edges between emails.
//   b) numberOfProvinces(isConnected): adjacency matrix. Count connected components.
//   c) redundantConnection(edges): find the edge that, if removed, creates a valid tree.

// Part 4: Weighted graph
//   Implement Dijkstra to solve: networkDelayTime(times, n, k):
//   times = [[source, target, time], ...]. All nodes receive signal from k.
//   Return time until all nodes receive the signal, or -1 if impossible.
//   Then explain: why does Dijkstra not work with negative edge weights?
//   And what algorithm would you use instead?`
  },

  {
    id: 7,
    title: "Stacks, Queues & Heaps",
    tag: "Monotonic Stack · Priority Queue",
    color: "#e8943a",
    tldr: "Stacks enforce LIFO order — perfect for matching brackets, tracking history, and monotonic problems. Queues enforce FIFO — perfect for BFS and event processing. Heaps give you the min or max in O(1) with O(log n) insert/remove. The monotonic stack pattern solves 'next greater element' family problems elegantly.",
    why: `These structures appear constantly:
  - Stack: undo/redo, function call stack, expression evaluation, monotonic stack problems.
  - Queue: BFS, event queues, message queues (your Node.js event loop is a queue).
  - Priority Queue (Heap): Dijkstra, scheduling, top-k elements, merge k sorted lists.
  - Monotonic Stack: next greater element, daily temperatures, largest rectangle in histogram.

The monotonic stack is one of the most elegant patterns in DSA. A stack where elements are always in monotonic (increasing or decreasing) order. The moment you push an element that violates the order, you pop and process until the order is restored. This pattern appears in 20+ Leetcode problems.

Heaps (priority queues) are critical in backend:
  - Task scheduler: always pick highest-priority task.
  - Rate limiter: efficient sliding window with a min-heap of timestamps.
  - Top-k query: maintain heap of size k while scanning data.`,

    analogy: `STACK as a PLATE STACK in a cafeteria:
  Add plate to top: push, O(1).
  Take plate from top: pop, O(1).
  Only the top plate is accessible: LIFO (Last In, First Out).
  Never take from the middle — the structure is the constraint.

QUEUE as a LINE at a TICKET COUNTER:
  Join at the back: enqueue, O(1).
  Served from the front: dequeue, O(1).
  First come, first served: FIFO (First In, First Out).
  Fair ordering — important for event processing, scheduling.

HEAP as a HOSPITAL EMERGENCY ROOM:
  MIN-HEAP: patient with lowest wait number is seen first.
  Insert new patient: O(log n) — they bubble up to their correct priority position.
  Remove most urgent: O(log n) — remove top, reorganize.
  Peek most urgent: O(1).
  Not fully sorted — just guarantees the minimum/maximum is always at top.
  
  HEAP vs SORTED ARRAY:
  Sorted array: O(n) insert, O(1) min/max.
  Heap: O(log n) insert, O(1) peek, O(log n) remove.
  Heap wins when you frequently insert AND need frequent min/max.

MONOTONIC STACK — the clever trick:
  You're watching a queue of people. You want to know, for each person,
  who is the next taller person behind them.
  
  Naive: for each person, look at everyone behind them — O(n²).
  Monotonic stack:
  Process people left to right. Maintain stack of "unresolved" people.
  When you encounter person B:
  Pop all people from stack who are shorter than B — B is their "next taller".
  Push B onto stack.
  At end: remaining people in stack have no taller person to their right.
  One pass: O(n). Each person pushed and popped at most once.`,

    deep: `HEAP INTERNALS:

A heap is a COMPLETE BINARY TREE stored as an array:
  Parent of i:  Math.floor((i-1)/2)
  Left child:   2*i + 1
  Right child:  2*i + 2

MIN-HEAP PROPERTY: parent ≤ children (always).
Root is always the minimum element.

INSERT (sift up):
  Add to end of array.
  Compare with parent: if smaller, swap.
  Repeat until in correct position or at root.
  O(log n) — height of tree.

REMOVE MIN (sift down):
  Save root (the minimum).
  Move last element to root.
  Compare with children: swap with smaller child if needed.
  Repeat until in correct position or at leaf.
  O(log n).

BUILD HEAP from array:
  Start from last non-leaf: Math.floor(n/2) - 1.
  Sift down each node.
  O(n) total — not O(n log n) as you might expect.

HEAPIFY vs SORT:
  Heap sort: build heap O(n), extract n times O(n log n) = O(n log n) total.
  Not in-place in practice (due to cache performance: merge sort is preferred).

MONOTONIC STACK PATTERN:

NEXT GREATER ELEMENT:
  result = new Array(n).fill(-1)
  stack = []  (stores indices of unresolved elements)
  for i from 0 to n-1:
    while stack is not empty AND arr[stack.top] < arr[i]:
      idx = stack.pop()
      result[idx] = arr[i]  // arr[i] is the next greater element for arr[idx]
    stack.push(i)
  return result

  Variations:
  - Next smaller: flip comparison (<  to >)
  - Previous greater: process right to left
  - Largest rectangle in histogram: next smaller left + right for each bar

TOP-K ELEMENTS PATTERN:
  Maintain a MIN-HEAP of size k.
  For each element: if element > heap.min, pop min and push element.
  At end: heap contains top k elements. Heap.min is kth largest.
  Time: O(n log k). Space: O(k).
  Better than sorting (O(n log n)) when k << n.`,

    code: `// HEAP IMPLEMENTATION ────────────────────────────────
class Heap {
  constructor(compare = (a, b) => a - b) {
    this.data    = [];
    this.compare = compare;  // < 0 means a should be closer to root (min-heap default)
  }

  size()  { return this.data.length; }
  peek()  { return this.data[0]; }
  isEmpty() { return this.data.length === 0; }

  push(val) {
    this.data.push(val);
    this._siftUp(this.data.length - 1);
  }

  pop() {
    if (this.size() === 0) return undefined;
    const top  = this.data[0];
    const last = this.data.pop();
    if (this.data.length > 0) { this.data[0] = last; this._siftDown(0); }
    return top;
  }

  _siftUp(i) {
    while (i > 0) {
      const parent = (i - 1) >> 1;
      if (this.compare(this.data[i], this.data[parent]) >= 0) break;
      [this.data[i], this.data[parent]] = [this.data[parent], this.data[i]];
      i = parent;
    }
  }

  _siftDown(i) {
    const n = this.data.length;
    while (true) {
      let smallest = i;
      const l = 2*i+1, r = 2*i+2;
      if (l < n && this.compare(this.data[l], this.data[smallest]) < 0) smallest = l;
      if (r < n && this.compare(this.data[r], this.data[smallest]) < 0) smallest = r;
      if (smallest === i) break;
      [this.data[i], this.data[smallest]] = [this.data[smallest], this.data[i]];
      i = smallest;
    }
  }
}

// Min-heap: new Heap()
// Max-heap: new Heap((a, b) => b - a)
// Custom: new Heap((a, b) => a.priority - b.priority)


// MONOTONIC STACK PATTERNS ────────────────────────────

// Next greater element (to the right)
function nextGreaterElement(arr) {
  const n = arr.length;
  const result = new Array(n).fill(-1);
  const stack  = [];  // stack of indices
  for (let i = 0; i < n; i++) {
    while (stack.length > 0 && arr[stack[stack.length - 1]] < arr[i]) {
      result[stack.pop()] = arr[i];  // arr[i] is the next greater for this index
    }
    stack.push(i);
  }
  return result;
}

// Daily temperatures: for each day, how many days until warmer?
function dailyTemperatures(temps) {
  const n = temps.length;
  const result = new Array(n).fill(0);
  const stack  = [];
  for (let i = 0; i < n; i++) {
    while (stack.length > 0 && temps[stack[stack.length - 1]] < temps[i]) {
      const j = stack.pop();
      result[j] = i - j;  // days waited = difference in indices
    }
    stack.push(i);
  }
  return result;
}

// Largest rectangle in histogram (uses two monotonic stacks / one pass)
function largestRectangleHistogram(heights) {
  const n = heights.length;
  const stack = [];   // monotonic increasing stack
  let maxArea = 0;
  for (let i = 0; i <= n; i++) {
    const h = i < n ? heights[i] : 0;  // sentinel 0 at end to flush the stack
    while (stack.length > 0 && heights[stack[stack.length - 1]] > h) {
      const height = heights[stack.pop()];
      const width  = stack.length > 0 ? i - stack[stack.length - 1] - 1 : i;
      maxArea = Math.max(maxArea, height * width);
    }
    stack.push(i);
  }
  return maxArea;
}


// TOP-K ELEMENTS ──────────────────────────────────────

function topKFrequent(nums, k) {
  const freq = new Map();
  for (const n of nums) freq.set(n, (freq.get(n) || 0) + 1);

  // Min-heap of size k: stores [count, num]
  const heap = new Heap((a, b) => a[0] - b[0]);

  for (const [num, count] of freq) {
    heap.push([count, num]);
    if (heap.size() > k) heap.pop();  // remove least frequent
  }
  return heap.data.map(([, num]) => num);
  // O(n log k) time, O(n + k) space
}

function kthLargest(nums, k) {
  const heap = new Heap();  // min-heap
  for (const n of nums) {
    heap.push(n);
    if (heap.size() > k) heap.pop();
  }
  return heap.peek();  // kth largest = minimum of top k
}


// MEDIAN OF DATA STREAM ───────────────────────────────
// Two heaps: max-heap for lower half, min-heap for upper half.
// Balance them so max-heap size is either equal to or 1 more than min-heap.
// Median: if odd total → max-heap.peek(). If even → average of both tops.

class MedianFinder {
  constructor() {
    this.lo = new Heap((a, b) => b - a);  // max-heap: lower half
    this.hi = new Heap();                 // min-heap: upper half
  }

  addNum(n) {
    this.lo.push(n);                           // push to max-heap first
    this.hi.push(this.lo.pop());               // move max of lower to upper
    if (this.hi.size() > this.lo.size()) {
      this.lo.push(this.hi.pop());             // rebalance: lower half should be >= upper half
    }
  }

  findMedian() {
    if (this.lo.size() === this.hi.size()) {
      return (this.lo.peek() + this.hi.peek()) / 2;
    }
    return this.lo.peek();  // lower half has one extra
  }
}


// TASK SCHEDULER (heap-based, real-world relevance) ──
function leastInterval(tasks, n) {
  const freq = new Map();
  for (const t of tasks) freq.set(t, (freq.get(t) || 0) + 1);

  const maxHeap = new Heap((a, b) => b - a);  // max-heap by count
  for (const count of freq.values()) maxHeap.push(count);

  let time = 0;
  const cooldown = [];  // [count, available_at_time]

  while (!maxHeap.isEmpty() || cooldown.length > 0) {
    // Re-add tasks that have finished cooldown
    while (cooldown.length > 0 && cooldown[0][1] <= time) maxHeap.push(cooldown.shift()[0]);

    if (!maxHeap.isEmpty()) {
      const count = maxHeap.pop() - 1;
      if (count > 0) cooldown.push([count, time + n + 1]);
    }
    time++;
  }
  return time;
}`,

    bugs: `// BUG 1: Popping from empty stack/heap (no bounds check)

function nextGreaterBad(arr) {
  const stack = [];
  const result = [];
  for (const n of arr) {
    while (arr[stack[stack.length - 1]] < n) {  // BUG: stack might be empty
      result[stack.pop()] = n;                  // stack.pop() on empty returns undefined
    }                                           // arr[undefined] = undefined, comparison breaks
    stack.push(result.length);
  }
  return result;
}

function nextGreaterGood(arr) {
  const stack  = [];
  const result = new Array(arr.length).fill(-1);
  for (let i = 0; i < arr.length; i++) {
    while (stack.length > 0 && arr[stack[stack.length - 1]] < arr[i]) {
      result[stack.pop()] = arr[i];  // guard: stack.length > 0 checked first
    }
    stack.push(i);
  }
  return result;
}


// BUG 2: Wrong heap comparison causes max-heap behavior in min-heap

// Trying to build a min-heap for numbers:
const heapBad = new Heap((a, b) => b - a);  // BUG: b - a is MAX-heap comparator
heapBad.push(3); heapBad.push(1); heapBad.push(2);
heapBad.peek();  // returns 3 (the MAX), not 1 (the MIN)
// For min-heap: compare returns negative when a should be higher priority (closer to root)
// a - b: negative when a < b, meaning smaller values bubble up = min-heap.
// b - a: negative when b < a, meaning larger values bubble up = max-heap.

const heapGood = new Heap((a, b) => a - b);  // a - b = min-heap
// Mnemonic: a - b: "a minus b". When a < b, a - b < 0, a wins (min wins).


// BUG 3: Using array shift() for queue dequeue (O(n²) BFS)

function levelOrderBad(root) {
  if (!root) return [];
  const queue = [root], result = [];
  while (queue.length > 0) {
    const size = queue.length;
    const level = [];
    for (let i = 0; i < size; i++) {
      const node = queue.shift();  // O(n) shift! BFS becomes O(n²) total.
      level.push(node.val);
      if (node.left)  queue.push(node.left);
      if (node.right) queue.push(node.right);
    }
    result.push(level);
  }
  return result;
}

function levelOrderGood(root) {
  if (!root) return [];
  let queue = [root], result = [];
  while (queue.length > 0) {
    const next = [], level = [];
    for (const node of queue) {      // iterate current level
      level.push(node.val);
      if (node.left)  next.push(node.left);
      if (node.right) next.push(node.right);
    }
    result.push(level);
    queue = next;  // swap to next level's array — no shift() needed
  }
  return result;
}`,

    challenge: `// CHALLENGE: Implement the full family of monotonic stack problems
// and heap-based design problems.

// Part 1: Monotonic stack family
//   a) previousSmallerElement(arr): for each element, find the nearest smaller element to its LEFT.
//   b) sumOfSubarrayMinimums(arr): sum of minimums of all subarrays.
//      Use monotonic stack to find, for each element, how many subarrays it is the minimum of.
//   c) trapRainWater(heights): reimplement using monotonic stack (not two-pointer).

// Part 2: Heap design problems
//   a) KthLargestInStream: class with:
//      constructor(k, nums): initializes with array and k
//      add(val): adds to stream, returns kth largest element
//      Must be O(log k) per add operation.
//   b) SlidingWindowMaximum(nums, k): return max in each window of size k.
//      Use a monotonic deque (double-ended queue). O(n) total.
//   c) SmallestRangeFromKLists: given k sorted lists, find the smallest range
//      that contains at least one element from each list. Use min-heap.

// Part 3: Application problem
//   Design a real-time leaderboard system:
//   - addScore(userId, score): add to user's running total
//   - topK(k): return top k users by score
//   - rank(userId): return current rank of a specific user
//   All operations should be as fast as possible.
//   Which data structures? (Hint: sorted set / skip list / heap + map)
//   What are the tradeoffs?`
  },

  {
    id: 8,
    title: "Dynamic Programming",
    tag: "Optimal Substructure · Memoization · Tabulation",
    color: "#e8943a",
    tldr: "Dynamic programming is not a data structure — it is a technique for eliminating redundant computation. If a problem has overlapping subproblems and optimal substructure, DP applies. The skill is recognizing the recurrence relation and deciding whether to use top-down (memoization) or bottom-up (tabulation). Every DP problem is just recursion with a memory.",
    why: `Dynamic programming is the most feared topic in interviews and the most rewarding to master. It solves problems that brute force cannot:
  - Edit distance between strings: used in spell checkers, DNA analysis, diff tools.
  - Knapsack problem: resource allocation, portfolio optimization, cargo loading.
  - Coin change: any counting/optimization over denominations problem.
  - Longest common subsequence: file comparison, version control.
  - Matrix chain multiplication: query optimizer.

DP is not magic. It is just: "I've seen this subproblem before — use the cached result instead of recomputing."

The hard part is not the code — it is recognizing: what are the subproblems? What is the recurrence? What is the base case? Once you see the recurrence, the code writes itself.`,

    analogy: `CLIMBING STAIRS as the classic DP analogy:
  You can climb 1 or 2 stairs at a time. How many ways to reach stair n?

  BRUTE FORCE (recursion without memory):
  ways(n) = ways(n-1) + ways(n-2)
  This calls ways(n-2) from BOTH ways(n-1) AND from ways(n) directly.
  The same subproblem recomputed exponentially many times.
  Like re-reading the same chapter of a book every time you need a fact from it.

  MEMOIZATION (top-down DP):
  Same recursion, but write answers in a notebook.
  Before computing: check if it's in the notebook.
  Each subproblem solved ONCE, remembered forever.
  Time goes from O(2ⁿ) to O(n).

  TABULATION (bottom-up DP):
  Start from the ground floor. Fill a table:
  ways[0] = 1 (one way to stay on ground: do nothing)
  ways[1] = 1 (only one step)
  ways[2] = 2 (two steps, or two one-steps)
  ways[i] = ways[i-1] + ways[i-2]
  No recursion at all. Fill the table in order. Read the answer from ways[n].

  WHEN TO USE WHICH:
  Memoization: easier to think about (mirrors the recursion), may not compute all subproblems.
  Tabulation: no recursion overhead, enables space optimization (only keep last few values).

  OPTIMAL SUBSTRUCTURE:
  "The optimal solution to a problem contains optimal solutions to its subproblems."
  Shortest path: the shortest path from A to C through B must use the shortest A-to-B path.
  (If there were a shorter A-to-B path, use that instead — contradiction.)
  DP only works when this holds. Greedy sometimes works when it holds more strongly.

  OVERLAPPING SUBPROBLEMS:
  The same subproblem appears in multiple branches of the recursion.
  If subproblems were all unique: divide and conquer (merge sort). No DP needed.
  DP trades space for time: store computed results to avoid recomputation.`,

    deep: `DP PROBLEM RECOGNITION:

SIGNALS that DP applies:
  - "Count the number of ways to..."
  - "Find the minimum/maximum..."
  - "Is it possible to..."
  - "Find the longest/shortest..."
  - Involves making choices at each step that affect future steps.
  - Exponential brute force, but subproblems overlap.

DIMENSION OF THE DP TABLE:
  1D DP: one varying parameter (index into array, position, capacity).
    Example: climbing stairs, house robber, coin change.
    dp[i] = answer for first i elements.

  2D DP: two varying parameters.
    Example: edit distance, longest common subsequence, 0/1 knapsack.
    dp[i][j] = answer for first i elements of one sequence, first j of another.

  Sometimes space can be reduced:
  If dp[i] only depends on dp[i-1] and dp[i-2]: reduce to O(1) space.
  If dp[i][j] only depends on dp[i-1][...]: reduce to 1D rolling array.

COMMON DP PATTERNS:

HOUSE ROBBER (max sum, no two adjacent):
  dp[i] = max(dp[i-1], dp[i-2] + nums[i])
  Either skip current house (take dp[i-1]) or rob it (add to dp[i-2]).

0/1 KNAPSACK:
  dp[i][w] = max value using first i items, max weight w.
  dp[i][w] = max(dp[i-1][w],          // don't take item i
               dp[i-1][w-weight[i]] + value[i])  // take item i
  Can only take each item once.

UNBOUNDED KNAPSACK (coin change):
  dp[i][w] = dp[i][w-weight[i]] + value[i]  // CAN take item i again (use dp[i] not dp[i-1])

LCS (Longest Common Subsequence):
  dp[i][j] = LCS of s1[0..i-1] and s2[0..j-1].
  if s1[i-1] === s2[j-1]: dp[i][j] = dp[i-1][j-1] + 1
  else: dp[i][j] = max(dp[i-1][j], dp[i][j-1])

EDIT DISTANCE:
  dp[i][j] = min edits to convert s1[0..i-1] to s2[0..j-1].
  if s1[i-1] === s2[j-1]: dp[i][j] = dp[i-1][j-1]  (no edit needed)
  else: dp[i][j] = 1 + min(
    dp[i-1][j],    // delete from s1
    dp[i][j-1],   // insert into s1
    dp[i-1][j-1]  // replace in s1
  )`,

    code: `// 1D DP PATTERNS ──────────────────────────────────────

// Climbing stairs (fibonacci variant)
function climbStairs(n) {
  if (n <= 2) return n;
  let prev2 = 1, prev1 = 2;
  for (let i = 3; i <= n; i++) {
    [prev2, prev1] = [prev1, prev2 + prev1];
  }
  return prev1;
  // O(n) time, O(1) space — only need last two values
}

// House robber: max sum with no two adjacent elements
function rob(nums) {
  if (nums.length === 0) return 0;
  if (nums.length === 1) return nums[0];
  let prev2 = nums[0], prev1 = Math.max(nums[0], nums[1]);
  for (let i = 2; i < nums.length; i++) {
    const curr = Math.max(prev1, prev2 + nums[i]);  // skip or take
    prev2 = prev1; prev1 = curr;
  }
  return prev1;
}

// Coin change: minimum coins to make amount
function coinChange(coins, amount) {
  const dp = new Array(amount + 1).fill(Infinity);
  dp[0] = 0;  // base case: 0 coins to make 0
  for (let a = 1; a <= amount; a++) {
    for (const coin of coins) {
      if (coin <= a && dp[a - coin] !== Infinity) {
        dp[a] = Math.min(dp[a], dp[a - coin] + 1);
      }
    }
  }
  return dp[amount] === Infinity ? -1 : dp[amount];
  // dp[a] = minimum coins to make amount a.
  // For each amount, try every coin. Update if using that coin + optimal for remainder is better.
}

// Coin change II: number of combinations
function change(amount, coins) {
  const dp = new Array(amount + 1).fill(0);
  dp[0] = 1;  // one way to make 0: use no coins
  for (const coin of coins) {           // iterate coins in outer loop
    for (let a = coin; a <= amount; a++) { // update amounts that use this coin
      dp[a] += dp[a - coin];
    }
  }
  return dp[amount];
  // Key difference from min coins: we iterate coins in outer loop to avoid counting
  // permutations as separate combinations. [1,2] and [2,1] are the same combination.
}


// 2D DP PATTERNS ──────────────────────────────────────

// Longest Common Subsequence
function LCS(text1, text2) {
  const m = text1.length, n = text2.length;
  const dp = Array.from({ length: m + 1 }, () => new Array(n + 1).fill(0));
  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      if (text1[i-1] === text2[j-1]) dp[i][j] = dp[i-1][j-1] + 1;
      else                           dp[i][j] = Math.max(dp[i-1][j], dp[i][j-1]);
    }
  }
  return dp[m][n];
}

// Edit distance (Levenshtein distance)
function editDistance(word1, word2) {
  const m = word1.length, n = word2.length;
  const dp = Array.from({ length: m + 1 }, (_, i) => {
    const row = new Array(n + 1).fill(0);
    row[0] = i;  // edit i chars to empty string: i deletions
    return row;
  });
  for (let j = 0; j <= n; j++) dp[0][j] = j;  // empty string to j chars: j insertions

  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      if (word1[i-1] === word2[j-1]) dp[i][j] = dp[i-1][j-1];
      else dp[i][j] = 1 + Math.min(
        dp[i-1][j],    // delete  (remove from word1)
        dp[i][j-1],    // insert  (add to word1 to match word2[j-1])
        dp[i-1][j-1]   // replace
      );
    }
  }
  return dp[m][n];
}

// 0/1 Knapsack
function knapsack(weights, values, capacity) {
  const n = weights.length;
  const dp = Array.from({ length: n + 1 }, () => new Array(capacity + 1).fill(0));
  for (let i = 1; i <= n; i++) {
    for (let w = 0; w <= capacity; w++) {
      dp[i][w] = dp[i-1][w];  // don't take item i
      if (weights[i-1] <= w) {
        dp[i][w] = Math.max(dp[i][w], dp[i-1][w - weights[i-1]] + values[i-1]);
      }
    }
  }
  return dp[n][capacity];
}

// Space-optimized knapsack: O(capacity) space
function knapsackOptimized(weights, values, capacity) {
  const dp = new Array(capacity + 1).fill(0);
  for (let i = 0; i < weights.length; i++) {
    for (let w = capacity; w >= weights[i]; w--) {  // iterate backwards! (avoids using item twice)
      dp[w] = Math.max(dp[w], dp[w - weights[i]] + values[i]);
    }
  }
  return dp[capacity];
  // Why backwards: if we iterate forward, dp[w - weight] has already been updated
  // with item i (meaning we'd take item i multiple times).
}


// SEQUENCE DP ─────────────────────────────────────────

// Longest Increasing Subsequence (O(n log n) with patience sorting)
function lengthOfLIS(nums) {
  const tails = [];  // tails[i] = smallest tail element of all IS of length i+1
  for (const n of nums) {
    let lo = 0, hi = tails.length;
    while (lo < hi) {
      const mid = (lo + hi) >> 1;
      if (tails[mid] < n) lo = mid + 1;
      else                hi = mid;
    }
    tails[lo] = n;  // either extends longest IS, or improves a tail
    if (lo === tails.length) tails.push(n);
  }
  return tails.length;
  // tails.length = length of LIS. The array itself is NOT the actual subsequence.
}

// Longest Palindromic Subsequence
function longestPalindromeSubseq(s) {
  return LCS(s, s.split("").reverse().join(""));
  // LPS = LCS of string with its reverse. Elegant reduction.
}`,

    bugs: `// BUG 1: Wrong base case causes wrong answer for small inputs

function robBad(nums) {
  const dp = new Array(nums.length).fill(0);
  dp[0] = nums[0];
  dp[1] = nums[1];  // BUG: should be Math.max(nums[0], nums[1])
  // For [3, 10, 3, 1, 2]:
  // dp[1] = 10 (correct by accident here since 10 > 3)
  // But for [10, 3, 1, ...]: dp[1] = 3, but we should rob house 0 (10).
  for (let i = 2; i < nums.length; i++) {
    dp[i] = Math.max(dp[i-1], dp[i-2] + nums[i]);
  }
  return dp[nums.length - 1];
}

function robGood(nums) {
  if (nums.length === 0) return 0;
  if (nums.length === 1) return nums[0];
  const dp = new Array(nums.length).fill(0);
  dp[0] = nums[0];
  dp[1] = Math.max(nums[0], nums[1]);  // correct: best of first two houses
  for (let i = 2; i < nums.length; i++) {
    dp[i] = Math.max(dp[i-1], dp[i-2] + nums[i]);
  }
  return dp[nums.length - 1];
}


// BUG 2: Using top-down memoization with a plain object for negative indices

function dpWithNegativeIndicesBad(n, memo = {}) {
  if (n < 0) return 0;
  if (n === 0) return 1;
  if (memo[n] !== undefined) return memo[n];
  memo[n] = dpWithNegativeIndicesBad(n - 1, memo) + dpWithNegativeIndicesBad(n - 2, memo);
  return memo[n];
  // Mostly fine, but: memo[0] = 1, and typeof memo[0] !== undefined is true.
  // But what about checking memo[n] !== undefined vs memo[n]?
  // If memoized result is 0: memo[n] = 0, and 0 !== undefined is TRUE, correctly returns 0.
  // But: if you wrote if (memo[n]) — falsy check — you'd re-compute when result is 0!
}

function dpGood(n, memo = new Map()) {
  if (n < 0) return 0;
  if (n === 0) return 1;
  if (memo.has(n)) return memo.get(n);  // .has() checks existence, not truthiness
  const result = dpGood(n-1, memo) + dpGood(n-2, memo);
  memo.set(n, result);
  return result;
  // Map.has() correctly handles cases where the memoized value is 0, false, null, etc.
}


// BUG 3: Iterating knapsack in wrong direction (counts item multiple times)

function unboundedKnapsackBad(weights, values, capacity) {
  const dp = new Array(capacity + 1).fill(0);
  for (let i = 0; i < weights.length; i++) {
    for (let w = weights[i]; w <= capacity; w++) {  // forward: allows multiple use of item i
      dp[w] = Math.max(dp[w], dp[w - weights[i]] + values[i]);
    }
  }
  return dp[capacity];
  // This is actually CORRECT for UNBOUNDED knapsack (can use each item multiple times).
}

function zeroOneKnapsackCorrect(weights, values, capacity) {
  const dp = new Array(capacity + 1).fill(0);
  for (let i = 0; i < weights.length; i++) {
    for (let w = capacity; w >= weights[i]; w--) {  // BACKWARDS: each item used at most once
      dp[w] = Math.max(dp[w], dp[w - weights[i]] + values[i]);
    }
  }
  return dp[capacity];
  // Backwards: when computing dp[w], dp[w - weights[i]] hasn't been updated yet for item i.
  // So we're using the value from dp[...] BEFORE adding item i = using item i at most once.
}`,

    challenge: `// CHALLENGE: Implement these DP problems. For each:
// 1. Identify the subproblem.
// 2. Write the recurrence relation in words before code.
// 3. Implement top-down (memoized recursion) first.
// 4. Then implement bottom-up (tabulation).
// 5. Optimize space if possible.

// Part 1: Classic 1D DP
//   a) minCostClimbingStairs(cost): min cost to reach top (can start from step 0 or 1,
//      can take 1 or 2 steps at each step, pay cost[i] when stepping on i).
//   b) decode ways(s): a string of digits can be decoded as letters (1='A', 26='Z').
//      Count number of valid decodings. Watch out for '0' — it must be part of 10 or 20.
//   c) wordBreak(s, wordDict): can s be segmented into words from wordDict?
//      Return true/false. Then also return all valid segmentations.

// Part 2: 2D DP
//   a) uniquePaths(m, n): robot on m×n grid, can only move right or down.
//      Count unique paths from top-left to bottom-right.
//   b) maximalSquare(matrix): find largest square of all 1s in binary matrix.
//      dp[i][j] = side length of largest square with bottom-right corner at (i,j).
//   c) longestPalindromicSubstring(s): return the longest palindromic substring.
//      (Different from subsequence — must be contiguous.)

// Part 3: String DP
//   a) isInterleaving(s1, s2, s3): is s3 formed by interleaving s1 and s2?
//   b) regularExpressionMatching(s, p): implement . (any single char) and * (zero or more).
//      One of the hardest DP problems — think carefully about the '*' case.
//      (The star is the hard part: it can consume 0 characters from s or more.)

// Part 4: Identify the DP
//   For each of these, only state: what is dp[i] (or dp[i][j]), the recurrence,
//   and the time/space complexity. Do NOT implement.
//   a) Maximum product subarray
//   b) Best time to buy and sell stock with cooldown
//   c) Partition equal subset sum
//   d) Burst balloons`
  },

  {
    id: 9,
    title: "Recursion & Backtracking",
    tag: "State Space · Pruning · Permutations",
    color: "#e8943a",
    tldr: "Backtracking is a depth-first search through a decision tree. At each step, make a choice, recurse, then undo the choice (backtrack). The art is in the pruning — cutting branches early when they cannot lead to a valid solution. Without pruning, backtracking is brute force. With smart pruning, it becomes efficient.",
    why: `Backtracking solves problems where you must explore all possibilities but can eliminate bad paths early:
  - Generating all permutations or combinations.
  - Solving puzzles: N-queens, Sudoku, word search.
  - Parsing and tokenization (try different grammars).
  - Constraint satisfaction problems.

In backend development:
  - Permission systems: "find all valid permission paths from role A to permission B."
  - Route generation: generate all possible routes satisfying constraints.
  - Test generation: generate all test cases satisfying a specification.

The key insight: backtracking = DFS on the implicit decision tree of all choices. Each node is a partial solution. Each edge is a choice. Each leaf is a complete solution (valid or invalid). Pruning cuts edges/subtrees that cannot lead to valid leaves.`,

    analogy: `BACKTRACKING as SOLVING A MAZE:
  You enter the maze. You hit a junction. You choose left.
  Walk down the left path. Hit another junction. Choose left again.
  Walk into a dead end. BACKTRACK to last junction. Try right.
  Reach the exit? SUCCESS. Record the path.

  The DECISION TREE:
  Root = empty board / empty string / empty set.
  Each level = one more choice made.
  Each node = a partial solution state.
  Leaves = complete states (may be valid or invalid solutions).

  PRUNING — the efficiency gain:
  If you're solving N-Queens and you've already placed a queen on column 3 in row 1:
  No queen in any subsequent row can be in column 3.
  You can prune ALL branches that try column 3 in rows 2-N.
  This eliminates (N-1)! options with one check.

  STATE MANAGEMENT — the crucial technique:
  When you recurse: MAKE A CHOICE (add to path, place on board, mark used).
  When you backtrack: UNDO THE CHOICE (remove from path, unplace from board, mark unused).
  The state before and after the recursive call must be IDENTICAL.
  This is why backtracking solutions have the pattern: do → recurse → undo.

  SUBSETS vs PERMUTATIONS vs COMBINATIONS:
  Subsets: each element is either included or not (2ⁿ possibilities).
  Combinations: choose k from n, order doesn't matter (C(n,k) possibilities).
  Permutations: all orderings of n elements (n! possibilities).
  Subset with sum = target: backtracking + pruning (sort + skip too-large).`,

    deep: `BACKTRACKING TEMPLATE:

function backtrack(state, choices, result) {
  if (isSolution(state)) { result.push(clone(state)); return; }
  for (const choice of choices) {
    if (isValid(state, choice)) {
      applyChoice(state, choice);
      backtrack(state, remainingChoices(choices, choice), result);
      undoChoice(state, choice);  // THE BACKTRACK STEP
    }
  }
}

EFFICIENCY THROUGH PRUNING:

CONSTRAINT PRUNING:
  Check validity before recursing.
  "Will adding this element violate any constraint?" → skip it.
  Examples: N-queens column/diagonal check, Sudoku digit validity.

DUPLICATE SKIPPING:
  For combination/subset problems with duplicates:
  Sort input first. Skip if current equals previous AT THE SAME LEVEL.
  if (i > start && arr[i] === arr[i-1]) continue;

EARLY TERMINATION:
  If sum > target (for sorted array): break out of inner loop.
  if (remaining < 0) return;

FORWARD CHECKING:
  Check if FUTURE choices could possibly complete the solution.
  If no valid assignments remain for any variable: prune immediately.

STATE REPRESENTATION:
  Often: modify-in-place and undo (more memory-efficient).
  Or: pass a new state copy (cleaner but uses O(n) per recursive call).
  Choose based on whether the state is cheap to copy.

COMMON BACKTRACKING PROBLEMS AND THEIR DECISIONS:
  Subsets: include/exclude each element. No duplicates in output.
  Subsets with duplicates: sort first, skip same element at same level.
  Permutations: each element used exactly once, order matters. Use used[] array.
  Combinations: choose k elements, start index advances to avoid repeats.
  Combination Sum: allow repeat use of same element, start index stays.
  Palindrome Partition: split string at every valid palindrome prefix.
  N-Queens: place queen in each row, try each column, check conflicts.
  Word Search: DFS on grid, mark visited, unmark on backtrack.`,

    code: `// SUBSETS ─────────────────────────────────────────────
function subsets(nums) {
  const result = [];
  function backtrack(start, current) {
    result.push([...current]);  // add current subset (including empty)
    for (let i = start; i < nums.length; i++) {
      current.push(nums[i]);           // include nums[i]
      backtrack(i + 1, current);       // recurse with elements after i
      current.pop();                   // UNDO — exclude nums[i]
    }
  }
  backtrack(0, []);
  return result;
}

// Subsets with duplicates
function subsetsWithDup(nums) {
  nums.sort((a, b) => a - b);  // sort to group duplicates
  const result = [];
  function backtrack(start, current) {
    result.push([...current]);
    for (let i = start; i < nums.length; i++) {
      if (i > start && nums[i] === nums[i-1]) continue;  // skip duplicate at same level
      current.push(nums[i]);
      backtrack(i + 1, current);
      current.pop();
    }
  }
  backtrack(0, []);
  return result;
}


// PERMUTATIONS ────────────────────────────────────────
function permutations(nums) {
  const result = [];
  const used   = new Array(nums.length).fill(false);
  function backtrack(current) {
    if (current.length === nums.length) { result.push([...current]); return; }
    for (let i = 0; i < nums.length; i++) {
      if (used[i]) continue;
      used[i] = true;
      current.push(nums[i]);
      backtrack(current);
      current.pop();
      used[i] = false;
    }
  }
  backtrack([]);
  return result;
}

// Permutations with duplicates
function permutationsUnique(nums) {
  nums.sort((a, b) => a - b);
  const result = [], used = new Array(nums.length).fill(false);
  function backtrack(current) {
    if (current.length === nums.length) { result.push([...current]); return; }
    for (let i = 0; i < nums.length; i++) {
      if (used[i]) continue;
      // Skip if same value as previous AND previous is not in current permutation
      // (This ensures we only count unique permutations)
      if (i > 0 && nums[i] === nums[i-1] && !used[i-1]) continue;
      used[i] = true;
      current.push(nums[i]);
      backtrack(current);
      current.pop();
      used[i] = false;
    }
  }
  backtrack([]);
  return result;
}


// COMBINATION SUM ─────────────────────────────────────
function combinationSum(candidates, target) {
  candidates.sort((a, b) => a - b);  // sort for pruning
  const result = [];
  function backtrack(start, current, remaining) {
    if (remaining === 0) { result.push([...current]); return; }
    for (let i = start; i < candidates.length; i++) {
      if (candidates[i] > remaining) break;  // PRUNING: sorted, so all further are also too big
      current.push(candidates[i]);
      backtrack(i, current, remaining - candidates[i]);  // i not i+1: can reuse same element
      current.pop();
    }
  }
  backtrack(0, [], target);
  return result;
}


// N-QUEENS ────────────────────────────────────────────
function solveNQueens(n) {
  const result = [];
  const cols    = new Set();
  const diag1   = new Set();  // row - col (top-left to bottom-right)
  const diag2   = new Set();  // row + col (top-right to bottom-left)
  const board   = Array.from({ length: n }, () => new Array(n).fill("."));

  function backtrack(row) {
    if (row === n) {
      result.push(board.map(r => r.join("")));
      return;
    }
    for (let col = 0; col < n; col++) {
      if (cols.has(col) || diag1.has(row - col) || diag2.has(row + col)) continue;
      // Place queen
      board[row][col] = "Q";
      cols.add(col); diag1.add(row - col); diag2.add(row + col);
      backtrack(row + 1);
      // Remove queen (BACKTRACK)
      board[row][col] = ".";
      cols.delete(col); diag1.delete(row - col); diag2.delete(row + col);
    }
  }
  backtrack(0);
  return result;
}


// WORD SEARCH (grid backtracking) ─────────────────────
function wordSearch(board, word) {
  const rows = board.length, cols = board[0].length;
  function dfs(r, c, i) {
    if (i === word.length) return true;
    if (r < 0 || r >= rows || c < 0 || c >= cols || board[r][c] !== word[i]) return false;
    const temp = board[r][c];
    board[r][c] = "#";  // mark visited (modify in-place to avoid extra space)
    const found = dfs(r+1,c,i+1) || dfs(r-1,c,i+1) || dfs(r,c+1,i+1) || dfs(r,c-1,i+1);
    board[r][c] = temp;  // UNDO — unmark (restore original)
    return found;
  }
  for (let r = 0; r < rows; r++)
    for (let c = 0; c < cols; c++)
      if (dfs(r, c, 0)) return true;
  return false;
}


// PALINDROME PARTITIONING ─────────────────────────────
function partition(s) {
  const result = [];
  function isPalin(str, l, r) {
    while (l < r) if (str[l++] !== str[r--]) return false;
    return true;
  }
  function backtrack(start, current) {
    if (start === s.length) { result.push([...current]); return; }
    for (let end = start + 1; end <= s.length; end++) {
      if (isPalin(s, start, end - 1)) {
        current.push(s.slice(start, end));
        backtrack(end, current);
        current.pop();
      }
    }
  }
  backtrack(0, []);
  return result;
}`,

    bugs: `// BUG 1: Forgetting to clone the current path before pushing to result

function subsetsBad(nums) {
  const result = [];
  function backtrack(start, current) {
    result.push(current);  // BUG: pushes REFERENCE to current, not a copy
    for (let i = start; i < nums.length; i++) {
      current.push(nums[i]);
      backtrack(i + 1, current);
      current.pop();  // current is mutated — all references in result also change
    }
  }
  backtrack(0, []);
  return result;
  // All entries in result end up as the same empty array at the end (last state of current).
}

function subsetsGood(nums) {
  const result = [];
  function backtrack(start, current) {
    result.push([...current]);  // CLONE with spread — snapshot of current state
    for (let i = start; i < nums.length; i++) {
      current.push(nums[i]);
      backtrack(i + 1, current);
      current.pop();
    }
  }
  backtrack(0, []);
  return result;
}


// BUG 2: Not undoing state changes (the critical backtracking bug)

function wordSearchBad(board, word) {
  const visited = new Set();
  function dfs(r, c, i) {
    if (i === word.length) return true;
    const key = r + "," + c;
    if (visited.has(key) || board[r][c] !== word[i]) return false;
    visited.add(key);   // mark
    const found = dfs(r+1,c,i+1) || dfs(r-1,c,i+1) || dfs(r,c+1,i+1) || dfs(r,c-1,i+1);
    // BUG: visited.delete(key) is MISSING
    // Without undo: once a cell is visited in any path, it's PERMANENTLY excluded.
    // The path [A,B,C] marks A, B, C as visited. When trying path [A,D,C]:
    // C is already marked visited — not available. Wrong.
    return found;
  }
  // ...
}

function wordSearchGood(board, word) {
  const visited = new Set();
  function dfs(r, c, i) {
    if (i === word.length) return true;
    if (r < 0 || r >= board.length || c < 0 || c >= board[0].length) return false;
    const key = r + "," + c;
    if (visited.has(key) || board[r][c] !== word[i]) return false;
    visited.add(key);
    const found = dfs(r+1,c,i+1) || dfs(r-1,c,i+1) || dfs(r,c+1,i+1) || dfs(r,c-1,i+1);
    visited.delete(key);  // UNDO — remove from visited so other paths can use this cell
    return found;
  }
  for (let r = 0; r < board.length; r++)
    for (let c = 0; c < board[0].length; c++)
      if (dfs(r, c, 0)) return true;
  return false;
}


// BUG 3: Wrong duplicate-skipping condition

function combinationSumDupsBad(nums, target) {
  nums.sort((a, b) => a - b);
  const result = [];
  function backtrack(start, current, remaining) {
    if (remaining === 0) { result.push([...current]); return; }
    for (let i = start; i < nums.length; i++) {
      if (i > 0 && nums[i] === nums[i-1]) continue;  // BUG: should be i > start
      // i > 0 skips ALL occurrences after the first one globally.
      // i > start skips ONLY when we're at the same level (same start position).
      // [1,1,2], target=3: [1,2] should appear. With i > 0, the second 1 is ALWAYS skipped.
      current.push(nums[i]);
      backtrack(i + 1, current, remaining - nums[i]);
      current.pop();
    }
  }
  backtrack(0, [], target);
  return result;
}`,

    challenge: `// CHALLENGE: Implement these backtracking problems.
// For each: draw the decision tree for a small example before coding.
// State explicitly: what is a "choice", what is a "constraint", what is the "undo" step.

// Part 1: Core patterns
//   a) letterCombinations(digits): given phone digit string like "23",
//      return all possible letter combinations. "2"=["a","b","c"], "3"=["d","e","f"].
//   b) generateParentheses(n): all valid strings of n pairs of parentheses.
//      Constraint: open count ≤ n, close count ≤ open count.
//   c) combinationsOfSizeK(n, k): all combinations of k numbers from 1..n.

// Part 2: Harder pruning
//   a) restoreIPAddresses(s): return all valid IP addresses from a string of digits.
//      Each octet must be 0-255, no leading zeros.
//      Prune: if remaining string is too long or too short for remaining octets.
//   b) sudokuSolver(board): solve a 9×9 sudoku.
//      For each empty cell: try digits 1-9, check row/col/box constraints, recurse.
//      Return the solved board (exactly one solution guaranteed).
//   c) expressionAddOperators(num, target): add +, -, * operators between digits
//      to reach target value. Return all valid expressions.
//      Tricky: multiplication changes the running total retroactively.

// Part 3: State machine
//   Design a permission path finder:
//   Given a role hierarchy where roles can inherit from other roles,
//   and permissions assigned to roles, find all paths from a given role to a given permission.
//   A path is: [role1 → inherits → role2 → inherits → role3 → has → permission].
//   Detect cycles in the role hierarchy (role A inherits from role B inherits from role A).
//   Return: all unique paths (no cycles), or empty array if permission is not reachable.
//
//   Input: { roles: {admin: ["editor"], editor: ["viewer"], viewer: []},
//            permissions: {admin: ["delete"], editor: ["write"], viewer: ["read"]} }
//   findPaths("viewer", "read") → [["viewer", "read"]]
//   findPaths("admin", "read") → [["admin","editor","viewer","read"]]`
  },

  {
    id: 10,
    title: "Problem-Solving Framework",
    tag: "Patterns · Recognition · Interview Strategy",
    color: "#e8943a",
    tldr: "DSA interview success is not about memorizing 200 problems. It is about recognizing the 15 fundamental patterns. When you see a problem, you pattern-match to the right framework, not the right solution. This meta-skill — moving from problem statement to algorithm in under 5 minutes — is what separates candidates who practice randomly from those who practice deliberately.",
    why: `After mastering the individual topics, there is a higher-order skill: given an unfamiliar problem, recognizing which pattern to apply.

This matters because:
  - Companies ask novel problems, not problems you've seen before.
  - There are ~15 fundamental patterns that cover ~95% of DSA problems.
  - Once you recognize the pattern, the code is mostly template.
  - The recognition skill is what interviewers are actually testing.

This also matters for backend development:
  - Performance problem: what is the complexity? Can I use a better structure?
  - Algorithm question: is this a graph problem in disguise? A DP problem?
  - System design: can this operation be done in O(log n) instead of O(n)?

The framework: see problem → identify constraints → recognize pattern → validate approach → code → test edge cases. This gives structure to the chaotic feeling of staring at a blank screen.`,

    analogy: `PATTERN RECOGNITION as a MEDICAL DIAGNOSIS:

A junior doctor sees a patient: "I don't know what this is."
A senior doctor sees the same patient: "This is pattern X — here's the treatment."

The senior doctor is not smarter. They have seen more patterns.
They have a MENTAL TEMPLATE for each disease.
The same symptoms → the same pattern → the same treatment.

THE 15 PATTERNS:
  1. Two Pointers         → sorted array, pair problems
  2. Sliding Window       → subarray/substring with condition
  3. Fast & Slow Pointers → linked list cycle, middle
  4. Merge Intervals      → overlapping ranges
  5. Cyclic Sort          → array of nums in range 1..n
  6. Linked List Reversal → reverse a portion of a linked list
  7. Tree BFS             → level order, shortest path in tree
  8. Tree DFS             → path problems, serialization
  9. Binary Search        → sorted space, "minimum satisfying X"
  10. Hash Map/Set        → pairs, duplicates, frequency
  11. Heap/Priority Queue → top-k, streaming min/max
  12. Prefix Sum          → range queries, subarray sums
  13. Backtracking        → generate all possibilities, constraints
  14. Dynamic Programming → optimization, counting, overlapping subproblems
  15. Graph BFS/DFS       → connectivity, shortest path, dependencies

CLUE WORDS that point to a pattern:
  "sorted array"          → Two Pointers or Binary Search
  "K elements" or "K closest" → Heap
  "all combinations/permutations" → Backtracking
  "maximum/minimum subarray" → Sliding Window or DP
  "count subarrays with sum" → Prefix Sum + Hash Map
  "shortest path"         → BFS (unweighted) or Dijkstra (weighted)
  "dependencies" or "ordering" → Topological Sort
  "can reach", "connected" → Graph DFS/BFS or Union-Find
  "minimum cost to convert" → DP (Edit Distance family)
  "intervals"             → Merge Intervals or Greedy Sort`,

    deep: `THE PROBLEM-SOLVING FRAMEWORK:

STEP 1 — Read carefully, identify:
  What type of input? (Array, string, tree, graph, linked list, matrix?)
  What type of output? (Boolean, integer, list, modified input?)
  Are there constraints? (Sorted? No extra space? Single pass?)
  What is n? (< 100? < 10,000? < 10⁷? This determines acceptable complexity.)

STEP 2 — Think brute force first:
  What is the obvious, naive solution?
  What is its complexity?
  This anchors your thinking: "O(n²) brute force. Can I do O(n)?"

STEP 3 — Pattern match:
  Does this look like any pattern you know?
  Use the clue words.
  If unclear: try a small example by hand. What operation do you keep doing?

STEP 4 — Define subproblem / invariant:
  For DP: "dp[i] means..."
  For sliding window: "the window always satisfies..."
  For two pointers: "left ≤ right, and the answer lies between them..."

STEP 5 — Code skeleton first:
  Write function signature, return type.
  Write base cases.
  Write the main loop/recursion skeleton.
  Fill in the logic.
  Do NOT start typing random code — build structure first.

STEP 6 — Test with examples:
  Trace through the given example by hand.
  Check edge cases: empty input, single element, all same, sorted, reverse sorted.

STEP 7 — Complexity analysis:
  Time: count the loops, recursion depth.
  Space: what data structures grow with input?

INTERVIEW TIPS:
  Talk while you think — interviewers credit your reasoning, not just the code.
  "I see this is a sorted array with a target. This suggests two pointers or binary search."
  If stuck: try the brute force, explain why it's too slow, think about what information you're discarding.
  Don't code without a plan — "let me think for a minute" is fine.
  Testing: trace through your code with the example. Don't just submit.

DAILY PRACTICE STRATEGY:
  Don't solve 20 random problems. Solve 3 deliberately:
  1. Identify the pattern BEFORE looking at hints.
  2. Code from scratch.
  3. Analyze complexity.
  4. Look at optimal solution. Note what you missed.
  5. Solve a variation the next day (not the same problem — a variation).
  
  After 3 months: 270 problems with deep understanding > 600 problems with shallow understanding.`,

    code: `// THE 15 PATTERNS WITH RECOGNITION CRITERIA ────────────

const PATTERNS = {

  "Two Pointers": {
    signals: ["sorted array", "pair with target", "remove duplicates in-place", "palindrome"],
    template: () => {
      // left = 0, right = n - 1
      // while (left < right) { ... left++/right-- based on condition }
    },
    complexity: "O(n) time, O(1) space",
    examples: ["Two Sum II", "3Sum", "Container With Most Water", "Palindrome"]
  },

  "Sliding Window": {
    signals: ["subarray/substring with condition", "k-length window", "longest/smallest"],
    template: () => {
      // left = 0
      // for right in range(n):
      //   add arr[right] to window
      //   while window invalid: remove arr[left], left++
      //   update answer
    },
    complexity: "O(n) time, O(k) space",
    examples: ["Longest Substring Without Repeat", "Min Window Substring", "Max Sum Subarray K"]
  },

  "Binary Search": {
    signals: ["sorted array", "find minimum/maximum satisfying condition", "rotated sorted"],
    template: () => {
      // lo = 0, hi = n - 1
      // while lo <= hi:
      //   mid = lo + (hi - lo) >> 1
      //   if condition: hi = mid - 1 (or lo = mid + 1)
      //   else: lo = mid + 1 (or hi = mid - 1)
    },
    complexity: "O(log n) time, O(1) space",
    examples: ["Search in Rotated Array", "Find Peak Element", "Koko Eating Bananas"]
  },

  "Hash Map/Set": {
    signals: ["find pair", "count frequency", "seen before", "group by", "check membership"],
    template: () => {
      // const map = new Map()
      // for (const x of arr):
      //   if (map.has(target - x)) return answer
      //   map.set(x, index)
    },
    complexity: "O(n) time, O(n) space",
    examples: ["Two Sum", "Group Anagrams", "Top K Frequent", "Subarray Sum Equals K"]
  },

  "Heap": {
    signals: ["top K", "K closest", "median stream", "merge K sorted", "scheduling"],
    template: () => {
      // const heap = new MinHeap()
      // for element: heap.push(element); if heap.size > k: heap.pop()
      // result: heap contents
    },
    complexity: "O(n log k) time, O(k) space",
    examples: ["Kth Largest Element", "Top K Frequent Words", "Merge K Sorted Lists"]
  },

  "Tree DFS": {
    signals: ["path sum", "max depth", "validate BST", "serialize", "path exists"],
    template: () => {
      // function dfs(node, state):
      //   if !node: return baseCase
      //   leftResult  = dfs(node.left,  updatedState)
      //   rightResult = dfs(node.right, updatedState)
      //   return combine(node.val, leftResult, rightResult)
    },
    complexity: "O(n) time, O(h) space (h = height)",
    examples: ["Max Depth", "Path Sum", "Diameter", "Lowest Common Ancestor"]
  },

  "BFS": {
    signals: ["level order", "shortest path", "nearest", "minimum steps"],
    template: () => {
      // const queue = [start], visited = new Set([start])
      // while queue.length:
      //   const size = queue.length  // current level
      //   for i in size: node = queue.shift(); process; enqueue unvisited neighbors
    },
    complexity: "O(V + E) time and space",
    examples: ["Level Order Traversal", "Word Ladder", "Rotting Oranges", "Shortest Path"]
  },

  "Dynamic Programming": {
    signals: ["minimum/maximum", "count ways", "is possible", "overlapping choices"],
    template: () => {
      // IDENTIFY: dp[i] = "..."
      // BASE CASE: dp[0] = ..., dp[1] = ...
      // RECURRENCE: dp[i] = f(dp[i-1], dp[i-2], ..., arr[i])
      // ANSWER: dp[n]
    },
    complexity: "Usually O(n) or O(n²)",
    examples: ["Climbing Stairs", "Coin Change", "Longest Common Subsequence", "Knapsack"]
  },

  "Backtracking": {
    signals: ["all possibilities", "generate all", "constraint satisfaction", "puzzle"],
    template: () => {
      // function backtrack(state, choices):
      //   if isSolution(state): result.push(copy(state)); return
      //   for choice in choices:
      //     if isValid(state, choice):
      //       apply(state, choice)
      //       backtrack(state, updatedChoices)
      //       undo(state, choice)
    },
    complexity: "Exponential worst case, pruning helps",
    examples: ["Subsets", "Permutations", "N-Queens", "Word Search", "Sudoku"]
  },

  "Graph/Union-Find": {
    signals: ["connected components", "cycle detection", "dependency ordering", "network"],
    template: () => {
      // Union-Find:
      // const uf = new UnionFind(n)
      // for edge (u, v): uf.union(u, v)
      // uf.find(a) === uf.find(b) means a and b are connected
    },
    complexity: "O(V + E) for BFS/DFS, O(α(n)) per UF operation",
    examples: ["Number of Islands", "Course Schedule", "Accounts Merge", "Redundant Connection"]
  }
};


// PROBLEM DIAGNOSIS FUNCTION ─────────────────────────
function diagnose(problemDescription) {
  const clues = {
    twoPointers:    ["sorted", "pair", "palindrome", "remove duplicates"],
    slidingWindow:  ["subarray", "substring", "window", "consecutive", "longest without"],
    binarySearch:   ["sorted array", "minimum satisfying", "rotated", "peak element"],
    hashMap:        ["two sum", "frequency", "anagram", "duplicate", "seen before"],
    heap:           ["top k", "k closest", "median", "merge k sorted"],
    treeDFS:        ["path sum", "max depth", "validate", "serialize", "lca"],
    treeBFS:        ["level order", "nearest", "minimum steps", "word ladder"],
    dp:             ["minimum/maximum number", "count ways", "is it possible", "longest"],
    backtracking:   ["all combinations", "all permutations", "generate all", "puzzle", "n-queens"],
    graph:          ["connected", "cycle", "topological", "network", "province"]
  };

  const text    = problemDescription.toLowerCase();
  const matches = [];
  for (const [pattern, keywords] of Object.entries(clues)) {
    const found = keywords.filter(kw => text.includes(kw));
    if (found.length > 0) matches.push({ pattern, evidence: found, score: found.length });
  }
  return matches.sort((a, b) => b.score - a.score);
}


// COMPLEXITY DECISION TREE ───────────────────────────
function chooseComplexity(n) {
  if (n <= 20)         return "O(2ⁿ) or O(n!) acceptable — brute force, backtracking";
  if (n <= 100)        return "O(n³) acceptable";
  if (n <= 1000)       return "O(n²) acceptable";
  if (n <= 100000)     return "O(n log n) required";
  if (n <= 1000000)    return "O(n) required";
  if (n > 1000000)     return "O(log n) or O(1) required";
}

// Examples:
// n = 18 puzzles (sudoku 9x9 has 81 cells): backtracking acceptable
// n = 1000 (small array): O(n²) is 10⁶ operations — fine
// n = 10⁵ (typical Leetcode): O(n log n) max — use sort/heap/BST
// n = 10⁶ (large input): O(n) only — single pass with hash/two pointer
// n = 10⁹ (math problem): O(log n) — binary search or math formula`,

    bugs: `// BUG 1: Using brute force when input size demands better

// n = 100,000. Interviewer gives you time limit of 1 second.
// O(n²) = 10,000,000,000 operations at 100M ops/sec = 100 seconds. TLE.

function twoSumBad(nums, target) {
  for (let i = 0; i < nums.length; i++) {
    for (let j = i + 1; j < nums.length; j++) {
      if (nums[i] + nums[j] === target) return [i, j];
    }
  }
  return [];
  // O(n²): n=100,000 → 5 billion operations. Time limit exceeded.
}

function twoSumGood(nums, target) {
  const seen = new Map();
  for (let i = 0; i < nums.length; i++) {
    const complement = target - nums[i];
    if (seen.has(complement)) return [seen.get(complement), i];
    seen.set(nums[i], i);
  }
  return [];
  // O(n): n=100,000 → 100,000 operations. Fast enough.
}

// RECOGNIZE FROM n:
// n = 10⁵ with O(n²) solution: WILL TLE. Must find O(n) or O(n log n).


// BUG 2: Choosing DFS when BFS is needed for shortest path

function shortestPathBad(graph, start, end) {
  let shortest = Infinity;
  function dfs(node, dist, visited) {
    if (node === end) { shortest = Math.min(shortest, dist); return; }
    visited.add(node);
    for (const nb of graph[node]) {
      if (!visited.has(nb)) dfs(nb, dist + 1, visited);
    }
    visited.delete(node);
  }
  dfs(start, 0, new Set());
  return shortest;
  // DFS finds A path. It doesn't find the SHORTEST path efficiently.
  // Must explore ALL paths — exponential time. BFS finds shortest in O(V+E).
}

function shortestPathGood(graph, start, end) {
  if (start === end) return 0;
  const visited = new Set([start]);
  const queue   = [[start, 0]];
  let   head    = 0;
  while (head < queue.length) {
    const [node, dist] = queue[head++];
    for (const nb of graph[node]) {
      if (nb === end) return dist + 1;  // BFS guarantees first time reached = shortest
      if (!visited.has(nb)) { visited.add(nb); queue.push([nb, dist + 1]); }
    }
  }
  return -1;
}


// BUG 3: DP where greedy would have worked (over-engineering)

// "Find maximum subarray sum" (Kadane's algorithm)
// A student reaches for DP table when a greedy linear scan works:

function maxSubarrayDP(nums) {
  const dp = new Array(nums.length);
  dp[0] = nums[0];
  for (let i = 1; i < nums.length; i++) {
    dp[i] = Math.max(nums[i], dp[i-1] + nums[i]);  // extend or restart
  }
  return Math.max(...dp);
  // Technically correct DP — but uses O(n) extra space unnecessarily.
}

function maxSubarrayKadane(nums) {
  let maxEndingHere = nums[0], maxSoFar = nums[0];
  for (let i = 1; i < nums.length; i++) {
    maxEndingHere = Math.max(nums[i], maxEndingHere + nums[i]);
    maxSoFar      = Math.max(maxSoFar, maxEndingHere);
  }
  return maxSoFar;
  // O(n) time, O(1) space. Greedy insight: if running sum goes negative, restart.
  // This IS DP — just space-optimized to O(1).
}`,

    challenge: `// FINAL CHALLENGE: Pattern recognition and implementation sprint.

// For each problem below:
// 1. State the pattern (from the 15) and WHY you chose it (1 sentence of evidence).
// 2. State the complexity you are targeting given the constraints.
// 3. Implement the solution.
// 4. State actual time and space complexity.

// Problem 1: (n ≤ 10⁵)
//   Given an array of meeting time intervals [[start, end], ...],
//   find the minimum number of conference rooms required.
//   Pattern: ___? Why: ___

// Problem 2: (n ≤ 200)
//   Given n coins with different denominations and an amount,
//   count the number of ways to make that amount using the coins (each coin unlimited).
//   Pattern: ___? Why: ___

// Problem 3: (n ≤ 10⁵)
//   A magical string only contains 1s and 2s. The frequency of the groups
//   (consecutive same digits) follows the same pattern as the string itself: "1221121221..."
//   Count how many 1s appear in the first n characters.
//   Pattern: ___? Why: ___

// Problem 4: (n ≤ 300)
//   Given a string, find the longest palindromic substring.
//   Pattern: ___? Why: ___

// Problem 5: (n ≤ 2×10⁵)
//   Given a binary tree, each node has a value 0 or 1. Prune the tree to remove subtrees
//   containing all 0s. Return the modified root.
//   Pattern: ___? Why: ___

// Problem 6: (n ≤ 10⁵)
//   A task scheduler: given tasks (each labeled A-Z) and a cooldown n,
//   find the minimum time to execute all tasks (same task must wait n intervals).
//   Pattern: ___? Why: ___

// Problem 7: (n ≤ 100)
//   Count all structurally unique BSTs that can be made with n nodes (values 1..n).
//   Pattern: ___? Why: ___

// Problem 8: DESIGN (open-ended)
//   Design a system that supports:
//   insert(val), findMedian(): O(log n) insert, O(1) findMedian.
//   Which data structures? What is the invariant you maintain?
//   Code the full implementation.

// Scoring yourself:
// - Pattern identified correctly before coding:   5 points each
// - Correct complexity target stated:             3 points each
// - Implementation works:                         5 points each
// - Optimal complexity achieved:                  2 points each
// Max: 120 points. Target: 100+ after practicing all 9 previous concepts.`
  }
];

// ─── COMPONENTS ───────────────────────────────────────────────────────────────

// ─── DESIGN TOKENS ────────────────────────────────────────────────────────────
const BG             = "#0f0a05";   // near-black with warm undertone
const PANEL          = "#160e06";   // panels, slightly lifted
const BORDER         = "#2a1a08";   // borders, dividers
const ACCENT         = "#e8943a";   // your highlight — amber orange
const PANEL_SHADE = "#18130e"
const TEXT_PRIMARY   = "#f5e6d0";   // headings — warm white, not cold

// ─── COMPONENTS ───────────────────────────────────────────────────────────────

function CodeBlock({ code }) {
  const [copied, setCopied] = useState(false);
  return (
    <div style={{ position: "relative" }}>
      <button
        onClick={() => {
          navigator.clipboard.writeText(code);
          setCopied(true);
          setTimeout(() => setCopied(false), 2000);
        }}
        style={{
          position: "absolute", top: 10, right: 10, zIndex: 2,
          background: copied ? ACCENT + "14" : "#ffffff05",
          border: "1px solid " + (copied ? ACCENT + "40" : "#1a2838"),
          color: copied ? ACCENT : "#2e4a64",
          padding: "3px 10px", borderRadius: 3,
          fontSize: "9px", cursor: "pointer", letterSpacing: "1.5px",
          fontFamily: "'JetBrains Mono', monospace", textTransform: "uppercase",
          transition: "all .2s",
        }}
      >{copied ? "COPIED" : "COPY"}</button>
      <pre style={{
        background: PANEL_SHADE,
        border: "1px solid " + BORDER,
        borderRadius: 8, padding: "20px 18px",
        overflowX: "auto", fontSize: "11px", lineHeight: "1.9",
        color: TEXT_PRIMARY,
        fontFamily: "'JetBrains Mono', monospace",
        margin: 0, whiteSpace: "pre-wrap", wordBreak: "break-word",
      }}><code>{code}</code></pre>
    </div>
  );
}

function Badge({ text, color }) {
  return (
    <span style={{
      fontSize: "7px", letterSpacing: "2px", textTransform: "uppercase",
      color, background: color + "12", border: "1px solid " + color + "30",
      padding: "2px 8px", borderRadius: 3,
      fontFamily: "'JetBrains Mono', monospace", whiteSpace: "nowrap",
      fontWeight: 700,
    }}>{text}</span>
  );
}

const TABS = [
  { key: "why",       label: "WHY IT MATTERS" },
  { key: "analogy",   label: "ANALOGY"         },
  { key: "deep",      label: "DEEP DIVE"       },
  { key: "code",      label: "CODE"            },
  { key: "bugs",      label: "BUGS"            },
  { key: "challenge", label: "CHALLENGE"       },
];

export default function Phase5Guide() {
  const [selected,  setSelected]  = useState(null);
  const [completed, setCompleted] = useState({});
  const [tab,       setTab]       = useState("why");

  const concept  = selected !== null ? concepts[selected] : null;
  const done     = Object.values(completed).filter(Boolean).length;
  const progress = Math.round((done / concepts.length) * 100);

  useEffect(() => { if (selected !== null) setTab("why"); }, [selected]);

  return (
    <div style={{
      minHeight: "100vh", background: BG, color: TEXT_PRIMARY,
      fontFamily: "'JetBrains Mono', monospace", display: "flex", flexDirection: "column",
    }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=JetBrains+Mono:wght@300;400;500;700&family=Bebas+Neue&display=swap');
        * { box-sizing: border-box; margin: 0; padding: 0; }
        ::-webkit-scrollbar { width: 3px; height: 3px; }
        ::-webkit-scrollbar-thumb { background: #0e1628; border-radius: 2px; }
        .citem:hover { background: ${PANEL_SHADE} !important; cursor: pointer; }
        .tbtn { transition: all .15s; }
        .tbtn:hover { opacity: 1 !important; color: ${TEXT_PRIMARY} !important; }
        .navbtn:hover { border-color: ${ACCENT} !important; color: ${TEXT_PRIMARY} !important; }
      `}</style>

      {/* ─── HEADER ──────────────────────────────────────────────────────── */}
      <div style={{
        padding: "0 26px", height: 56,
        borderBottom: "1px solid " + BORDER,
        background: PANEL,
        display: "flex", alignItems: "center",
        justifyContent: "space-between", gap: 16, flexWrap: "wrap",
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
          <div style={{
            padding: "4px 10px", borderRadius: 3,
            background: ACCENT + "0a", border: "1px solid " + ACCENT + "22",
            fontSize: "7px", letterSpacing: "3px", color: ACCENT, textTransform: "uppercase",
          }}>Phase 5 / 5</div>
          <div>
            <div style={{ fontSize: "7px", color: TEXT_PRIMARY, letterSpacing: "3px", textTransform: "uppercase", marginBottom: 2 }}>
              Algorithmic Thinking
            </div>
            <div style={{ fontFamily: "'Bebas Neue'", fontSize: "clamp(15px, 2vw, 21px)", color: TEXT_PRIMARY, letterSpacing: "1.5px" }}>
              DSA — From Patterns to Solutions
            </div>
          </div>
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: 14, flexWrap: "wrap" }}>
          {concept && (
            <div style={{ display: "flex", gap: 4 }}>
              {[["◀", Math.max(0, selected - 1)], ["▶", Math.min(concepts.length - 1, selected + 1)]].map(([lbl, idx]) => (
                <button key={lbl} className="navbtn"
                  onClick={() => setSelected(idx)}
                  style={{
                    background: "transparent", border: "1px solid " + BORDER,
                    color: TEXT_PRIMARY, padding: "5px 13px", borderRadius: 4,
                    cursor: "pointer", fontSize: "10px", fontFamily: "inherit",
                    transition: "all .15s",
                  }}>{lbl}</button>
              ))}
            </div>
          )}
          <div>
            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4, fontSize: "8px", letterSpacing: "1px" }}>
              <span style={{ color: TEXT_PRIMARY }}>{done}/{concepts.length}</span>
              <span style={{ color: ACCENT, marginLeft: 12 }}>{progress}%</span>
            </div>
            <div style={{ width: 110, height: 2, background: BORDER, borderRadius: 1 }}>
              <div style={{ width: progress + "%", height: "100%", background: ACCENT, transition: "width .4s", borderRadius: 1 }} />
            </div>
          </div>
        </div>
      </div>

      <div style={{ display: "flex", flex: 1, overflow: "hidden", minHeight: "calc(100vh - 56px)" }}>

        {/* ─── SIDEBAR ─────────────────────────────────────────────────── */}
        <div style={{
          width: 228, minWidth: 228, borderRight: "1px solid " + BORDER,
          overflowY: "auto", padding: "10px 8px", background: PANEL,
        }}>
          {concepts.map((c, i) => (
            <div key={i} className="citem"
              onClick={() => setSelected(i)}
              style={{
                display: "flex", alignItems: "flex-start", gap: 8,
                padding: "9px 10px", borderRadius: 6, marginBottom: 2,
                background: selected === i ? c.color + "08" : "transparent",
                border: "1px solid " + (selected === i ? c.color + "22" : "transparent"),
                transition: "all .14s",
              }}>
              {/* checkbox */}
              <div style={{
                width: 20, height: 20, minWidth: 20, borderRadius: 3,
                border: "1px solid " + (completed[i] ? c.color : "#0e1628"),
                background: completed[i] ? c.color + "14" : "transparent",
                display: "flex", alignItems: "center", justifyContent: "center",
                fontSize: "9px", fontWeight: 700,
                color: completed[i] ? c.color : (selected === i ? TEXT_PRIMARY : "#111824"),
              }}>{completed[i] ? "✓" : i + 1}</div>
              <div>
                <div style={{
                  fontSize: "10.5px", lineHeight: "1.35", marginBottom: 4,
                  color: selected === i ? TEXT_PRIMARY : (completed[i] ? TEXT_PRIMARY : TEXT_PRIMARY),
                  textDecoration: completed[i] ? "line-through" : "none",
                  fontWeight: selected === i ? 500 : 400,
                }}>{c.title}</div>
                <Badge text={c.tag.split("·")[0].trim()} color={c.color} />
              </div>
            </div>
          ))}
        </div>

        {/* ─── CONTENT ─────────────────────────────────────────────────── */}
        {!concept ? (
          <div style={{
            flex: 1, display: "flex", alignItems: "center", justifyContent: "center",
            flexDirection: "column", gap: 10,
          }}>
            <div style={{
              fontFamily: "'Bebas Neue'", fontSize: 90, color: ACCENT,
              opacity: 0.04, letterSpacing: 6,
            }}>DSA</div>
            <div style={{ fontSize: "8px", letterSpacing: "4px", color: TEXT_PRIMARY, textTransform: "uppercase" }}>
              Select a concept to begin
            </div>
          </div>
        ) : (
          <div style={{ flex: 1, display: "flex", flexDirection: "column", overflowY: "auto" }}>

            {/* ─ Concept header ─ */}
            <div style={{ padding: "20px 28px 0", background: PANEL, borderBottom: "1px solid " + BORDER }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 12, marginBottom: 12, flexWrap: "wrap" }}>
                <div>
                  <Badge text={concept.tag} color={concept.color} />
                  <h2 style={{
                    fontFamily: "'Bebas Neue'",
                    fontSize: "clamp(20px, 2.5vw, 30px)",
                    color: TEXT_PRIMARY, letterSpacing: "1px",
                    marginTop: 10, lineHeight: 1.15,
                  }}>{concept.title}</h2>
                </div>
                <button
                  onClick={() => setCompleted(p => ({ ...p, [selected]: !p[selected] }))}
                  style={{
                    padding: "7px 16px", cursor: "pointer", fontFamily: "inherit",
                    background: completed[selected] ? "transparent" : concept.color + "10",
                    border: "1px solid " + (completed[selected] ? BORDER : concept.color + "35"),
                    borderRadius: 5, fontSize: "8px", letterSpacing: "2px",
                    textTransform: "uppercase",
                    color: completed[selected] ? TEXT_PRIMARY : concept.color,
                    transition: "all .2s", marginTop: 8, whiteSpace: "nowrap",
                  }}>{completed[selected] ? "✓  DONE" : "MARK DONE"}</button>
              </div>

              {/* TLDR */}
              <div style={{
                padding: "12px 16px", marginBottom: 14,
                background: PANEL_SHADE,
                borderLeft: "2px solid " + concept.color + "50",
                border: "1px solid " + concept.color + "18",
                borderRadius: 7, fontSize: "11.5px",
                color: TEXT_PRIMARY,
                lineHeight: "1.8",
              }}>
                <span style={{
                  color: concept.color, fontSize: "7px",
                  letterSpacing: "2.5px", textTransform: "uppercase", marginRight: 10,
                }}>TLDR</span>
                {concept.tldr}
              </div>

              {/* Tabs */}
              <div style={{ display: "flex", gap: 0, overflowX: "auto", flexWrap: "nowrap" }}>
                {TABS.map(t => (
                  <button key={t.key} className="tbtn"
                    onClick={() => setTab(t.key)}
                    style={{
                      background: "transparent", border: "none",
                      borderBottom: "2px solid " + (tab === t.key ? concept.color : "transparent"),
                      color: tab === t.key ? concept.color : TEXT_PRIMARY,
                      padding: "8px 14px", fontSize: "8px", letterSpacing: "1.5px",
                      textTransform: "uppercase", cursor: "pointer",
                      fontFamily: "inherit", whiteSpace: "nowrap",
                      opacity: tab === t.key ? 1 : 0.8,
                    }}>{t.label}</button>
                ))}
              </div>
            </div>

            {/* ─ Tab body ─ */}
            <div style={{ padding: "24px 28px", flex: 1 }}>

              {tab === "code" || tab === "bugs" || tab === "challenge" ? (
                <div>
                  {tab === "bugs" && (
                    <div style={{
                      padding: "10px 14px", marginBottom: 14, borderRadius: 6,
                      background: "#220109", border: "1px solid #2a1018",
                      fontSize: "9px", color: "#8b454f", lineHeight: "1.7",
                    }}>
                      These are real mistakes. Understanding the failure mode is more valuable than the fix alone.
                    </div>
                  )}
                  {tab === "challenge" && (
                    <div style={{
                      padding: "10px 14px", marginBottom: 14, borderRadius: 6,
                      background: PANEL_SHADE, border: "1px solid " + concept.color + "18",
                      fontSize: "9px", color: TEXT_PRIMARY, lineHeight: "1.7",
                    }}>
                      Attempt before looking at code examples. Struggle is the learning. Identify the pattern before writing a single line.
                    </div>
                  )}
                  <CodeBlock code={concept[tab]} />
                </div>
              ) : (
                <div style={{
                  background: PANEL_SHADE, border: "1px solid " + BORDER,
                  borderRadius: 10, padding: "22px 24px",
                  fontSize: "11.5px", color: TEXT_PRIMARY,
                  lineHeight: "2", whiteSpace: "pre-line",
                  fontFamily: "'JetBrains Mono', monospace",
                }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 16 }}>
                    <div style={{ width: 16, height: 1, background: concept.color + "60" }} />
                    <span style={{ fontSize: "7px", letterSpacing: "3px", textTransform: "uppercase", color: concept.color }}>
                      {tab === "why" ? "Why This Matters" : tab === "analogy" ? "Mental Model" : "Under the Hood"}
                    </span>
                  </div>
                  {concept[tab]}
                </div>
              )}

              {/* ─ Footer reminder ─ */}
              <div style={{
                marginTop: 24, padding: "14px 18px",
                background: PANEL_SHADE, border: "1px solid " + concept.color + "18",
                borderRadius: 8, display: "flex", gap: 12, alignItems: "flex-start",
              }}>
                <span style={{ color: concept.color, fontSize: 10, marginTop: 2, opacity: 0.6 }}>◆</span>
                <div>
                  <div style={{
                    fontSize: "10px", letterSpacing: "1px", textTransform: "uppercase",
                    color: "#fff", opacity: 0.5, marginBottom: 6,
                  }}>Core Insight</div>
                  <p style={{ fontSize: "11px", color: TEXT_PRIMARY, lineHeight: "1.8", margin: 0 }}>
                    {concept.id === 1  && "O(n²) is fine for n=1,000. Catastrophic for n=100,000. Always analyze complexity relative to actual input size. When in doubt: n > 10,000 means O(n²) is dangerous."}
                    {concept.id === 2  && "Two pointers: sorted array or convergence toward an answer. Sliding window: maintain valid window, expand right, shrink left. Prefix sum: precompute for O(1) range queries. Recognize which pattern before coding."}
                    {concept.id === 3  && "When you need O(1) lookup, use a Set. When you need O(1) lookup with value, use a Map. Converting .includes() to .has() is a 1-line change that drops complexity from O(n²) to O(n)."}
                    {concept.id === 4  && "Always save next before overwriting curr.next. Use a dummy head to simplify boundary conditions. Slow/fast pointers for middle and cycle detection. Draw the pointer movements before writing code."}
                    {concept.id === 5  && "Tree recursion: null check first, recurse second, combine third. BST validation needs a full range, not just parent comparison. Binary search: lo + (hi-lo)>>1, not (lo+hi)/2 for overflow safety."}
                    {concept.id === 6  && "Mark visited WHEN ENQUEUING, not when dequeuing. Use iterative DFS for deep graphs to avoid stack overflow. BFS for shortest path, DFS for existence and connectivity."}
                    {concept.id === 7  && "Monotonic stack: O(n) total — each element pushed/popped once. Min-heap of size k gives top-k in O(n log k). Two heaps maintain a running median in O(log n) per addition."}
                    {concept.id === 8  && "Every DP is recursion with memory. Define dp[i] precisely. Write the recurrence. Code the base cases. Build bottom-up. Check if space reduces to O(1). Recognize knapsack: 0/1 iterates backwards, unbounded forwards."}
                    {concept.id === 9  && "Three steps for backtracking: make a choice, recurse, UNDO the choice. The undo step is non-negotiable. Clone state before pushing to result. Sort input when duplicate-skipping is needed."}
                    {concept.id === 10 && "Pattern recognition beats problem memorization. 15 patterns cover 95% of problems. Ask first: what type of output? What are the constraints? What is n? Then map to a pattern."}
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