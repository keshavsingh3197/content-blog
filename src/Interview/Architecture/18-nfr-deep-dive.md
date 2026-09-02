Non-Functional Requirements (NFR) — Interview Preparation
1. What are NFRs?

Non-Functional Requirements (NFRs) describe how well a system should work, rather than what functionality it provides.

 | Functional  | vs | Non-Functional Requirements |
 | ----------- | -- | --------------------------- |
| Functional Requirement | | 	Non-Functional Requirement |
| What the system does | |	How well the system does it |
| User can log in | |	Login should complete within 2 seconds |
| User can create an order | |	System should support 10,000 orders/minute |
| Generate a report | |	Report should be generated within 5 seconds |
| Send OTP | |	OTP service should be 99.99% available |

Interview Answer

"Functional requirements define the business functionality of a system, while non-functional requirements define quality attributes such as performance, scalability, availability, security, reliability and maintainability."

2. Important NFR Categories

For a .NET + Azure + Microservices interview, remember:

P S A S R M O C

P → Performance
S → Scalability
A → Availability
S → Security
R → Reliability
M → Maintainability
O → Observability
C → Cost Efficiency

3. Performance

Performance means:

How quickly does the system respond?

Important Metrics
Response time / latency
Throughput
Requests per second (RPS)
Transactions per second (TPS)
CPU utilization
Memory utilization
Database query time
Example NFR

API should respond within 500 ms for 95% of requests.

This is better than:

API should be fast.

How to Improve .NET API Performance
Use async/await
Database indexing
Optimize SQL queries
Redis caching
Pagination
Connection pooling
Reduce unnecessary API calls
Reduce payload size
Asynchronous messaging
CDN where applicable
Horizontal scaling
Interview Question
Q: How would you improve a slow .NET API?
Answer

"First, I would identify the bottleneck using Application Insights, logs, metrics and profiling. Then I would check database queries, external API calls, serialization, CPU and memory usage. Depending on the bottleneck, I could introduce caching, optimize SQL queries and indexes, use async I/O, pagination or move long-running operations to asynchronous processing using Azure Service Bus."

4. Scalability

Scalability means:

Can the system handle increasing workload?

There are two major types.

Vertical Scaling

Increase resources of an existing machine.

4 CPU  →  8 CPU
8 GB RAM  →  16 GB RAM
Horizontal Scaling

Add more instances.

              Load Balancer
                    |
        ┌───────────┼───────────┐
        ↓           ↓           ↓
      API #1      API #2      API #3

For cloud and microservices systems, horizontal scaling is generally preferred.

Example NFR

System should support 10,000 concurrent users and scale horizontally when CPU utilization exceeds 70%.

Azure Examples
Azure App Service Autoscaling
AKS Horizontal Pod Autoscaler
Azure Load Balancer
Azure Front Door
Azure Functions scaling

5. Availability

Availability means:

How much time should the system remain operational?

Availability is usually expressed as a percentage.

Availability	Approx. Downtime / Year
99%	3.65 days
99.9%	8.76 hours
99.99%	52.6 minutes
99.999%	5.26 minutes
Example

The application must provide 99.99% availability.

How to Achieve High Availability
Multiple application instances
Load balancing
Availability Zones
Health checks
Auto-scaling
Failover
Database replication
Disaster recovery
Interview Answer

"To achieve high availability, I would avoid single points of failure by deploying multiple application instances across availability zones, using load balancing, health probes, automatic scaling and database failover."

6. Security

Security protects:

Data
APIs
Users
Infrastructure
Secrets
Authentication

Who are you?

Examples:

OAuth 2.0
OpenID Connect
Microsoft Entra ID
JWT
Authorization

What are you allowed to do?

Example:

Admin → Create/Delete users
User  → View own profile
Other Security Requirements
Encryption in transit → HTTPS/TLS
Encryption at rest
Secret management
API authentication
RBAC
Input validation
Rate limiting
Audit logging
OWASP protection
Azure Security Examples
Azure Key Vault
Microsoft Entra ID
Managed Identity
API Management
Private Endpoint
NSG
Azure WAF
Interview Answer

