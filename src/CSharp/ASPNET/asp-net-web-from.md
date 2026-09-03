# ASP.NET Web Forms (`.aspx`) --- Complete Interview Preparation Guide

> **Goal:** Prepare for ASP.NET Web Forms interviews from beginner to
> advanced, including concepts, architecture, page lifecycle, controls,
> ViewState, Session, Master Pages, validation, security, ADO.NET,
> hands-on exercises, debugging, scenarios, and interview questions.

------------------------------------------------------------------------

# Table of Contents

1.  [Introduction](#1-introduction)
2.  [Web Forms Architecture](#2-web-forms-architecture)
3.  [Project Files](#3-project-files)
4.  [Server Controls and
    `runat="server"`](#4-server-controls-and-runatserver)
5.  [Code Behind](#5-code-behind)
6.  [Page Life Cycle](#6-page-life-cycle)
7.  [PostBack and `IsPostBack`](#7-postback-and-ispostback)
8.  [State Management](#8-state-management)
9.  [ViewState](#9-viewstate)
10. [Session State](#10-session-state)
11. [Cookies, Query Strings, Application and
    Cache](#11-cookies-query-strings-application-and-cache)
12. [Master Pages and User Controls](#12-master-pages-and-user-controls)
13. [Validation Controls](#13-validation-controls)
14. [Data Binding and Data Controls](#14-data-binding-and-data-controls)
15. [ADO.NET and SQL Server](#15-adonet-and-sql-server)
16. [CRUD](#16-crud)
17. [Authentication and
    Authorization](#17-authentication-and-authorization)
18. [Configuration and Global.asax](#18-configuration-and-globalasax)
19. [HTTP Modules and Handlers](#19-http-modules-and-handlers)
20. [Dynamic Controls](#20-dynamic-controls)
21. [AJAX and UpdatePanel](#21-ajax-and-updatepanel)
22. [File Upload](#22-file-upload)
23. [Security](#23-security)
24. [Performance](#24-performance)
25. [Architecture and Best
    Practices](#25-architecture-and-best-practices)
26. [Hands-On Exercises](#26-hands-on-exercises)
27. [Scenario-Based Questions](#27-scenario-based-questions)
28. [Interview Questions and
    Answers](#28-interview-questions-and-answers)
29. [7-Day Preparation Plan](#29-7-day-preparation-plan)
30. [Final Revision Cheat Sheet](#30-final-revision-cheat-sheet)

------------------------------------------------------------------------

# 1. Introduction

## What is ASP.NET Web Forms?

ASP.NET Web Forms is a **server-side web application framework** from
the classic **.NET Framework**. It uses an **event-driven programming
model** and lets developers build dynamic web applications using:

-   `.aspx` pages
-   C# or VB.NET
-   Server controls
-   Code-behind
-   Postbacks
-   ViewState
-   Master Pages
-   User Controls

A simple request flow:

``` text
Browser
  ↓ HTTP Request
IIS
  ↓
ASP.NET Runtime
  ↓
HTTP Modules / Handler
  ↓
ASPX Page + Code Behind
  ↓
Business Logic / Database
  ↓
HTML Response
  ↓
Browser
```

## Web Forms vs ASP.NET Core

  ------------------------------------------------------------------------------
  Feature                 ASP.NET Web Forms       ASP.NET Core
  ----------------------- ----------------------- ------------------------------
  Platform                Classic .NET Framework  Modern .NET

  UI model                `.aspx`, server         Razor, APIs, Blazor, etc.
                          controls                

  Programming style       Event-driven            Request/middleware/component
                                                  based

  State                   ViewState/PostBack      Explicit state management

  Cross-platform          No                      Yes

  Built-in modern DI      Limited compared with   Built-in
                          ASP.NET Core            

  Future development      Legacy/maintenance      Actively developed
                          scenarios               
  ------------------------------------------------------------------------------

**Interview answer:**

> ASP.NET Web Forms is part of the classic ASP.NET Framework and follows
> an event-driven model. It uses server controls, ViewState, postbacks,
> and a page lifecycle. ASP.NET Core is the modern cross-platform
> framework with a middleware-based architecture, built-in dependency
> injection, and better suitability for modern cloud-native development.

------------------------------------------------------------------------

# 2. Web Forms Architecture

Typical layered architecture:

``` text
Presentation Layer
    ↓
Business / Service Layer
    ↓
Repository / Data Access Layer
    ↓
Database
```

Avoid putting all logic inside `Page_Load`.

Example:

``` text
Employee.aspx
    ↓
EmployeeService
    ↓
EmployeeRepository
    ↓
SQL Server
```

------------------------------------------------------------------------

# 3. Project Files

## `.aspx`

Contains page markup and server controls.

``` aspx
<%@ Page Language="C#" AutoEventWireup="true"
    CodeBehind="Default.aspx.cs"
    Inherits="MyApp.Default" %>

<!DOCTYPE html>
<html>
<head runat="server">
    <title>My Application</title>
</head>
<body>
<form id="form1" runat="server">
    <asp:Label ID="lblMessage"
               runat="server"
               Text="Hello" />
</form>
</body>
</html>
```

## `.aspx.cs`

Contains server-side C# logic.

``` csharp
public partial class Default : System.Web.UI.Page
{
    protected void Page_Load(object sender, EventArgs e)
    {
        lblMessage.Text = "Hello from Code Behind";
    }
}
```

## `Web.config`

Used for:

-   Connection strings
-   Authentication
-   Authorization
-   Session configuration
-   Application settings
-   Custom errors

``` xml
<configuration>
  <connectionStrings>
    <add name="DefaultConnection"
         connectionString="Data Source=.;Initial Catalog=MyDB;Integrated Security=True"
         providerName="System.Data.SqlClient" />
  </connectionStrings>
</configuration>
```

## `Global.asax`

Used for application-level events.

``` csharp
protected void Application_Start()
{
}

protected void Session_Start()
{
}

protected void Application_Error()
{
}

protected void Application_End()
{
}
```

------------------------------------------------------------------------

# 4. Server Controls and `runat="server"`

`runat="server"` tells ASP.NET that an element should participate in
server-side processing.

``` aspx
<asp:Button ID="btnSubmit"
            runat="server"
            Text="Submit" />
```

Example:

``` aspx
<asp:TextBox ID="txtName"
             runat="server" />
```

Access from C#:

``` csharp
txtName.Text = "Keshav";
```

## Common Controls

### Label

``` aspx
<asp:Label ID="lblName" runat="server" />
```

``` csharp
lblName.Text = "Hello";
```

### TextBox

``` aspx
<asp:TextBox ID="txtName" runat="server" />
```

``` csharp
string name = txtName.Text;
```

### Button

``` aspx
<asp:Button ID="btnSave"
            runat="server"
            Text="Save"
            OnClick="btnSave_Click" />
```

``` csharp
protected void btnSave_Click(object sender, EventArgs e)
{
    lblMessage.Text = "Saved Successfully";
}
```

### DropDownList

``` aspx
<asp:DropDownList ID="ddlCountry" runat="server">
    <asp:ListItem Text="India" Value="IN" />
    <asp:ListItem Text="USA" Value="US" />
</asp:DropDownList>
```

### HTML vs Server Controls

  -----------------------------------------------------------------------
  HTML Control                        ASP.NET Server Control
  ----------------------------------- -----------------------------------
  Browser-oriented                    Server-aware

  Lightweight                         Rich server-side API

  No automatic ViewState behavior     Supports Web Forms state management

  Direct HTML                         May render generated HTML
  -----------------------------------------------------------------------

------------------------------------------------------------------------

# 5. Code Behind

Code-behind separates UI markup from server-side logic.

``` aspx
<asp:Button ID="btnLogin"
            runat="server"
            Text="Login"
            OnClick="btnLogin_Click" />
```

``` csharp
protected void btnLogin_Click(object sender, EventArgs e)
{
    // Server-side logic
}
```

Benefits:

-   Better separation of concerns
-   Easier maintenance
-   Easier debugging
-   Cleaner UI files

------------------------------------------------------------------------

# 6. Page Life Cycle

This is one of the most important interview topics.

## Simplified Order

``` text
Init
↓
Load
↓
Control Events
↓
PreRender
↓
Render
↓
Unload
```

## More Detailed View

``` text
Request
↓
Start
↓
PreInit
↓
Init
↓
InitComplete
↓
LoadViewState
↓
LoadPostData
↓
Load
↓
Control Events
↓
LoadComplete
↓
PreRender
↓
SaveStateComplete
↓
Render
↓
Unload
```

## `Page_PreInit`

Useful for:

-   Dynamic master page selection
-   Dynamic theme selection
-   Early page initialization

## `Page_Init`

Controls are initialized here.

Dynamic controls should generally be created here:

``` csharp
protected void Page_Init(object sender, EventArgs e)
{
    TextBox txt = new TextBox();
    txt.ID = "txtDynamic";
    form1.Controls.Add(txt);
}
```

### Why create dynamic controls in `Init`?

Because ASP.NET needs the control tree recreated early enough to
restore:

-   ViewState
-   Postback data
-   Events

## `Page_Load`

Runs for initial requests and postbacks.

``` csharp
protected void Page_Load(object sender, EventArgs e)
{
}
```

## Control Events

For example:

``` csharp
protected void btnSave_Click(object sender, EventArgs e)
{
}
```

Typical order:

``` text
Page_Init
↓
Page_Load
↓
Button_Click
↓
Page_PreRender
```

## `Page_PreRender`

Final opportunity to modify controls before rendering.

``` csharp
protected void Page_PreRender(object sender, EventArgs e)
{
    lblMessage.Text = "Ready";
}
```

## `Page_Unload`

Runs after rendering is effectively complete. Do not update UI controls
here.

------------------------------------------------------------------------

# 7. PostBack and `IsPostBack`

A **postback** occurs when a Web Forms page sends data back to the
server and the page is processed again.

``` text
Browser
↓
POST Request
↓
Same ASPX Page
↓
Page Lifecycle
↓
Events
↓
HTML Response
```

## `IsPostBack`

Use it to distinguish the first request from subsequent postbacks.

``` csharp
protected void Page_Load(object sender, EventArgs e)
{
    if (!IsPostBack)
    {
        LoadCountries();
    }
}
```

Without this, controls may be rebound on every postback, causing:

-   Selected values to reset
-   User input problems
-   Unnecessary database calls
-   Performance issues

## AutoPostBack

``` aspx
<asp:DropDownList ID="ddlCountry"
                  runat="server"
                  AutoPostBack="true"
                  OnSelectedIndexChanged="ddlCountry_SelectedIndexChanged">
</asp:DropDownList>
```

``` csharp
protected void ddlCountry_SelectedIndexChanged(object sender, EventArgs e)
{
    string country = ddlCountry.SelectedValue;
}
```

------------------------------------------------------------------------

# 8. State Management

Web applications are stateless by nature.

ASP.NET Web Forms provides multiple state management mechanisms.

``` text
State Management
│
├── Client Side
│   ├── ViewState
│   ├── ControlState
│   ├── Hidden Fields
│   ├── Cookies
│   └── Query Strings
│
└── Server Side
    ├── Session
    ├── Application
    ├── Cache
    └── Database
```

------------------------------------------------------------------------

# 9. ViewState

ViewState preserves page/control state across postbacks.

Example:

``` aspx
<asp:TextBox ID="txtName" runat="server" />
```

A user enters:

``` text
Keshav
```

After a postback, ASP.NET can restore the value.

ViewState is commonly emitted into hidden fields such as:

``` html
<input type="hidden"
       name="__VIEWSTATE"
       value="..." />
```

## Important Security Point

ViewState is not simply "encrypted data". Base64 encoding is **not
encryption**.

Do not store sensitive or unnecessarily large data in ViewState.

## Disable ViewState

Page:

``` aspx
<%@ Page EnableViewState="false" %>
```

Control:

``` aspx
<asp:TextBox ID="txtName"
             runat="server"
             EnableViewState="false" />
```

## ViewState Counter

``` csharp
protected void btnIncrease_Click(object sender, EventArgs e)
{
    int count = ViewState["Count"] == null
        ? 0
        : (int)ViewState["Count"];

    count++;

    ViewState["Count"] = count;
    lblCount.Text = count.ToString();
}
```

## ViewState Problems

Large ViewState can cause:

-   Large HTML responses
-   More bandwidth
-   Slower pages
-   Performance degradation

------------------------------------------------------------------------

# 10. Session State

Session stores user-specific state across multiple requests/pages.

``` csharp
Session["UserName"] = "Keshav";
```

Read:

``` csharp
string userName = Session["UserName"] as string;
```

Remove:

``` csharp
Session.Remove("UserName");
```

Clear all session values:

``` csharp
Session.Clear();
```

End the session:

``` csharp
Session.Abandon();
```

## Session vs ViewState

  Feature                 Session                   ViewState
  ----------------------- ------------------------- ------------------------
  Scope                   Multiple requests/pages   Current page postbacks
  Storage                 Server/provider           Sent with page state
  Server resource usage   Yes/provider-dependent    Mainly page payload
  User-specific           Yes                       Yes

## Session Modes

### InProc

``` xml
<sessionState mode="InProc" />
```

Advantages:

-   Fast

Disadvantages:

-   Lost when application process restarts
-   Requires additional planning for multi-server environments

### StateServer

``` xml
<sessionState mode="StateServer" />
```

Uses a separate state service.

### SQLServer

``` xml
<sessionState mode="SQLServer" />
```

Stores session in SQL Server and can support shared session scenarios.

------------------------------------------------------------------------

# 11. Cookies, Query Strings, Application and Cache

## Cookies

``` csharp
HttpCookie cookie = new HttpCookie("UserName");
cookie.Value = "Keshav";
cookie.Expires = DateTime.Now.AddDays(7);
cookie.HttpOnly = true;
cookie.Secure = true;

Response.Cookies.Add(cookie);
```

Read:

``` csharp
string userName = Request.Cookies["UserName"]?.Value;
```

### Cookie Security

Use appropriate:

-   `HttpOnly`
-   `Secure`
-   `SameSite`

depending on the application requirements.

## Query String

Example URL:

``` text
User.aspx?id=10
```

Read safely:

``` csharp
if (int.TryParse(Request.QueryString["id"], out int userId))
{
    // Use userId
}
```

Never trust query string values without validation and authorization.

## Application State

Shared across all users.

``` csharp
Application["TotalUsers"] = 100;
```

## Cache

``` csharp
Cache["Products"] = products;
```

With expiration:

``` csharp
Cache.Insert(
    "Products",
    products,
    null,
    DateTime.Now.AddMinutes(10),
    System.Web.Caching.Cache.NoSlidingExpiration
);
```

------------------------------------------------------------------------

# 12. Master Pages and User Controls

## Master Page

Provides common layout:

``` text
Site.Master
├── Header
├── Navigation
├── Main Content
└── Footer
```

Master page:

``` aspx
<%@ Master Language="C#" %>

<form runat="server">
    <header>My Website</header>

    <asp:ContentPlaceHolder ID="MainContent"
                            runat="server" />
</form>
```

Content page:

``` aspx
<%@ Page MasterPageFile="~/Site.Master"
         Language="C#" %>

<asp:Content ID="Content1"
             ContentPlaceHolderID="MainContent"
             runat="server">

    <h1>Home Page</h1>

</asp:Content>
```

## User Controls (`.ascx`)

Reusable UI components.

Example:

``` aspx
<%@ Control Language="C#" %>
<h1>My Header</h1>
```

Register:

``` aspx
<%@ Register Src="~/Controls/Header.ascx"
             TagPrefix="uc"
             TagName="Header" %>
```

Use:

``` aspx
<uc:Header ID="Header1" runat="server" />
```

## Master Page vs User Control

  Master Page                       User Control
  --------------------------------- -------------------------------
  Defines common page layout        Reusable UI component
  Header/footer/navigation/layout   Smaller reusable component
  Usually page-wide                 Can appear in multiple places

------------------------------------------------------------------------

# 13. Validation Controls

Built-in validation controls:

-   `RequiredFieldValidator`
-   `CompareValidator`
-   `RangeValidator`
-   `RegularExpressionValidator`
-   `CustomValidator`
-   `ValidationSummary`

## RequiredFieldValidator

``` aspx
<asp:TextBox ID="txtName" runat="server" />

<asp:RequiredFieldValidator
    ID="rfvName"
    runat="server"
    ControlToValidate="txtName"
    ErrorMessage="Name is required" />
```

## RangeValidator

``` aspx
<asp:RangeValidator
    ID="rvAge"
    runat="server"
    ControlToValidate="txtAge"
    MinimumValue="18"
    MaximumValue="60"
    Type="Integer"
    ErrorMessage="Age must be between 18 and 60" />
```

## CompareValidator

``` aspx
<asp:CompareValidator
    ID="cvPassword"
    runat="server"
    ControlToValidate="txtConfirmPassword"
    ControlToCompare="txtPassword"
    ErrorMessage="Passwords do not match" />
```

## RegularExpressionValidator

``` aspx
<asp:RegularExpressionValidator
    ID="revEmail"
    runat="server"
    ControlToValidate="txtEmail"
    ValidationExpression="^[^@\s]+@[^@\s]+\.[^@\s]+$"
    ErrorMessage="Invalid email" />
```

## CustomValidator

``` aspx
<asp:CustomValidator
    ID="cvCustom"
    runat="server"
    ControlToValidate="txtName"
    OnServerValidate="ValidateName"
    ErrorMessage="Invalid Name" />
```

``` csharp
protected void ValidateName(object source, ServerValidateEventArgs args)
{
    args.IsValid = args.Value.Length >= 3;
}
```

## Always Check `Page.IsValid`

``` csharp
protected void btnSave_Click(object sender, EventArgs e)
{
    if (!Page.IsValid)
    {
        return;
    }

    // Save data
}
```

------------------------------------------------------------------------

# 14. Data Binding and Data Controls

Common controls:

-   GridView
-   Repeater
-   DataList
-   DropDownList

## GridView

``` aspx
<asp:GridView ID="gvUsers"
              runat="server"
              AutoGenerateColumns="true">
</asp:GridView>
```

``` csharp
gvUsers.DataSource = users;
gvUsers.DataBind();
```

With explicit columns:

``` aspx
<asp:GridView ID="gvUsers"
              runat="server"
              AutoGenerateColumns="false">
    <Columns>
        <asp:BoundField DataField="Id" HeaderText="ID" />
        <asp:BoundField DataField="Name" HeaderText="Name" />
    </Columns>
</asp:GridView>
```

## Repeater

``` aspx
<asp:Repeater ID="rptUsers" runat="server">
    <ItemTemplate>
        <h3><%# Eval("Name") %></h3>
    </ItemTemplate>
</asp:Repeater>
```

``` csharp
rptUsers.DataSource = users;
rptUsers.DataBind();
```

## GridView vs Repeater

  GridView                                            Repeater
  --------------------------------------------------- ---------------------
  Rich built-in features                              Lightweight
  Built-in table rendering                            Full markup control
  Sorting/paging/editing features can be configured   More manual work
  More generated HTML                                 More customizable

## `Eval()` vs `Bind()`

``` aspx
<%# Eval("Name") %>
```

Commonly used for one-way display binding.

``` aspx
<%# Bind("Name") %>
```

Used in data-bound scenarios that support two-way binding.

------------------------------------------------------------------------

# 15. ADO.NET and SQL Server

Important classes:

``` text
SqlConnection
SqlCommand
SqlDataReader
SqlDataAdapter
DataSet
DataTable
SqlTransaction
```

Namespace:

``` csharp
using System.Data;
using System.Data.SqlClient;
```

## SqlConnection

``` csharp
string connectionString =
    ConfigurationManager
        .ConnectionStrings["DefaultConnection"]
        .ConnectionString;

using (SqlConnection connection =
       new SqlConnection(connectionString))
{
    connection.Open();
}
```

Use `using` to ensure disposal.

## ExecuteNonQuery

Used for:

-   INSERT
-   UPDATE
-   DELETE

``` csharp
string query = "DELETE FROM Users WHERE Id = @Id";

using (SqlCommand command = new SqlCommand(query, connection))
{
    command.Parameters.Add("@Id", SqlDbType.Int).Value = 10;

    int rows = command.ExecuteNonQuery();
}
```

## ExecuteScalar

For a single value:

``` csharp
string query = "SELECT COUNT(*) FROM Users";

int count = Convert.ToInt32(command.ExecuteScalar());
```

## ExecuteReader

``` csharp
using (SqlDataReader reader = command.ExecuteReader())
{
    while (reader.Read())
    {
        string name = reader["Name"].ToString();
    }
}
```

## SQL Injection

### Bad

``` csharp
string query =
    "SELECT * FROM Users WHERE Name = '" +
    txtName.Text +
    "'";
```

### Correct

``` csharp
string query =
    "SELECT * FROM Users WHERE Name = @Name";

command.Parameters.Add(
    "@Name",
    SqlDbType.NVarChar,
    100
).Value = txtName.Text;
```

Avoid concatenating untrusted user input into SQL.

------------------------------------------------------------------------

# 16. CRUD

## Database Table

``` sql
CREATE TABLE Employees
(
    Id INT IDENTITY(1,1) PRIMARY KEY,
    Name NVARCHAR(100) NOT NULL,
    Email NVARCHAR(200) NOT NULL,
    Department NVARCHAR(100),
    Salary DECIMAL(18,2),
    CreatedDate DATETIME DEFAULT GETDATE()
);
```

## Create

``` csharp
protected void btnSave_Click(object sender, EventArgs e)
{
    if (!Page.IsValid)
        return;

    string query = @"
        INSERT INTO Employees(Name, Email)
        VALUES(@Name, @Email)";

    using (SqlConnection connection =
           new SqlConnection(connectionString))
    using (SqlCommand command =
           new SqlCommand(query, connection))
    {
        command.Parameters.Add(
            "@Name", SqlDbType.NVarChar, 100
        ).Value = txtName.Text;

        command.Parameters.Add(
            "@Email", SqlDbType.NVarChar, 200
        ).Value = txtEmail.Text;

        connection.Open();
        command.ExecuteNonQuery();
    }
}
```

## Read

``` csharp
private void LoadEmployees()
{
    string query =
        "SELECT Id, Name, Email FROM Employees";

    DataTable table = new DataTable();

    using (SqlConnection connection =
           new SqlConnection(connectionString))
    using (SqlDataAdapter adapter =
           new SqlDataAdapter(query, connection))
    {
        adapter.Fill(table);
    }

    gvUsers.DataSource = table;
    gvUsers.DataBind();
}
```

## Update

``` sql
UPDATE Employees
SET Name = @Name
WHERE Id = @Id
```

## Delete

``` sql
DELETE FROM Employees
WHERE Id = @Id
```

## Transactions

Use a transaction when multiple operations must succeed or fail
together.

``` csharp
using (SqlConnection connection =
       new SqlConnection(connectionString))
{
    connection.Open();

    SqlTransaction transaction =
        connection.BeginTransaction();

    try
    {
        using (SqlCommand debit = new SqlCommand(
            "UPDATE Accounts SET Balance = Balance - 100 WHERE Id = 1",
            connection, transaction))
        {
            debit.ExecuteNonQuery();
        }

        using (SqlCommand credit = new SqlCommand(
            "UPDATE Accounts SET Balance = Balance + 100 WHERE Id = 2",
            connection, transaction))
        {
            credit.ExecuteNonQuery();
        }

        transaction.Commit();
    }
    catch
    {
        transaction.Rollback();
        throw;
    }
}
```

------------------------------------------------------------------------

# 17. Authentication and Authorization

## Authentication

Answers:

> Who are you?

## Authorization

Answers:

> What are you allowed to access?

  Authentication      Authorization
  ------------------- ------------------------------
  Verifies identity   Verifies permissions
  Login               Access control
  Happens first       Happens after authentication

## Forms Authentication

Example configuration:

``` xml
<authentication mode="Forms">
    <forms loginUrl="Login.aspx"
           timeout="30" />
</authentication>
```

Login:

``` csharp
FormsAuthentication.SetAuthCookie(username, false);
```

or:

``` csharp
FormsAuthentication.RedirectFromLoginPage(
    username,
    false
);
```

Logout:

``` csharp
FormsAuthentication.SignOut();
Session.Abandon();
Response.Redirect("Login.aspx");
```

Authorization example:

``` xml
<authorization>
    <deny users="?" />
</authorization>
```

`?` means anonymous users.

------------------------------------------------------------------------

# 18. Configuration and Global.asax

## AppSettings

``` xml
<appSettings>
    <add key="ApplicationName"
         value="MyApp" />
</appSettings>
```

Read:

``` csharp
string appName =
    ConfigurationManager
        .AppSettings["ApplicationName"];
```

## Connection String

``` xml
<connectionStrings>
    <add name="DefaultConnection"
         connectionString="..."
         providerName="System.Data.SqlClient" />
</connectionStrings>
```

## Important Global.asax Events

``` text
Application_Start
Application_End
Application_BeginRequest
Application_EndRequest
Application_Error
Session_Start
Session_End
```

Example:

``` csharp
protected void Application_Error()
{
    Exception exception = Server.GetLastError();

    // Log exception

    Server.ClearError();
    Response.Redirect("~/Error.aspx");
}
```

## Custom Errors

``` xml
<customErrors mode="On">
    <defaultRedirect="~/Error.aspx" />
</customErrors>
```

In production, avoid exposing internal stack traces.

## Web.config Hierarchy

``` text
Application Root
│
├── Web.config
│
├── Admin
│   └── Web.config
│
└── User
    └── Web.config
```

Child configuration can override parent settings where configuration
rules allow.

------------------------------------------------------------------------

# 19. HTTP Modules and Handlers

Simplified request pipeline:

``` text
Browser
↓
IIS
↓
ASP.NET
↓
HTTP Modules
↓
HTTP Handler
↓
ASPX Processing
↓
Response
```

## HTTP Module

Used for cross-cutting request processing such as logging or
authentication.

``` csharp
public class LoggingModule : IHttpModule
{
    public void Init(HttpApplication context)
    {
        context.BeginRequest += OnBeginRequest;
    }

    private void OnBeginRequest(object sender, EventArgs e)
    {
        // Logging
    }

    public void Dispose()
    {
    }
}
```

## HTTP Handler

Handles a request and generates a response.

``` csharp
public class MyHandler : IHttpHandler
{
    public void ProcessRequest(HttpContext context)
    {
        context.Response.Write("Hello");
    }

    public bool IsReusable => false;
}
```

## Module vs Handler

  HTTP Module                HTTP Handler
  -------------------------- -----------------------------
  Participates in pipeline   Processes request
  Cross-cutting logic        Produces response
  Logging/authentication     Custom endpoint/file/output

------------------------------------------------------------------------

# 20. Dynamic Controls

Create dynamic controls early, usually in `Page_Init`.

``` csharp
protected void Page_Init(object sender, EventArgs e)
{
    TextBox textBox = new TextBox();
    textBox.ID = "txtDynamicName";

    form1.Controls.Add(textBox);
}
```

Why?

Dynamic controls must be recreated consistently so ASP.NET can restore
state and route postback events correctly.

**Common interview question:**

> Why is my dynamic button click event not firing?

A common reason is that the dynamic control was created too late or not
recreated with the same ID/control tree on postback.

------------------------------------------------------------------------

# 21. AJAX and UpdatePanel

Web Forms supports partial page updates through ASP.NET AJAX.

``` aspx
<asp:ScriptManager ID="ScriptManager1"
                   runat="server" />

<asp:UpdatePanel ID="UpdatePanel1"
                 runat="server">

    <ContentTemplate>

        <asp:Label ID="lblTime"
                   runat="server" />

        <asp:Button ID="btnRefresh"
                    runat="server"
                    Text="Refresh"
                    OnClick="btnRefresh_Click" />

    </ContentTemplate>

</asp:UpdatePanel>
```

``` csharp
protected void btnRefresh_Click(object sender, EventArgs e)
{
    lblTime.Text = DateTime.Now.ToString();
}
```

## Full vs Partial Postback

  Full Postback               Partial Postback
  --------------------------- ------------------------
  Entire page refreshes       Target section updates
  Traditional behavior        AJAX request
  More page refresh/flicker   Better perceived UX

**Interview answer:**

> UpdatePanel does not remove server-side processing. The request still
> goes to the server, but the client updates only the relevant page
> section.

------------------------------------------------------------------------

# 22. File Upload

``` aspx
<asp:FileUpload ID="fileUpload"
                runat="server" />

<asp:Button ID="btnUpload"
            runat="server"
            Text="Upload"
            OnClick="btnUpload_Click" />
```

``` csharp
protected void btnUpload_Click(object sender, EventArgs e)
{
    if (!fileUpload.HasFile)
        return;

    string extension =
        Path.GetExtension(fileUpload.FileName);

    string fileName =
        Guid.NewGuid() + extension;

    string path =
        Path.Combine(
            Server.MapPath("~/Uploads"),
            fileName
        );

    fileUpload.SaveAs(path);
}
```

Validate:

-   File size
-   Allowed extensions
-   Content type where appropriate
-   Actual file content when required
-   Storage location

Do not blindly trust the original file name.

------------------------------------------------------------------------

# 23. Security

Prepare these topics:

``` text
SQL Injection
XSS
CSRF
Authentication
Authorization
Session Security
Cookie Security
HTTPS
Input Validation
Output Encoding
File Upload Security
Error Handling
Secrets Management
```

## SQL Injection

Use parameterized queries.

## XSS

Do not render untrusted input as HTML without proper handling.

Example encoding:

``` csharp
string safeValue =
    Server.HtmlEncode(userInput);
```

## CSRF

Protect state-changing requests using appropriate anti-forgery/request
validation approaches and secure cookie settings.

## Passwords

Never store plaintext passwords.

Use an appropriate modern password hashing algorithm and
framework-supported identity/authentication mechanisms where possible.

## Secrets

Do not hardcode:

-   Passwords
-   API keys
-   Connection credentials

Do not commit secrets to source control.

------------------------------------------------------------------------

# 24. Performance

## Performance Checklist

-   Disable unnecessary ViewState
-   Avoid rebinding controls on every postback
-   Use caching where appropriate
-   Implement paging
-   Optimize SQL queries
-   Add proper database indexes
-   Avoid unnecessary postbacks
-   Minimize page size
-   Avoid excessive nested controls
-   Use output caching where appropriate
-   Dispose database resources
-   Avoid excessive UpdatePanel usage

## Output Caching

``` aspx
<%@ OutputCache Duration="60"
               VaryByParam="none" %>
```

Cache different output based on parameters:

``` aspx
<%@ OutputCache Duration="60"
               VaryByParam="id" %>
```

------------------------------------------------------------------------

# 25. Architecture and Best Practices

Recommended structure:

``` text
EmployeeManagement
│
├── Default.aspx
├── Login.aspx
├── Employees.aspx
├── AddEmployee.aspx
├── EditEmployee.aspx
│
├── MasterPages
│   └── Site.Master
│
├── Controls
│   └── Header.ascx
│
├── Models
│   └── Employee.cs
│
├── Services
│   └── EmployeeService.cs
│
├── Repositories
│   └── EmployeeRepository.cs
│
├── Web.config
└── Global.asax
```

## Repository Example

``` csharp
public class EmployeeRepository
{
    public Employee GetById(int id)
    {
        // Database logic
        return null;
    }
}
```

## Service Example

``` csharp
public class EmployeeService
{
    private readonly EmployeeRepository _repository;

    public EmployeeService()
    {
        _repository = new EmployeeRepository();
    }

    public Employee GetEmployee(int id)
    {
        return _repository.GetById(id);
    }
}
```

The page should focus on presentation/event handling rather than
containing all business and database logic.

------------------------------------------------------------------------

# 26. Hands-On Exercises

## Exercise 1 --- Page Lifecycle

Create `Lifecycle.aspx`.

``` csharp
protected void Page_Init(object sender, EventArgs e)
{
    Response.Write("Init<br/>");
}

protected void Page_Load(object sender, EventArgs e)
{
    Response.Write("Load<br/>");
}

protected void btnClick_Click(object sender, EventArgs e)
{
    Response.Write("Button Click<br/>");
}

protected void Page_PreRender(object sender, EventArgs e)
{
    Response.Write("PreRender<br/>");
}
```

Observe:

``` text
Init
Load
Button Click
PreRender
```

## Exercise 2 --- ViewState Counter

Build a counter using:

``` csharp
ViewState["Count"]
```

Practice explaining why the value survives a postback.

## Exercise 3 --- Session Login

`Login.aspx`:

``` csharp
Session["UserId"] = 10;
Session["UserName"] = "Keshav";

Response.Redirect("Dashboard.aspx");
```

`Dashboard.aspx`:

``` csharp
if (Session["UserId"] == null)
{
    Response.Redirect("Login.aspx");
}
```

## Exercise 4 --- GridView CRUD

Implement:

-   SELECT
-   INSERT
-   UPDATE
-   DELETE

Use:

-   `SqlConnection`
-   `SqlCommand`
-   Parameterized queries
-   `GridView`
-   `DataBind()`

## Exercise 5 --- Master Page

Create:

``` text
Site.Master
Home.aspx
Employees.aspx
Reports.aspx
```

Put shared:

-   Header
-   Navigation
-   Footer

inside the Master Page.

## Exercise 6 --- Dynamic Controls

Create a dynamic TextBox in `Page_Init` and test postbacks.

## Exercise 7 --- File Upload

Implement:

-   Extension validation
-   Size validation
-   Unique filename
-   Safe storage
-   Success/error message

------------------------------------------------------------------------

# 27. Scenario-Based Questions

## Scenario 1: Dropdown resets after button click

**Reason:** The dropdown is probably rebound on every postback.

Bad:

``` csharp
protected void Page_Load(object sender, EventArgs e)
{
    BindDropdown();
}
```

Better:

``` csharp
protected void Page_Load(object sender, EventArgs e)
{
    if (!IsPostBack)
    {
        BindDropdown();
    }
}
```

## Scenario 2: Page is very large

Possible cause:

``` text
Large ViewState
```

Solutions:

-   Disable unnecessary ViewState
-   Do not store large objects in ViewState
-   Use paging
-   Reduce unnecessary controls

## Scenario 3: Dynamic button event does not fire

Possible causes:

-   Control created too late
-   Not recreated on postback
-   ID/control tree changed

Create it consistently and early, typically in `Page_Init`.

## Scenario 4: Session disappears with load balancing

A common cause is using process-local `InProc` session without an
appropriate multi-server session strategy.

Consider a shared/provider-based approach such as:

-   State Server
-   SQL Server
-   Another infrastructure-supported shared state solution

depending on the application.

------------------------------------------------------------------------

# 28. Interview Questions and Answers

## Beginner

### 1. What is ASP.NET Web Forms?

ASP.NET Web Forms is a classic ASP.NET Framework for building
server-rendered web applications using `.aspx` pages, server controls,
code-behind, events, postbacks, and ViewState.

### 2. What is an `.aspx` file?

It contains the markup and server controls for a Web Forms page.

### 3. What is code-behind?

Code-behind separates server-side C# logic from the UI markup.

### 4. What does `runat="server"` mean?

It allows ASP.NET to process the control on the server and expose it to
server-side code.

### 5. What is a postback?

A postback is when a Web Forms page sends data back to the server and
the page lifecycle runs again.

### 6. What is `IsPostBack`?

It tells whether the request is the initial page request or a subsequent
postback.

------------------------------------------------------------------------

## Intermediate

### 7. Explain the Page Life Cycle.

A simplified sequence is:

``` text
Init
↓
Load State/Post Data
↓
Load
↓
Control Events
↓
PreRender
↓
Save State
↓
Render
↓
Unload
```

### 8. What is ViewState?

ViewState is a page-level state mechanism that helps preserve control
values across postbacks.

### 9. Why can ViewState affect performance?

Large ViewState increases the response/request payload and can slow page
loading.

### 10. Session vs ViewState?

Session is user-specific state available across multiple requests/pages.
ViewState is primarily for preserving the state of a page and its
controls across postbacks.

### 11. What is a Master Page?

A Master Page defines shared layout for multiple content pages.

### 12. What is a User Control?

A reusable UI component stored in an `.ascx` file.

### 13. What is the difference between `Eval()` and `Bind()`?

`Eval()` is commonly used for display/one-way data binding. `Bind()` is
used in data-bound scenarios that support two-way binding.

------------------------------------------------------------------------

## Advanced

### 14. Why create dynamic controls in `Page_Init`?

They need to be recreated early and consistently so ASP.NET can restore
state, load postback data, and raise events correctly.

### 15. Explain a button click request.

Simplified:

``` text
Request
↓
Init
↓
State/Post Data Restoration
↓
Page_Load
↓
Button Click Event
↓
PreRender
↓
Render
↓
Response
```

### 16. `Response.Redirect` vs `Server.Transfer`

`Response.Redirect` instructs the browser to make a new request and
changes the browser URL.

`Server.Transfer` transfers processing internally on the server and
generally avoids an extra browser request.

### 17. Why avoid database code directly in `Page_Load`?

It creates tight coupling, hurts maintainability, reduces reusability,
and makes testing more difficult.

### 18. What is the difference between authentication and authorization?

Authentication verifies identity. Authorization determines what an
authenticated user is allowed to access.

### 19. What is an HTTP Module?

A component that participates in the ASP.NET request pipeline for
cross-cutting concerns.

### 20. What is an HTTP Handler?

A component responsible for processing a request and generating a
response.

------------------------------------------------------------------------

# 29. 7-Day Preparation Plan

## Day 1 --- Fundamentals

Study:

-   What is Web Forms?
-   `.aspx`
-   Code-behind
-   Server controls
-   `runat="server"`
-   PostBack
-   `IsPostBack`

Hands-on:

-   Hello page
-   Simple login form

## Day 2 --- Page Lifecycle

Study:

``` text
PreInit
Init
State/Post Data
Load
Events
PreRender
Render
Unload
```

Hands-on:

-   Lifecycle demonstration page

## Day 3 --- State Management

Study:

-   ViewState
-   ControlState
-   Session
-   Cookies
-   Query String
-   Application
-   Cache

Hands-on:

-   ViewState counter
-   Session login

## Day 4 --- Database

Study:

-   ADO.NET
-   `SqlConnection`
-   `SqlCommand`
-   `ExecuteReader`
-   `ExecuteScalar`
-   `ExecuteNonQuery`
-   Parameters
-   Transactions

Hands-on:

-   CRUD application

## Day 5 --- Controls and Data Binding

Study:

-   GridView
-   Repeater
-   DropDownList
-   Validators
-   Master Pages
-   User Controls

## Day 6 --- Advanced Topics

Study:

-   Dynamic controls
-   UpdatePanel
-   HTTP Modules
-   HTTP Handlers
-   Global.asax
-   Web.config
-   Caching
-   Authentication
-   Authorization

## Day 7 --- Mock Interview

Practice explaining:

1.  Web Forms architecture
2.  Page Lifecycle
3.  ViewState
4.  Session vs ViewState
5.  PostBack and `IsPostBack`
6.  `Response.Redirect` vs `Server.Transfer`
7.  SQL Injection prevention
8.  Dynamic controls
9.  Authentication and authorization
10. Performance optimization

------------------------------------------------------------------------

# 30. Final Revision Cheat Sheet

``` text
.aspx
    → UI page

.aspx.cs
    → Code-behind

runat="server"
    → Server-side processing

PostBack
    → Request sent back to server/page

IsPostBack
    → Initial request vs postback

ViewState
    → Preserve page/control state

ControlState
    → Essential control state

Session
    → User-specific state across requests/pages

Application
    → Shared application-wide state

Cache
    → Temporary data/performance optimization

Master Page
    → Common layout

User Control
    → Reusable UI component

GridView
    → Tabular data display

Repeater
    → Lightweight/customizable rendering

Eval()
    → Display/one-way binding

Bind()
    → Two-way binding scenarios

Response.Redirect()
    → Browser makes another request

Server.Transfer()
    → Internal server transfer

Page_Init
    → Initialization/dynamic controls

Page_Load
    → Main page processing

Control Events
    → Button click, selection changes, etc.

PreRender
    → Final UI changes

Render
    → HTML generation

Unload
    → Cleanup
```

------------------------------------------------------------------------

# Final Priority List

If you have limited preparation time, master these first:

1.  **Page Life Cycle**
2.  **ViewState**
3.  **Session State**
4.  **PostBack and `IsPostBack`**
5.  **Server Controls**
6.  **Master Pages**
7.  **ADO.NET**
8.  **SQL Injection**
9.  **Authentication and Authorization**
10. **Web.config**
11. **Global.asax**
12. **GridView and Data Binding**
13. **Dynamic Controls**
14. **`Response.Redirect` vs `Server.Transfer`**
15. **Caching**
16. **UpdatePanel / AJAX**
17. **Error Handling**
18. **Security**
19. **HTTP Modules and Handlers**
20. **Web Forms vs ASP.NET Core**

------------------------------------------------------------------------

# Recommended Interview Project

Build an **Employee Management System** containing:

-   Login
-   Forms Authentication
-   Session
-   Master Page
-   Employee List
-   Add Employee
-   Edit Employee
-   Delete Employee
-   GridView
-   Search
-   Validation Controls
-   SQL Server
-   Parameterized Queries
-   Error Handling
-   Global.asax
-   Web.config
-   File Upload
-   Caching
-   Pagination
-   Authorization

If you can **build this project from scratch and explain each
decision**, while confidently explaining **Page Lifecycle, ViewState,
State Management, PostBack, ADO.NET, and security**, you will be well
prepared for ASP.NET Web Forms interviews.
