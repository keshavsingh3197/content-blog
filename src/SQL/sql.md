# SQL

- SQL stands for Structured Query Language , and it is used to communicate with the Database. 
- This is a standard language used to perform tasks such as retrieval, updation, insertion and deletion of data from a database

difference between SQL and MySQL?

## SQL vs MySQL

| SQL | MySQL|
| --- | --- |
| SQL is a standard language which stands for Structured Query Language based on the English language | MySQL is a database management system. |
| SQL is the core of the relational database which is used for accessing and managing database. | MySQL is an RDMS (Relational Database Management System) such as SQL Server, Informix etc. |

## What do you mean by DBMS? What are its different types

- Database Management System (DBMS) is a  software application that interacts with the user, applications, and the database itself to capture and analyze data.
- A database is a structured collection of data.

- A DBMS allows a user to interact with the database. The data stored in the database can be modified, retrieved and deleted and can be of any type like strings, numbers, images, etc.

- There are two types of DBMS:

```text
Relational Database Management System: The data is stored in relations (tables). Example – MySQL.
Non-Relational Database Management System: There is no concept of relations, tuples and attributes.  Example – MongoDB
```

## Database

Database is nothing but an organized form of data for easy access, storing, retrieval and managing of data. This is also known as structured form of data which can be accessed in many ways.

Example: School Management Database, Bank Management Database.

## What are tables and Fields?

A table is a set of data that are organized in a model with Columns and Rows. Columns can be categorized as vertical, and Rows are horizontal. A table has specified number of column called fields but can have any number of rows which is called record.

## Primary key

- A primary key is a combination of fields which uniquely specify a row.
- This is a special kind of unique key, and it has implicit `NOT NULL` constraint. It means, Primary key values cannot be NULL.
- A Primary key constraint has automatic unique constraint defined on it.

## Unique key?

- A Unique key constraint uniquely identified each record in the database. This provides uniqueness for the column or set of columns.
- A Primary key constraint has automatic unique constraint defined on it. But not, in the case of Unique Key.
- There can be many unique constraint defined per table, but only one Primary key constraint defined per table.

## Foreign key?

- A foreign key is one table which can be related to the primary key of another table.
- Relationship needs to be created between two tables by referencing foreign key with the primary key of another table.

## What are some common clauses used with SELECT query in SQL?

- `WHERE clause`: In SQL, the WHERE clause is used to filter records that are required depending on certain criteria.
- `ORDER BY clause`: The ORDER BY clause in SQL is used to sort data in ascending (ASC) or descending (DESC) order depending on specified field(s) (DESC).
- `GROUP BY clause`: GROUP BY clause in SQL is used to group entries with identical data and may be used with aggregation methods to obtain summarised database results.
- `HAVING clause` in SQL is used to filter records in combination with the GROUP BY clause. It is different from WHERE, since the WHERE clause cannot filter aggregated records.

## What is Cursor? How to use a Cursor?

`A cursor in the context of databases is a database object used to retrieve, manipulate, and navigate through a result set row-by-row. When you execute a query that returns multiple rows, you can use a cursor to move through the results one at a time, which can be useful for performing operations on each row individually.`

- After any variable declaration, DECLARE a cursor. A SELECT Statement must always be coupled with the cursor definition.
- To start the result set, move the cursor over it. Before obtaining rows from the result set, the OPEN statement must be executed.
- To retrieve and go to the next row in the result set, use the FETCH command.
- To disable the cursor, use the CLOSE command.
- Finally, use the DEALLOCATE command to remove the cursor definition and free up the resources connected with it.

<details>
<summary></summary>

```sql
-- Example table 'Employees' with columns 'ID', 'FirstName', 'LastName', and 'Salary'

-- Step 1: Declare the cursor
DECLARE employee_cursor CURSOR FOR
SELECT FirstName, LastName, Salary FROM Employees WHERE Salary < 50000;

-- Step 2: Open the cursor
OPEN employee_cursor;

-- Step 3: Fetch the next row from the cursor
DECLARE @FirstName NVARCHAR(50), @LastName NVARCHAR(50), @Salary DECIMAL(10,2);

FETCH NEXT FROM employee_cursor INTO @FirstName, @LastName, @Salary;

-- Process each row (loop through the result set)
WHILE @@FETCH_STATUS = 0
BEGIN
    -- Example of processing: Print a message for each employee
    PRINT 'Employee ' + @FirstName + ' ' + @LastName + ' earns less than 50000.';

    -- Fetch the next row
    FETCH NEXT FROM employee_cursor INTO @FirstName, @LastName, @Salary;
END

-- Step 4: Close the cursor
CLOSE employee_cursor;

-- Step 5: Deallocate the cursor
DEALLOCATE employee_cursor;
```

