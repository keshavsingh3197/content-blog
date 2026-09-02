---
title: Query Drills
summary: Sixteen whiteboard problems that come up again and again — Nth highest salary, top-N per group, duplicates, gaps and islands, running totals, pivot, median, consecutive days — each with multiple solutions and the trade-off between them.
tags: [SQL, Practice, Window-Functions, Interview, Database]
updated: 2026-09-02
---

# 12 — Query Drills

> **Scope:** the practical half of the track. Every problem below is one interviewers actually set,
> with the schema, more than one correct solution, and a note on **what is being tested** — because
> the follow-up ("what if there are ties?", "what if the table has 50 million rows?") is where the
> mark is won.
>
> **How to use it:** cover the answer, write your own, then compare. Getting a working query is the
> easy half; naming the trade-off is the half that gets the offer.

---

## The schema

```sql
CREATE TABLE departments (
    department_id INT PRIMARY KEY,
    name          NVARCHAR(40) NOT NULL
);

CREATE TABLE employees (
    employee_id   INT PRIMARY KEY,
    full_name     NVARCHAR(40) NOT NULL,
    email         NVARCHAR(100) NOT NULL,
    salary        DECIMAL(10,2) NOT NULL,
    hired_on      DATE NOT NULL,
    manager_id    INT NULL REFERENCES employees(employee_id),
    department_id INT NOT NULL REFERENCES departments(department_id)
);

CREATE TABLE logins (
    login_id    INT PRIMARY KEY,
    employee_id INT NOT NULL,
    login_date  DATE NOT NULL
);

CREATE TABLE sales (
    sale_id   INT PRIMARY KEY,
    sale_date DATE NOT NULL,
    region    NVARCHAR(20) NOT NULL,
    amount    DECIMAL(10,2) NOT NULL
);
```

---

## 1. Nth highest salary

> *"Find the second-highest salary."* Then: *"the Nth."* Then: *"per department."*

```sql
-- A) Correlated subquery — the classic pre-window answer
SELECT MAX(salary) AS second_highest
FROM   employees
WHERE  salary < (SELECT MAX(salary) FROM employees);

-- B) OFFSET/FETCH — "the second ROW"; needs DISTINCT to mean "the second VALUE"
SELECT DISTINCT salary
FROM   employees
ORDER  BY salary DESC
OFFSET 1 ROWS FETCH NEXT 1 ROWS ONLY;

-- C) DENSE_RANK — the general, N-parameterised answer  ← say this one
WITH ranked AS (
    SELECT salary, DENSE_RANK() OVER (ORDER BY salary DESC) AS rnk
    FROM   employees
)
SELECT DISTINCT salary FROM ranked WHERE rnk = 2;
```

> 🎯 **What is being tested:** whether you notice the ambiguity. "Second highest" can mean the
> second *distinct value* or the *second row*. With two people on 120 000, `DENSE_RANK = 2` gives
> the next value down; `ROW_NUMBER = 2` gives the second person on 120 000. **Ask which one is
> wanted**, then note that A and B return `NULL` / no rows if there is no second salary, whereas an
> interviewer may expect `NULL` explicitly.

**Per department** — the same shape, partitioned:

```sql
WITH ranked AS (
    SELECT e.full_name, d.name AS department, e.salary,
           DENSE_RANK() OVER (PARTITION BY e.department_id ORDER BY e.salary DESC) AS rnk
    FROM   employees   AS e
    JOIN   departments AS d ON d.department_id = e.department_id
)
SELECT department, full_name, salary FROM ranked WHERE rnk = 2;
```

---

## 2. Top-N per group

> *"The three highest-paid employees in each department."*

```sql
-- A) ROW_NUMBER — most portable
WITH ranked AS (
    SELECT employee_id, full_name, department_id, salary,
           ROW_NUMBER() OVER (PARTITION BY department_id
                              ORDER BY salary DESC, employee_id) AS rn
    FROM   employees
)
SELECT * FROM ranked WHERE rn <= 3;

-- B) CROSS APPLY — usually faster with an index on (department_id, salary DESC)
SELECT d.name, e.full_name, e.salary
FROM   departments AS d
CROSS  APPLY (SELECT TOP (3) full_name, salary
              FROM   employees AS e
              WHERE  e.department_id = d.department_id
              ORDER  BY e.salary DESC) AS e;
```

