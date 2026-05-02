# Power Automate

- Automate the tasks.

## Features

- Easy to use
- Low Code/No code
- Comprehensive
- Scalable

## Environments

- [flow](https://flow.microsoft.com)
- []

- Power App ---> Backend
- Power Pages ---> Frontend
- Power Automate ----> Automate the tasks

## Portal Management v/s Power Pages Management 

- Is a same thing.

## Important Links

- [Power Platform Admin Centre](admin.powerplatform.com)
- [PowerApps Maker](make.powerapps.com)
- [Power Pages Design Studio](make.powerpages.microsoft.com)
- [Microsoft Office](portal.office.com)
- [Power Automate](flow.microsoft.com)

> Microsoft documentation for Power Pages can be located [here](https://learn.microsoft.com/en-us/power-pages/).

## Account, User, and Contact Diff

1. Account

    Definition: Represents a company, organization, or business entity.
    Purpose: Used to store information about businesses or organizations that interact with your organization (e.g., customers, vendors, partners).
    Key Attributes:
        Account Name: Name of the organization.
        Address: Physical or mailing address.
        Phone Number: Contact number of the organization.
        Primary Contact: Link to a Contact record representing the main person at the organization.
    Typical Use Case: Managing B2B (business-to-business) relationships.

2. User

    Definition: Represents an individual who has access to the Power Apps environment or Dataverse.
    Purpose: Used for authentication, authorization, and tracking ownership of records within the system.
    Key Attributes:
        Full Name: Name of the user.
        Email Address: User's email for notifications and login.
        Role: Security role assigned to define access permissions.
    Typical Use Case:
        Assigning ownership of records (e.g., "Who owns this lead?").
        Tracking system activity by users (e.g., created/modified records).

3. Contact

    Definition: Represents an individual person, often associated with an account.
    Purpose: Used to store information about people, typically in the context of B2C (business-to-consumer) or as points of contact for accounts.
    Key Attributes:
        First Name and Last Name: The person's name.
        Email Address: Email for communication.
        Phone Number: Contact number.
        Parent Account: Links the contact to an Account record (e.g., an employee of a company).
    Typical Use Case:
        Managing personal customer details in B2C scenarios.
        Storing employee details for an organization in B2B scenarios.

Key Relationships Between Them:

    Account ↔ Contact: Contacts are often linked to Accounts (e.g., a contact is an employee of a company).
    User ↔ Account/Contact: Users manage Accounts and Contacts, and their activities (e.g., creating, modifying records) are tracked in the system.

Example Scenario:

    A company named Acme Corp is an Account.
    John Doe is a Contact who works at Acme Corp.
    Jane Smith is a User in your organization, managing the Acme Corp account and communicating with John Doe.