"I would never store secrets directly in appsettings or source control. In Azure, I would prefer Managed Identity and Azure Key Vault. For APIs, I would use OAuth/JWT-based authentication and authorization, HTTPS, validation, rate limiting and appropriate RBAC."

7. Reliability

Reliability means:

Can the system continue working correctly and recover when something fails?

Example:

API
 ↓
Service Bus
 ↓
Payment Service

If the Payment Service is temporarily unavailable, instead of losing the request:

API → Service Bus → Payment Service

The message can remain in the queue and be processed later.

Important Reliability Concepts
Retry
Timeout
Circuit breaker
Dead-letter queue
Idempotency
Failover
Backup
Recovery
Example

If an external API fails:

Request
   ↓
External API
   ↓
Failure
   ↓
Retry
   ↓
Failure
   ↓
Circuit Breaker

Do not retry forever.

8. Maintainability

Maintainability means:

How easily can developers understand, modify, test and deploy the system?

Important Practices
SOLID principles
Clean Architecture
Separation of concerns
Dependency Injection
Design Patterns
Unit Testing
Integration Testing
Code Reviews
Documentation
Coding standards
Example

Instead of putting everything inside a controller:

Controller
   ↓
Everything
   ↓
Database

Prefer:

Controller
   ↓
Application / Service Layer
   ↓
Repository
   ↓
Database
Example NFR

New developers should be able to understand and modify a service without requiring extensive knowledge of unrelated services.

9. Observability

Observability means:

Can we understand what is happening inside the system?

There are three major pillars.

9.1 Logs
OrderService
OrderId = 123
Payment failed
9.2 Metrics
CPU = 72%
Requests = 5,000/min
Error rate = 1.2%
Latency = 300 ms
9.3 Distributed Tracing

Follow one request across multiple services:

API
 ↓
Order Service
 ↓
Payment Service
 ↓
Database
Azure Examples
Application Insights
Azure Monitor
Log Analytics
Interview Answer

"For observability, I would implement centralized structured logging, metrics and distributed tracing. In Azure, Application Insights and Azure Monitor can help identify latency, failures, dependency issues and infrastructure problems."

10. Disaster Recovery

Disaster Recovery means:

What happens if the primary system or region goes down?

Two important terms are:

RTO — Recovery Time Objective

How quickly must we recover?

Example:

RTO = 30 minutes

The system must be restored within 30 minutes.

RPO — Recovery Point Objective

How much data can we afford to lose?

Example:

RPO = 5 minutes

Maximum acceptable data loss is 5 minutes.

Easy Way to Remember
RTO → Time
RPO → Data

11. Compatibility

Compatibility means the system should work correctly with:

Different browsers
Different API versions
Different clients
Different operating systems
Existing systems
API Versioning Example
/api/v1/orders
/api/v2/orders

This allows older clients to continue working.

12. Usability

Usability means:

How easy is the system for users to use?

Examples:

Simple UI
Clear error messages
Accessibility
Responsive design
Consistent navigation

For backend interviews, this is generally less important than:

Performance
Security
Scalability
Availability
Reliability

13. Compliance

Depending on the business domain, systems may need to comply with:

GDPR
PCI DSS
HIPAA
SOC 2
ISO 27001

Requirements may include:

Audit logs
Data retention
Encryption
Access control
Data masking

14. Cost Efficiency

Cost efficiency is especially important in cloud architecture.

Example:

Don't run 20 expensive VMs 24/7 if the application only needs high capacity during business hours.

Possible Approaches
Autoscaling
Serverless
Right-size resources
Reserved instances
Caching
Storage lifecycle policies

15. How NFRs Affect Architecture

This is very important for System Design interviews.

Suppose the interviewer says:

"Design an order-processing system."

Don't immediately start drawing APIs.

First ask about the NFRs.

Performance

What response-time SLA do we need?

Scalability

How many users/requests/orders are expected?

Availability

What uptime is required?

Security

What authentication and authorization requirements exist?

Reliability

What happens if Payment Service is unavailable?

Data

How much data will be generated? What is the retention period?