> 🎯 **What is being tested:** the tie policy and the plan. `ROW_NUMBER` returns exactly 3 and needs
> a tiebreaker to be deterministic; `RANK` returns *all* rows tied at third (so possibly 4+);
> `DENSE_RANK` returns everyone in the top 3 distinct salaries. And B seeks 3 rows per department
> with the right index, while A sorts every row — worth saying when the table is large.

---

## 3. Find and delete duplicates

> *"`employees` has duplicate emails. Find them, then keep only the earliest row of each."*

```sql
-- Find
SELECT email, COUNT(*) AS copies
FROM   employees
GROUP  BY email
HAVING COUNT(*) > 1;

-- Show the offending rows
SELECT * FROM employees
WHERE  email IN (SELECT email FROM employees GROUP BY email HAVING COUNT(*) > 1)
ORDER  BY email, employee_id;

-- Delete all but the first — the canonical CTE + ROW_NUMBER pattern
WITH dupes AS (
    SELECT employee_id,
           ROW_NUMBER() OVER (PARTITION BY email ORDER BY employee_id) AS rn
    FROM   employees
)
DELETE FROM dupes WHERE rn > 1;
```

> 🎯 **What is being tested:** that you can `DELETE` *through* a CTE (many candidates try
> `DELETE FROM (SELECT …)`), and that you define **which** duplicate survives. Follow-up: "how do
> you stop it happening again?" — `ALTER TABLE employees ADD CONSTRAINT UQ_employees_email UNIQUE
> (email);`. That answer is the one they are waiting for.

---

## 4. Employees earning more than their manager

```sql
SELECT e.full_name AS employee, e.salary,
       m.full_name AS manager,  m.salary AS manager_salary
FROM   employees AS e
JOIN   employees AS m ON m.employee_id = e.manager_id
WHERE  e.salary > m.salary;
```

> 🎯 **Tests:** the self join, and whether you use `JOIN` or `LEFT JOIN`. Here `INNER` is correct —
> someone with no manager cannot out-earn one. Contrast with **"list every employee and their
> manager"**, where `LEFT JOIN` is required or the CEO disappears.

---

## 5. Departments with no employees

```sql
-- ✅ NOT EXISTS — null-safe, usually the best plan
SELECT d.name FROM departments AS d
WHERE  NOT EXISTS (SELECT 1 FROM employees AS e WHERE e.department_id = d.department_id);

-- ✅ LEFT JOIN … IS NULL
SELECT d.name FROM departments AS d
LEFT   JOIN employees AS e ON e.department_id = d.department_id
WHERE  e.employee_id IS NULL;

-- ⚠️ NOT IN — returns NOTHING if any employees.department_id is NULL
SELECT d.name FROM departments AS d
WHERE  d.department_id NOT IN (SELECT department_id FROM employees);
```

> 🎯 **Tests:** the `NOT IN` / `NULL` trap. Volunteer it. See
> [04 — Anti-joins](04-joins.md#anti-joins--rows-in-a-with-no-match-in-b).

---

## 6. Department headcount — including the empty ones

```sql
SELECT d.name,
       COUNT(e.employee_id) AS headcount,       -- ✅ counts real employees: 0 for empty depts
       COUNT(*)             AS wrong_count      -- ❌ counts padded NULL rows: 1 for empty depts
FROM   departments AS d
LEFT   JOIN employees AS e ON e.department_id = d.department_id
GROUP  BY d.name
ORDER  BY headcount DESC;
```

> 🎯 **Tests:** the `COUNT(*)`-on-an-outer-join trap, and whether you reach for `LEFT JOIN` at all.
> `INNER JOIN` here silently omits every empty department — and nobody notices until a report is
> wrong.

---

## 7. Running total and moving average

```sql
SELECT sale_date, amount,
       SUM(amount) OVER (ORDER BY sale_date
                         ROWS BETWEEN UNBOUNDED PRECEDING AND CURRENT ROW) AS running_total,
       AVG(amount) OVER (ORDER BY sale_date
                         ROWS BETWEEN 6 PRECEDING AND CURRENT ROW)         AS avg_7day,
       100.0 * amount / SUM(amount) OVER ()                                AS pct_of_total
