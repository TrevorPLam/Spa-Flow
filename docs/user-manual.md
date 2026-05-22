# Spa-Flow Staff User Manual

**Last Updated:** May 22, 2026  
**Version:** 1.0

---

## Table of Contents

1. [Introduction](#introduction)
2. [Getting Started](#getting-started)
3. [Authentication](#authentication)
4. [Client Management](#client-management)
5. [Check-In Process](#check-in-process)
6. [Locker Management](#locker-management)
7. [Room Management](#room-management)
8. [Waitlist Management](#waitlist-management)
9. [Product Inventory](#product-inventory)
10. [Transactions](#transactions)
11. [Reports and Analytics](#reports-and-analytics)
12. [Staff Administration](#staff-administration)
13. [Session Management](#session-management)
14. [Best Practices](#best-practices)

---

## Introduction

Spa-Flow is a spa management system that helps you manage clients, resources (lockers and rooms), memberships, payments, and staff administration. This manual will guide you through all the features and workflows you need to perform your daily tasks.

### What You Can Do

- **Check in clients** and assign lockers or rooms
- **Manage client profiles** and memberships
- **Track resource availability** in real-time
- **Process payments** securely through Square
- **View reports** on revenue and utilization
- **Manage the waitlist** when rooms are full
- **Track product inventory** and sales

### User Roles

- **STAFF:** Can perform daily operations (check-in, client management, resource assignment)
- **MANAGER:** Has all STAFF permissions plus access to reports, staff management, and audit logs

---

## Getting Started

### Accessing the System

1. Open your web browser and navigate to the Spa-Flow URL provided by your manager
2. You will see the login page
3. Enter your username and password
4. Click "Sign In"

### First-Time Login

If this is your first time logging in:
1. Use the temporary credentials provided by your manager
2. You will be prompted to change your password immediately
3. Create a new password (minimum 15 characters)
4. Your password is now set and you can proceed

### Dashboard Overview

After logging in, you'll see the Dashboard with:
- **Current occupancy** of lockers and rooms
- **Today's revenue** summary
- **Active sessions** count
- **Waitlist size** (if any clients are waiting)

---

## Authentication

### Logging In

1. Navigate to the login page
2. Enter your username and password
3. Click "Sign In"

**Note:** After 5 failed login attempts, your account will be locked for 15 minutes. Contact a manager if you get locked out.

### Logging Out

1. Click your name in the top-right corner
2. Select "Logout" from the dropdown menu

### Password Reset

If you forget your password:
1. Click "Forgot Password?" on the login page
2. Enter your email address
3. Check your email for password reset instructions
4. Follow the link to create a new password

**Important:** Password reset links expire after 1 hour.

### Session Management

Your session automatically expires after 15 minutes of inactivity for security. You'll need to log in again if this happens.

---

## Client Management

### Creating a New Client

1. Navigate to the **Clients** page
2. Click "New Client" button
3. Fill in the required information:
   - **First Name** (required)
   - **Last Name** (required)
   - **Email** (required)
   - **Phone Number** (required)
   - **Date of Birth** (required)
   - **Address** (optional)
   - **Document Number** (optional - for ID verification)
4. Click "Create Client"

### Searching for Clients

1. Navigate to the **Clients** page
2. Use the search bar to find clients by:
   - Name
   - Email
   - Phone number
   - Member ID
3. Results appear as you type

### Viewing Client Details

1. Click on a client's name from the client list
2. You'll see:
   - Client profile information
   - Membership status
   - Rental history
   - Transaction history

### Updating Client Information

1. Navigate to the client's detail page
2. Click "Edit" button
3. Update the information as needed
4. Click "Save Changes"

### Adding a Membership

1. Navigate to the client's detail page
2. Click "Add Membership"
3. Select membership type:
   - **One-Time:** Single visit membership
   - **Six-Month:** 6-month membership with discounts
4. Process payment through Square
5. Membership is now active

### Deleting a Client

**MANAGER ONLY**

1. Navigate to the client's detail page
2. Click "Delete Client"
3. Confirm the deletion

**Warning:** This action cannot be undone. All rental history and transactions will be deleted.

---

## Check-In Process

The check-in process combines client search, payment processing, and resource assignment in one streamlined flow.

### Step-by-Step Check-In

1. Navigate to the **Check-In** page
2. **Search for Client:**
   - Enter client name, email, phone, or member ID
   - Select the client from the results
   - If client doesn't exist, click "Create New Client"

3. **Select Resource Type:**
   - Choose **Locker** or **Room**
   - View available resources in real-time

4. **Select Specific Resource:**
   - Click on an available locker or room
   - View resource details (number, location)

5. **Process Payment:**
   - Enter payment amount (auto-calculated based on resource type and duration)
   - Select payment method (cash, card, or Square terminal)
   - If using Square, follow the on-screen prompts
   - Payment is processed securely

6. **Confirm Assignment:**
   - Review the assignment details
   - Click "Confirm Check-In"
   - Resource is now assigned to the client

### Check-In Pricing

- **Locker Rental:** Base rate + tax
- **Room Rental:** Base rate + tax
- **Membership Discounts:** Six-month members receive discounted rates
- **Birthday Special:** Free rental on client's birthday
- **Age Discount:** 18-24 year olds receive discounted rates

### Renewals and Extensions

After check-in, you can:
- **Renew:** Extend the session for another 6 hours
- **Extend:** Add 2 hours to the current session

---

## Locker Management

### Viewing Locker Status

1. Navigate to the **Lockers** page
2. You'll see all lockers with their current status:
   - **Available:** Green - ready for assignment
   - **Occupied:** Red - currently in use
   - **Reserved:** Yellow - reserved for a client

### Assigning a Locker

1. Navigate to the **Lockers** page
2. Click on an available locker
3. Select a client from the dropdown or search
4. Click "Assign"
5. Process payment if required

### Releasing a Locker

1. Navigate to the **Lockers** page
2. Click on an occupied locker
3. Click "Release"
4. Confirm the release
5. Locker is now available

### Renewing a Locker Session

1. Navigate to the **Lockers** page
2. Click on an occupied locker
3. Click "Renew"
4. Process payment for 6-hour extension
5. Session is extended

### Extending a Locker Session

1. Navigate to the **Lockers** page
2. Click on an occupied locker
3. Click "Extend"
4. Process payment for 2-hour extension
5. Session is extended

### Bulk Release

To release multiple lockers at once:
1. Navigate to the **Lockers** page
2. Select multiple lockers using checkboxes
3. Click "Bulk Release"
4. Confirm the action

---

## Room Management

### Viewing Room Status

1. Navigate to the **Rooms** page
2. You'll see all rooms with their current status:
   - **Available:** Green - ready for assignment
   - **Occupied:** Red - currently in use
   - **Reserved:** Yellow - reserved for a client

### Assigning a Room

1. Navigate to the **Rooms** page
2. Click on an available room
3. Select a client from the dropdown or search
4. Click "Assign"
5. Process payment if required

### Releasing a Room

1. Navigate to the **Rooms** page
2. Click on an occupied room
3. Click "Release"
4. Confirm the release
5. Room is now available

### Renewing a Room Session

1. Navigate to the **Rooms** page
2. Click on an occupied room
3. Click "Renew"
4. Process payment for 6-hour extension
5. Session is extended

### Extending a Room Session

1. Navigate to the **Rooms** page
2. Click on an occupied room
3. Click "Extend"
4. Process payment for 2-hour extension
5. Session is extended

### Bulk Release

To release multiple rooms at once:
1. Navigate to the **Rooms** page
2. Select multiple rooms using checkboxes
3. Click "Bulk Release"
4. Confirm the action

---

## Waitlist Management

When all rooms are occupied, clients can join the waitlist. The system automatically assigns rooms as they become available.

### Adding a Client to the Waitlist

1. Navigate to the **Waitlist** page
2. Click "Add to Waitlist"
3. Search for or create a client
4. Click "Add to Waitlist"
5. Client is added to the queue

### Viewing Waitlist Position

The waitlist shows:
- Client name and contact information
- Position in queue (1, 2, 3, etc.)
- Time added to waitlist
- Status (waiting, assigned, expired)

### Confirming Room Assignment

When a room becomes available:
1. The client at the top of the waitlist receives an SMS notification (if configured)
2. Navigate to the **Waitlist** page
3. Click "Confirm" next to the client's name
4. The client has 15 minutes to confirm
5. If not confirmed within 15 minutes, the assignment expires and goes to the next person

### Removing from Waitlist

1. Navigate to the **Waitlist** page
2. Click "Remove" next to the client's name
3. Confirm the removal

### Automatic Assignment

The system automatically:
- Assigns rooms to waitlist clients when they become available
- Sends SMS notifications (if Twilio is configured)
- Expires unconfirmed assignments after 15 minutes
- Moves to the next client if assignment expires

---

## Product Inventory

### Viewing Products

1. Navigate to the **Products** page
2. You'll see all products with:
   - Product name
   - Category
   - Price
   - Stock quantity
   - Low stock alert (if applicable)

### Adding a New Product

**MANAGER ONLY**

1. Navigate to the **Products** page
2. Click "Add Product"
3. Fill in product information:
   - Name (required)
   - Category (required)
   - Price (required)
   - Stock quantity (required)
   - Description (optional)
4. Click "Create Product"

### Updating Product Information

**MANAGER ONLY**

1. Navigate to the **Products** page
2. Click on a product
3. Click "Edit"
4. Update the information
5. Click "Save Changes"

### Updating Stock

**MANAGER ONLY**

1. Navigate to the **Products** page
2. Click on a product
3. Update the stock quantity
4. Click "Save Changes"

### Viewing Low Stock Products

1. Navigate to the **Products** page
2. Products with low stock are highlighted
3. Click "Low Stock" to filter only low-stock items

### Deleting a Product

**MANAGER ONLY**

1. Navigate to the **Products** page
2. Click on a product
3. Click "Delete"
4. Confirm the deletion

---

## Transactions

### Viewing Transaction History

1. Navigate to the **Transactions** page
2. You'll see all transactions with:
   - Transaction ID
   - Client name
   - Amount
   - Type (locker rental, room rental, membership, product)
   - Date and time
   - Payment method

### Filtering Transactions

1. Navigate to the **Transactions** page
2. Use filters to narrow results:
   - By client
   - By date range
   - By transaction type
3. Click "Apply Filters"

### Viewing Client Transactions

1. Navigate to a client's detail page
2. Click "Transaction History" tab
3. View all transactions for that client

### Exporting Transactions

1. Navigate to the **Transactions** page
2. Apply any desired filters
3. Click "Export"
4. Select file format (CSV, PDF)
5. Download the file

---

## Reports and Analytics

**MANAGER ONLY**

### Revenue Reports

1. Navigate to the **Reports** page
2. Click "Revenue Report"
3. Select date range
4. Select time granularity (hourly, daily, weekly, monthly)
5. Click "Generate Report"
6. View revenue trends over time

### Revenue by Type

1. Navigate to the **Reports** page
2. Click "Revenue by Type"
3. Select date range
4. Click "Generate Report"
5. View revenue breakdown by:
   - Locker rentals
   - Room rentals
   - Memberships
   - Products

### Utilization Reports

**Locker Utilization:**
1. Navigate to the **Reports** page
2. Click "Locker Utilization"
3. Select date range
4. Click "Generate Report"
5. View locker occupancy rates over time

**Room Utilization:**
1. Navigate to the **Reports** page
2. Click "Room Utilization"
3. Select date range
4. Click "Generate Report"
5. View room occupancy rates over time

### Peak Hours Analysis

1. Navigate to the **Reports** page
2. Click "Peak Hours"
3. Select date range
4. Click "Generate Report"
5. View busiest times of day for rentals

---

## Staff Administration

**MANAGER ONLY**

### Viewing Staff Users

1. Navigate to the **Users** page
2. You'll see all staff users with:
   - Username
   - Role (STAFF or MANAGER)
   - Account status (active or locked)

### Creating a New Staff User

1. Navigate to the **Users** page
2. Click "Add User"
3. Fill in user information:
   - Username (required)
   - Email (required)
   - Role (STAFF or MANAGER)
4. Click "Create User"
5. Temporary password will be generated
6. Share credentials with the new staff member

### Updating Staff User

1. Navigate to the **Users** page
2. Click on a user
3. Click "Edit"
4. Update information as needed
5. Click "Save Changes"

### Deleting a Staff User

1. Navigate to the **Users** page
2. Click on a user
3. Click "Delete"
4. Confirm the deletion

### Unlocking a Locked Account

If a staff member is locked out due to too many failed login attempts:
1. Navigate to the **Users** page
2. Click on the locked user
3. Click "Unlock Account"
4. Account is now unlocked

### Viewing Audit Logs

1. Navigate to the **Audit Logs** page
2. You'll see all system actions with:
   - Action performed
   - User who performed it
   - Timestamp
   - Related resource (if applicable)
3. Use filters to narrow results:
   - By action type
   - By user
   - By date range

---

## Session Management

### Viewing Your Active Sessions

1. Click your name in the top-right corner
2. Select "Sessions" from the dropdown
3. You'll see all your active login sessions with:
   - Device/browser
   - IP address
   - Last activity time

### Revoking a Session

1. Navigate to the **Sessions** page
2. Click "Revoke" next to a session
3. Confirm the revocation
4. That session is now terminated

### Revoking All Other Sessions

To log out from all other devices:
1. Navigate to the **Sessions** page
2. Click "Revoke All Other Sessions"
3. Confirm the action
4. All other sessions are terminated (except your current one)

---

## Best Practices

### Daily Operations

- **Start your day** by checking the Dashboard for current occupancy
- **Check the waitlist** first thing in the morning
- **Release resources** promptly when clients finish
- **Process payments** immediately after check-in
- **Verify client information** before creating new profiles

### Client Service

- **Be friendly and welcoming** to all clients
- **Verify client identity** before accessing their information
- **Explain the process** to new clients
- **Handle payment issues** professionally
- **Follow up** on waitlist confirmations promptly

### Security

- **Never share your password** with anyone
- **Log out** when you're done for the day
- **Lock your screen** if you step away from your computer
- **Report suspicious activity** to a manager immediately
- **Use strong passwords** (minimum 15 characters)

### Data Accuracy

- **Double-check client information** before saving
- **Verify payment amounts** before processing
- **Confirm resource assignments** before finalizing
- **Keep records accurate** for reporting purposes

### Troubleshooting

If you encounter issues:
1. **Check your internet connection**
2. **Refresh the page** (F5 or Cmd+R)
3. **Try logging out and back in**
4. **Check if the issue is browser-specific** (try a different browser)
5. **Contact your manager** if the issue persists

---

## Getting Help

### Documentation

- **User Manual:** This document
- **Quick Reference:** Quick reference guide for common tasks
- **FAQ:** Frequently asked questions
- **Troubleshooting Guide:** Common issues and solutions

### Contact Information

- **Manager:** [Your manager's name and contact]
- **IT Support:** [IT support contact information]
- **Emergency:** [Emergency contact information]

---

## Glossary

- **Assignment:** The act of assigning a locker or room to a client
- **Check-In:** The process of registering a client and assigning a resource
- **Membership:** A client's membership status (one-time or six-month)
- **Occupancy:** The number of resources currently in use
- **Release:** The act of making a resource available again
- **Renew:** Extending a session for 6 hours
- **Extend:** Adding 2 hours to a session
- **Session:** A rental period for a locker or room
- **Waitlist:** A queue for clients waiting for room availability

---

**End of User Manual**