</details>

## What is an SQL statement? Give some examples
- An SQL statement is simply a command you write to **talk to a database**.
- It tells the database what to **do with data** — like get it, add it, update it, or delete it.
- In one line:
> SQL statement = instruction to manage data in a database

<details>
    <summary>Example</summary>

    🔹 Common Types with Examples
    Get data (READ)
    SELECT * FROM Employees;

    👉 Fetch all records from Employees table

    Insert data (CREATE)
    INSERT INTO Employees (Name, Age) VALUES ('Keshav', 25);

    👉 Add new record

    Update data
    UPDATE Employees SET Age = 26 WHERE Name = 'Keshav';

    👉 Modify existing data

    Delete data
    DELETE FROM Employees WHERE Name = 'Keshav';

    👉 Remove data
    
</details>


## What types of SQL commands (or SQL subsets) do you know?

- SQL Commands are the different types of instructions used to interact with a database.
- Instead of memorizing randomly, understand them in 5 simple categories 👇

### 🔹 1. DQL (Data Query Language)

👉 Used to fetch/read data

```sql
SELECT * FROM Employees;
```

✔ Only command: SELECT

### 🔹 2. DML (Data Manipulation Language)

👉 Used to change data inside table

```sql
INSERT INTO Employees VALUES (1, 'Keshav');
UPDATE Employees SET Name = 'Ram' WHERE Id = 1;
DELETE FROM Employees WHERE Id = 1;
```

✔ Commands:

- INSERT
- UPDATE
- DELETE

### 🔹 3. DDL (Data Definition Language)

👉 Used to create or change structure (tables, schema)

```sql
CREATE TABLE Employees (Id INT, Name VARCHAR(50));
ALTER TABLE Employees ADD Age INT;
DROP TABLE Employees;
```
✔ Commands:

- CREATE
- ALTER
- DROP
- TRUNCATE
- ADD COLUMN

### 🔹 4. TCL (Transaction Control Language)

👉 Used to control transactions (save or undo changes)

```sql
COMMIT;
ROLLBACK;
SAVEPOINT A;
SET TRANSACTION
```

✔ Commands:

- COMMIT
- ROLLBACK
- SAVEPOINT
- SET TRANSACTION

### 🔹 5. DCL (Data Control Language)

👉 Used to control permissions

```sql
GRANT SELECT ON Employees TO User1;
REVOKE SELECT ON Employees FROM User1;
```

✔ Commands:

- GRANT
- REVOKE

### 🔥 Simple Memory Trick
- DQL → Read
- DML → Change Data
- DDL → Structure
- TCL → Save/Undo
- DCL → Permissions

✔ Final Understanding
### 👉 SQL Commands = ways to

- Read data
- Modify data
- Create tables
- Control transactions
- Manage access

---

## INDEX

- An index in SQL is used to make data retrieval faster.
- Indexes are especially efficient for large databases, where they significantly enhance query performance.

### 🔹 Simple idea

Think of a book 📘
- 👉 Without index → you scan every page
- 👉 With index → you jump directly to the page

Same in database:
- 👉 Index helps database find data quickly without scanning full table

### 🔹 Definition
    - Index = a data structure that improves the speed of SELECT queries

### 🔹 Example
    - CREATE INDEX idx_name ON Employees(Name);
    - 👉 Now searching by Name becomes faster:
    - SELECT * FROM Employees WHERE Name = 'Keshav';

### 🔹 Types of Index

- 1. **Primary Index**
    - Automatically created on PRIMARY KEY
    - Unique + not null

- 2. **Unique Index**
    - CREATE UNIQUE INDEX idx_email ON Employees(Email);
    - 👉 No duplicate values allowed

- 3. **Composite Index**
    - CREATE INDEX idx_name_age ON Employees(Name, Age);
    - 👉 Works on multiple columns

- 4. **Clustered Index**
    - Sorts actual table data
    - Only one per table

- 5. Non-Clustered Index
    - Separate structure
    - Can have many

- 🔹 Advantages
    - ✔ Faster search (SELECT)
    - ✔ Improves performance on large data

- 🔹 Disadvantages
    - ❌ Slower INSERT, UPDATE, DELETE
    - ❌ Takes extra storage