FROM   sales
ORDER  BY sale_date;
```

> ⚠️ **Write `ROWS`, not `RANGE`.** The default frame with `ORDER BY` is `RANGE`, which includes all
> *peers* — so with two sales on the same date, both rows show the same cumulative figure instead of
> incrementing. This is the trick question inside the running-total question.

---

## 8. Month-over-month growth

```sql
WITH monthly AS (
    SELECT DATEFROMPARTS(YEAR(sale_date), MONTH(sale_date), 1) AS month_start,
           SUM(amount) AS revenue
    FROM   sales
    GROUP  BY DATEFROMPARTS(YEAR(sale_date), MONTH(sale_date), 1)
)
SELECT month_start, revenue,
       LAG(revenue) OVER (ORDER BY month_start) AS prev_revenue,
       revenue - LAG(revenue) OVER (ORDER BY month_start) AS delta,
       100.0 * (revenue - LAG(revenue) OVER (ORDER BY month_start))
             / NULLIF(LAG(revenue) OVER (ORDER BY month_start), 0) AS pct_change
FROM   monthly
ORDER  BY month_start;
```

> 🎯 **Tests:** `LAG` instead of a self join, and `NULLIF` to survive a zero-revenue month. Also:
> months with **no sales at all** simply do not appear. If the requirement is a continuous series,
> you must `LEFT JOIN` a calendar table — say so.

---

## 9. Gaps and islands — consecutive login days

> *"Find each employee's streaks of consecutive login days, and their longest streak."*

The trick: subtract a row number from the date. Within a consecutive run the difference is
**constant**, so it becomes a grouping key.

```sql
WITH numbered AS (
    SELECT employee_id, login_date,
           ROW_NUMBER() OVER (PARTITION BY employee_id ORDER BY login_date) AS rn
    FROM   (SELECT DISTINCT employee_id, login_date FROM logins) AS d
),
islands AS (
    SELECT employee_id, login_date,
           DATEADD(DAY, -rn, login_date) AS island_key   -- ← constant within a streak
    FROM   numbered
)
SELECT employee_id,
       MIN(login_date) AS streak_start,
       MAX(login_date) AS streak_end,
       COUNT(*)        AS streak_length
FROM   islands
GROUP  BY employee_id, island_key
ORDER  BY employee_id, streak_start;
```

Walk through it — this is the part to say out loud:

| login_date | rn | `date - rn` | island |
| --- | --- | --- | --- |
| 2026-03-01 | 1 | 2026-02-28 | A |
| 2026-03-02 | 2 | 2026-02-28 | A |
| 2026-03-03 | 3 | 2026-02-28 | A |
| 2026-03-07 | 4 | 2026-03-03 | **B** |
| 2026-03-08 | 5 | 2026-03-03 | B |

Longest streak per employee:

```sql
… SELECT employee_id, MAX(streak_length) FROM (…the query above…) AS s GROUP BY employee_id;
```

And the **gaps** — missing days between activity:

```sql
WITH ordered AS (
    SELECT employee_id, login_date,
           LEAD(login_date) OVER (PARTITION BY employee_id ORDER BY login_date) AS next_date
    FROM   (SELECT DISTINCT employee_id, login_date FROM logins) AS d
)
SELECT employee_id,
       DATEADD(DAY, 1, login_date)  AS gap_start,
       DATEADD(DAY, -1, next_date)  AS gap_end,
       DATEDIFF(DAY, login_date, next_date) - 1 AS days_missing
FROM   ordered
WHERE  next_date IS NOT NULL
  AND  DATEDIFF(DAY, login_date, next_date) > 1;
```

> 🎯 **What is being tested:** whether you know the `date − row_number` idiom. It is the single most
> useful non-obvious SQL pattern, and it generalises to **sessionization** (group events into
> sessions when the gap exceeds 30 minutes) with `LAG` + a cumulative `SUM` of a "new session" flag.

---

## 10. Sessionization

> *"Group each employee's events into sessions, starting a new one after a 30-minute gap."*

```sql
WITH flagged AS (
    SELECT employee_id, event_at,
           CASE WHEN DATEDIFF(MINUTE,
                              LAG(event_at) OVER (PARTITION BY employee_id ORDER BY event_at),
                              event_at) > 30
                  OR LAG(event_at) OVER (PARTITION BY employee_id ORDER BY event_at) IS NULL
                THEN 1 ELSE 0 END AS is_new_session
    FROM   events
),
sessioned AS (
    SELECT employee_id, event_at,
           SUM(is_new_session) OVER (PARTITION BY employee_id ORDER BY event_at
                                     ROWS BETWEEN UNBOUNDED PRECEDING AND CURRENT ROW) AS session_no
    FROM   flagged
)
SELECT employee_id, session_no,
       MIN(event_at) AS started, MAX(event_at) AS ended, COUNT(*) AS events