Disaster Recovery

What are the RPO and RTO requirements?

16. Example: E-Commerce NFRs

Imagine designing an e-commerce application.

Requirements:

10,000 requests/sec
99.99% availability
API response < 500 ms for 95% requests
Support 1 million users
Payment must be reliable
Sensitive data must be encrypted
RTO = 30 minutes
RPO = 5 minutes

A possible architecture:

                    Azure Front Door
                           |
                          WAF
                           |
                    API Management
                           |
                    Load Balancer
                           |
             ┌─────────────┴─────────────┐
             ↓                           ↓
       Order Service              Product Service
             ↓                           ↓
       Azure Service Bus               Redis
             ↓
       Payment Service
             ↓
          Database
             |
        Read Replicas

Observability:

Application Insights
        ↓
Logs + Metrics + Traces

Security:

Azure Key Vault
        ↓
     Secrets

The important point is:

NFRs drive architectural decisions.

17. Most Important Interview Questions
Q1. What are NFRs?

"Non-functional requirements describe the quality attributes and constraints of a system, such as performance, scalability, availability, security, reliability and maintainability. They define how well the system should operate rather than what functionality it provides."

Q2. Functional Requirement vs NFR?

"Functional requirements describe what the system does, while NFRs describe how well it should do it. For example, 'user can place an order' is functional, while 'order API should respond within 500 milliseconds' is non-functional."

Q3. What is scalability?

"Scalability is the ability of a system to handle increasing workload by adding resources. Vertical scaling increases resources of an existing instance, while horizontal scaling adds more instances. Cloud-native applications generally favor horizontal scaling."

Q4. What is availability?

"Availability measures how much time a system remains operational. It is commonly represented using SLAs such as 99.9%, 99.99%, etc."

Q5. What is reliability?

"Reliability is the ability of a system to continue performing correctly despite failures and to recover gracefully. Techniques include retries, timeouts, circuit breakers, queues, failover and idempotency."

Q6. RPO vs RTO?

"RTO defines how quickly the system needs to be recovered after a failure, while RPO defines how much data loss is acceptable."

Q7. How do you improve API performance?

"I first identify the bottleneck using metrics and tracing. Then I optimize database queries and indexes, introduce caching where appropriate, use asynchronous I/O, reduce unnecessary network calls and payload sizes, and use horizontal scaling if required."

18. Quick Revision Table
NFR	Easy Meaning	Example
Performance	How fast?	API < 500 ms
Scalability	How much load?	10K requests/sec
Availability	How much uptime?	99.99%
Security	How protected?	JWT + Key Vault
Reliability	How well does it handle failures?	Retry + Circuit Breaker
Maintainability	How easy to change?	SOLID + Clean Architecture
Observability	Can we see what's happening?	Logs + Metrics + Traces
DR	How quickly/data-loss recovery?	RTO/RPO
Compatibility	Does it work with other systems?	API versioning
Usability	How easy to use?	Simple UI
Compliance	Does it meet regulations?	GDPR/PCI
Cost	How efficiently are resources used?	Autoscaling

19. Priority for .NET + Azure Interviews

Focus on these in this order:

1. Performance
        ↓
2. Scalability
        ↓
3. Availability
        ↓
4. Security
        ↓
5. Reliability
        ↓
6. Observability
        ↓
7. Disaster Recovery
        ↓
8. Maintainability

These are especially important for interviews involving:

ASP.NET Core
.NET
Azure
AKS
Microservices
SQL Server
Redis
Azure Service Bus
Azure API Management
Azure Functions
Application Insights
System Design

⭐ Final Interview Shortcut

Remember:

Performance  → How FAST?
Scalability  → How MUCH LOAD?
Availability  → How MUCH UPTIME?
Security     → How PROTECTED?
Reliability  → What happens when it FAILS?
Observability→ Can I SEE the problem?
RTO          → How FAST can I RECOVER?
RPO          → How MUCH DATA can I LOSE?
Maintainability → How EASY to CHANGE?
Cost         → How MUCH does it COST?

This is the core NFR cheat sheet to remember before a .NET/Azure system-design interview.