- 🔹 When to use
    -  👉 Use index when:
        - Column used in WHERE
        - Used in JOIN
        - Used in ORDER BY
- 🔥 Key Point
    - 👉 **Index speeds up read, but slows down write**

### 

<details>
    <summary>DIFF B/W CLustered and Non-CLustered Index</summary>

    🔹 1. Clustered Index
        👉 It stores actual table data in sorted order
        👉 The table itself becomes the index
        Example
            CREATE CLUSTERED INDEX idx_id ON Employees(Id);
            👉 Data will be physically stored like:
            
            Id | Name
            1  | A
            2  | B
            3  | C
        ✔ Only ONE clustered index per table
        ✔ Fast for range queries (BETWEEN, ORDER BY)

    🔹 2. Non-Clustered Index
        👉 It stores index separately, not actual data
        👉 Contains:
            Indexed column
            Pointer to actual row
        Example
            CREATE NONCLUSTERED INDEX idx_name ON Employees(Name);
        👉 Internally like:

            Name   → Pointer
            A      → Row1
            B      → Row2

        ✔ Can have multiple indexes
        ✔ Extra lookup needed to fetch full data

    🔥 Key Differences (Simple Table)
        Feature	                 Clustered Index	            Non-Clustered Index
        Data storage	      Actual data sorted	         Separate structure
        Number allowed	      Only 1	                     Multiple
        Speed	              Faster for range queries	     Faster for specific lookups
        Storage	              No extra (data itself)	     Extra storage needed
        Lookup	              Direct	                     Needs pointer (extra step)

    🔹 Real-Life Example
        Table: Employees
            Id | Name | Salary
        Case 1: Clustered on Id
            CREATE CLUSTERED INDEX idx_id ON Employees(Id);
            
            👉 Data physically sorted by Id
            👉 Fast:

            SELECT * FROM Employees WHERE Id BETWEEN 1 AND 100;

        Case 2: Non-Clustered on Name
            CREATE NONCLUSTERED INDEX idx_name ON Employees(Name);

            👉 Good for:
                SELECT * FROM Employees WHERE Name = 'Keshav';
                👉 First finds in index → then goes to actual row

    🔹 Easy Memory Trick
        👉 Clustered = Data itself arranged
        👉 Non-Clustered = Shortcut (pointer)

    🔥 Final Understanding
        Clustered = how data is stored
        Non-clustered = how data is searched
    
</details>

## `TRUNCATE`, `DELETE`, and `DROP` command diffs

- Used to remove data from a database, but they operate in distinct ways and have different consequences.

`DELETE`

- Description: `DELETE` is used to remove one or more rows from a table based on a condition. It is a DML (Data Manipulation Language) operation.
- Scope: Can target specific rows based on a `WHERE` clause or all rows if no condition is specified.
- Effect on Indexes and Constraints: Maintains all the indexes, constraints, and triggers.
- Undo Operation: Changes can be rolled back if executed within a transaction.
- Performance: Slower than `TRUNCATE` because it logs individual row deletions.
- Space Reclaiming: Does not reclaim space from the table unless it is a heap table.
- Reset Identity: Does not reset identity columns.

```c#
DELETE FROM Employees WHERE Department = 'Sales';
```

`TRUNCATE`

- Description: `TRUNCATE` is used to remove all rows from a table. It is a DDL (Data Definition Language) operation.
- Scope: Removes all rows from a table, cannot use a `WHERE` clause.
- Effect on Indexes and Constraints: Maintains the table structure but resets any identity columns.
- Undo Operation: Cannot be rolled back in some databases (like MySQL), but can be in others (like SQL Server) if executed within a transaction.
- Performance: Faster than `DELETE` because it operates at the table level and does not log individual row deletions.
- Space Reclaiming: Reclaims space from the table (depends on the database system).
- Reset Identity: Resets identity columns to their seed value.

```c#
TRUNCATE TABLE Employees;
```

`DROP`

- Description: `DROP` is used to remove an entire table from the database. It is a DDL operation.
- Scope: Removes the table structure along with its data.
- Effect on Indexes and Constraints: Removes all indexes, constraints, triggers, permissions, and dependencies associated with the table.
- Undo Operation: Cannot be rolled back unless a backup is restored.
- Performance: Generally fast because it removes the table in its entirety.
- Space Reclaiming: Reclaims all space used by the table.
- Reset Identity: Not applicable as the table is removed.

```c#
DROP TABLE Employees;
```

`Diagram`