FROM   sessioned
GROUP  BY employee_id, session_no;
```

> 💡 **The pattern to remember:** flag the boundary, then take a **running `SUM` of the flag** — it
> becomes an incrementing group id. Once you see it, half the "hard" window problems collapse.

---

## 11. Median

No portable `MEDIAN()` aggregate exists. Two answers.

```sql
-- A) PERCENTILE_CONT — SQL Server 2012+, PostgreSQL, Oracle. Interpolates.
SELECT DISTINCT department_id,
       PERCENTILE_CONT(0.5) WITHIN GROUP (ORDER BY salary)
           OVER (PARTITION BY department_id) AS median_salary
FROM   employees;

-- B) Portable: average the middle one or two rows
WITH ranked AS (
    SELECT department_id, salary,
           ROW_NUMBER() OVER (PARTITION BY department_id ORDER BY salary) AS rn,
           COUNT(*)     OVER (PARTITION BY department_id)                 AS n
    FROM   employees
)
SELECT department_id, AVG(salary) AS median_salary
FROM   ranked
WHERE  rn IN ((n + 1) / 2, (n + 2) / 2)      -- one row if odd, two if even
GROUP  BY department_id;
```

> 🎯 **Tests:** whether you handle the **even count** case. `(n+1)/2` and `(n+2)/2` are the same
> integer when `n` is odd and adjacent when it is even — a neat trick worth explaining rather than
> just typing.

---

## 12. Pivot — rows to columns

> *"Revenue per region as columns, one row per month."*

```sql
-- A) Conditional aggregation — portable, and what I would write
SELECT DATEFROMPARTS(YEAR(sale_date), MONTH(sale_date), 1) AS month_start,
       SUM(CASE WHEN region = 'EMEA' THEN amount ELSE 0 END) AS emea,
       SUM(CASE WHEN region = 'APAC' THEN amount ELSE 0 END) AS apac,
       SUM(CASE WHEN region = 'AMER' THEN amount ELSE 0 END) AS amer
FROM   sales
GROUP  BY DATEFROMPARTS(YEAR(sale_date), MONTH(sale_date), 1)
ORDER  BY month_start;

-- B) PIVOT — T-SQL only, and the column list must still be literal
SELECT month_start, EMEA, APAC, AMER
FROM   (SELECT DATEFROMPARTS(YEAR(sale_date), MONTH(sale_date), 1) AS month_start,
               region, amount FROM sales) AS src
PIVOT  (SUM(amount) FOR region IN ([EMEA], [APAC], [AMER])) AS p;
```

> 🎯 **Tests:** that you know pivoting requires a **known, literal** column list either way. A truly
> dynamic pivot means dynamic SQL — with an allowlist and `QUOTENAME`
> ([chapter 10](10-views-procedures-functions-triggers.md#dynamic-sql-and-injection)). The senior
> answer is usually: *pivot in the presentation layer, not in SQL.*

**Unpivot** — columns to rows — is `CROSS APPLY (VALUES …)`, which is more portable than `UNPIVOT`:

```sql
SELECT s.month_start, u.region, u.amount
FROM   monthly_wide AS s
CROSS  APPLY (VALUES ('EMEA', s.emea), ('APAC', s.apac), ('AMER', s.amer)) AS u(region, amount);
```

---

## 13. Cumulative distribution / percentile bucketing

```sql
SELECT full_name, salary,
       NTILE(4)       OVER (ORDER BY salary DESC) AS salary_quartile,
       CUME_DIST()    OVER (ORDER BY salary)      AS cume_dist,
       PERCENT_RANK() OVER (ORDER BY salary)      AS pct_rank