```text
 Before any operation:
+--------------------------+
|         Employees        |
|--------------------------|
| ID | Name    | Department|
|----|---------|-----------|
| 1  | John    | Sales     |
| 2  | Jane    | Marketing |
| 3  | Bob     | Sales     |
+--------------------------+

After DELETE FROM Employees WHERE Department = 'Sales':
+--------------------------+
|         Employees        |
|--------------------------|
| ID | Name    | Department|
|----|---------|-----------|
| 2  | Jane    | Marketing |
+--------------------------+

After TRUNCATE TABLE Employees:
+--------------------------+
|         Employees        |
|--------------------------|
| ID | Name    | Department|
+--------------------------+
(Table structure remains but no data)

After DROP TABLE Employees:
(Table and data no longer exist in the database)
```

| Feature               | DELETE                                                       | TRUNCATE                                                    | DROP                                                      |
|-----------------------|--------------------------------------------------------------|-------------------------------------------------------------|-----------------------------------------------------------|
| Description           | Removes one or more rows from a table.                       | Removes all rows from a table.                              | Removes the entire table structure and its data.          |
| SQL Type              | DML (Data Manipulation Language)                             | DDL (Data Definition Language)                              | DDL (Data Definition Language)                            |
| Scope                 | Specific rows based on `WHERE` clause or all rows if no condition. | Entire table; cannot use `WHERE` clause.                     | Entire table, including structure and data.               |
| Effect on Indexes/Constraints | Maintains indexes and constraints.                       | Maintains table structure but resets identity columns.      | Removes all indexes, constraints, and associated objects. |
| Undo Operation        | Can be rolled back within a transaction.                     | Depends on DBMS; may be rolled back within a transaction.   | Cannot be rolled back (unless a backup is restored).      |
| Performance           | Slower due to row-level logging.                             | Faster as it operates at the table level without logging rows. | Generally fast as it removes the table entirely.         |
| Space Reclaiming      | Does not reclaim space unless it's a heap table.             | Reclaims space from the table (depends on DBMS).            | Reclaims all space used by the table.                     |
| Reset Identity        | Does not reset identity columns.                             | Resets identity columns to their seed value.                | Not applicable (table is dropped).                        |

### Examples

- **DELETE**: `DELETE FROM Employees WHERE Department = 'Sales';`
- **TRUNCATE**: `TRUNCATE TABLE Employees;`
- **DROP**: `DROP TABLE Employees;`

## ACID Properties

ACID is an acronym that stands for Atomicity, Consistency, Isolation, and Durability. These are the four key properties that define the transaction guarantees of a database system, ensuring the reliability of transactions in SQL databases.

Here's a brief overview of each ACID property:

1. Atomicity:
   - Ensures that all operations within a transaction are completed successfully. If any part of the transaction fails, the entire transaction fails, and the database state is left unchanged.
   - Example: If you're transferring money from one bank account to another, atomicity guarantees that both the debit and credit occur together. If either fails, neither action is performed.

2. Consistency:
   - Ensures that a transaction can only bring the database from one valid state to another, maintaining the integrity of the database by enforcing rules, constraints, and triggers.
   - Example: When adding a row to a table with a foreign key constraint, consistency ensures that the foreign key value exists in the referenced table.

3. Isolation:
   - Ensures that the concurrent execution of transactions leaves the database in the same state that would have been obtained if the transactions were executed sequentially.
   - Example: If two transactions are making changes to the same data, isolation ensures that each transaction is unaware of the other, preventing data corruption.

4. Durability:
   - Guarantees that once a transaction has been committed, it will remain so, even in the event of a system failure. This usually involves the use of transaction logs that are written to permanent storage.
   - Example: If a transaction has been committed and the system crashes shortly after, the changes made by the transaction will not be lost.

Here is a simple ASCII art diagram that represents the concept of ACID properties in the context of a transaction:

```text
+-----------------+           +-----------------+
|    Transaction  |           |    Database     |
|                 |           |                 |
| +-----------+   |  ACID     | +-------------+ |
| | Atomicity |----------->   | | Consistency | |
| +-----------+   |           | +-------------+ |
| +-----------+   |           | +-------------+ |
| | Isolation |----------->   | | Durability  | |
| +-----------+   |           | +-------------+ |
+-----------------+           +-----------------+
```

In this diagram, the "Transaction" box represents a transaction in progress, which adheres to the ACID properties on the right, ensuring that the "Database" maintains its integrity, reliability, and correctness.