FROM   employees;
```

> ⚠️ `NTILE(4)` buckets by **row count**, not value, so two employees on the same salary can land in
> different quartiles. If the requirement is value-based, use `PERCENTILE_CONT` thresholds instead
> and say why.

---

## 14. Hierarchy — the full reporting chain

```sql
WITH chain AS (
    SELECT employee_id, full_name, manager_id, 0 AS level,
           CAST(full_name AS NVARCHAR(4000)) AS path
    FROM   employees WHERE manager_id IS NULL
    UNION ALL
    SELECT e.employee_id, e.full_name, e.manager_id, c.level + 1,
           CAST(c.path + N' > ' + e.full_name AS NVARCHAR(4000))
    FROM   employees AS e JOIN chain AS c ON c.employee_id = e.manager_id
)
SELECT level, REPLICATE(N'    ', level) + full_name AS org_chart, path
FROM   chain ORDER BY path
OPTION (MAXRECURSION 100);
```

Follow-ups you should be ready for: *"everyone under a given manager"* (start the anchor at that
manager instead of `IS NULL`); *"how deep is the tree"* (`MAX(level)`); *"total salary cost of a
manager's whole org"* (`SUM(salary)` over the recursive result).

> 🎯 **Tests:** recursive CTE mechanics, plus whether you mention **cycle protection** and
> `MAXRECURSION`. See [06 — Recursive CTEs](06-subqueries-ctes-and-recursion.md#recursive-ctes).

---

## 15. Fill the gaps in a date series

> *"Daily revenue for March, showing 0 for days with no sales."*

```sql
WITH calendar AS (
    SELECT CAST('2026-03-01' AS DATE) AS d
    UNION ALL SELECT DATEADD(DAY, 1, d) FROM calendar WHERE d < '2026-03-31'
)
SELECT c.d AS sale_date, COALESCE(SUM(s.amount), 0) AS revenue
FROM   calendar AS c
LEFT   JOIN sales AS s ON s.sale_date = c.d
GROUP  BY c.d
ORDER  BY c.d
OPTION (MAXRECURSION 400);
```

> 🎯 **Tests:** the recognition that **a `GROUP BY` cannot invent rows that do not exist**. You need
> a driving date source and a `LEFT JOIN`. In production that source is a permanent **calendar
> table**, not a recursive CTE.

---

## 16. `UPDATE` from a join, and upsert

```sql
-- UPDATE … FROM (T-SQL). PostgreSQL: UPDATE … FROM. MySQL: UPDATE a JOIN b SET …
UPDATE e
SET    e.salary = e.salary * b.multiplier
FROM   employees AS e
JOIN   department_bonus AS b ON b.department_id = e.department_id;

-- Upsert: MERGE (ANSI) — one statement, one pass
MERGE dbo.employee_targets AS tgt
USING (SELECT @employee_id AS employee_id, @target AS target) AS src
   ON tgt.employee_id = src.employee_id
WHEN MATCHED     THEN UPDATE SET tgt.target = src.target
WHEN NOT MATCHED THEN INSERT (employee_id, target) VALUES (src.employee_id, src.target);
```

> ⚠️ **`MERGE` in SQL Server has a long history of bugs and concurrency hazards** — under
> concurrency it can raise duplicate-key errors unless you take `WITH (HOLDLOCK)` on the target.
> Many practitioners deliberately avoid it in favour of an explicit
> `UPDATE`-then-`INSERT-WHERE-NOT-EXISTS` inside a transaction, or `INSERT … ON CONFLICT` in
> PostgreSQL / `INSERT … ON DUPLICATE KEY UPDATE` in MySQL. Knowing that `MERGE` is *not* the safe
> default is a strong senior signal.

> ⚠️ **`UPDATE … FROM` with a join that matches multiple rows** updates the row **once**, with an
> arbitrary one of the matches — silently, no error. If the join can fan out, aggregate first.

---

## The 8 patterns behind all 16

If you internalise these, you can derive the rest at the whiteboard:

| Pattern | Recognise it by | Tool |
| --- | --- | --- |
| Rank within a group | "top N per …", "Nth highest" | `ROW_NUMBER`/`RANK`/`DENSE_RANK` + `PARTITION BY` |
| Compare to a neighbour | "growth", "change since", "previous" | `LAG` / `LEAD` |
| Compare to the group | "above their department average", "% of total" | aggregate `OVER (PARTITION BY …)` |
| Running / rolling | "cumulative", "moving average", "to date" | aggregate `OVER (… ROWS BETWEEN …)` |
| Consecutive runs | "streak", "consecutive", "session", "gap" | `date − ROW_NUMBER`, or flag + running `SUM` |
| Existence / absence | "who has never", "with no" | `EXISTS` / `NOT EXISTS` |
| Rows → columns | "as columns", "one column per month" | conditional aggregation (`SUM(CASE …)`) |
| Invent missing rows | "including days with none" | a calendar/numbers table + `LEFT JOIN` |

> 🎯 **The habit that earns marks:** before writing, say the grain out loud — *"one row per employee
> per month"*. Most wrong answers are right queries at the wrong grain. Then state your assumptions
> about `NULL`s and ties before the interviewer has to ask.

---

**Prev:** [11 — SQL from .NET](11-sql-from-dotnet.md) ·
**Next:** [13 — Schema Change & Migrations](13-schema-change-and-migrations.md) ·
**Up:** [SQL interview hub](readme.md)
