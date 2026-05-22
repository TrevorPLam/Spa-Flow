# Spa-Flow FAQ (Frequently Asked Questions)

**Last Updated:** May 22, 2026  
**Version:** 1.0

---

## General Questions

### What is Spa-Flow?

Spa-Flow is a spa management system that helps you manage clients, resources (lockers and rooms), memberships, payments, and staff administration in one centralized system.

### How do I access Spa-Flow?

Open your web browser and navigate to the URL provided by your manager. Log in with your username and password.

### What if I forget my password?

Click "Forgot Password?" on the login page, enter your email address, and follow the instructions in the email to reset your password. Password reset links expire after 1 hour.

### Why was I logged out automatically?

For security, your session expires after 15 minutes of inactivity. Simply log in again to continue working.

---

## Client Management

### How do I create a new client?

Navigate to the Clients page, click "New Client," fill in the required fields (first name, last name, email, phone, date of birth), and click "Create Client."

### Can I update client information later?

Yes. Navigate to the client's detail page, click "Edit," make your changes, and click "Save Changes."

### What information is required for a new client?

Required fields: first name, last name, email, phone number, and date of birth. Address and document number are optional.

### How do I search for a client?

Use the search bar on the Clients page. You can search by name, email, phone number, or member ID. Results appear as you type.

### What is the difference between one-time and six-month memberships?

- **One-time membership:** Single visit, no discounts
- **Six-month membership:** 6-month membership with discounted rental rates

### Can a client have multiple memberships?

Yes, a client can have multiple memberships. The most recent active membership is used for pricing calculations.

---

## Check-In Process

### What is the check-in process?

The check-in process combines client search, resource selection, and payment processing in one streamlined flow. Go to the Check-In page, search for a client, select a resource type, choose a specific resource, process payment, and confirm the assignment.

### How are prices calculated?

Prices are calculated based on:
- Resource type (locker or room)
- Membership status (six-month members get discounts)
- Special offers (birthday free, age 18-24 discounts)
- Tax rate (configurable, default 8.875%)

### What payment methods are accepted?

Cash, card, and Square terminal payments are accepted.

### Can I check in a client without a membership?

Yes, clients can be checked in without a membership. They'll pay the standard rate.

### What happens if payment fails?

If payment fails, the check-in is not completed. Try the payment again or use a different payment method.

---

## Resource Management

### What do the colors mean on the Lockers/Rooms pages?

- **Green:** Available for assignment
- **Red:** Currently occupied
- **Yellow:** Reserved for a client

### How long is a standard rental session?

Standard rental sessions are 6 hours.

### What is the difference between renew and extend?

- **Renew:** Extends the session for 6 hours
- **Extend:** Adds 2 hours to the current session

### Can I release a resource early?

Yes. Click on the occupied resource and click "Release." The resource becomes available immediately.

### What happens if I don't release a resource?

The system automatically expires sessions after 6 hours and releases the resource. However, it's best practice to release resources promptly when clients finish.

### Can I release multiple resources at once?

Yes. Select multiple resources using checkboxes and click "Bulk Release."

---

## Waitlist

### When should I use the waitlist?

Use the waitlist when all rooms are occupied and a client is willing to wait for availability.

### How does the waitlist work?

Clients are added to a queue. When a room becomes available, the system automatically assigns it to the first person on the waitlist and sends an SMS notification (if configured). The client has 15 minutes to confirm the assignment.

### What happens if a client doesn't confirm within 15 minutes?

The assignment expires and automatically goes to the next person on the waitlist.

### Can I remove a client from the waitlist?

Yes. Navigate to the Waitlist page, click "Remove" next to the client's name, and confirm.

### Does the waitlist apply to lockers?

No, the waitlist is only for rooms. Lockers are first-come, first-served based on availability.

---

## Products

### How do I add a new product?

Navigate to the Products page, click "Add Product," fill in the product information (name, category, price, stock quantity), and click "Create Product." This requires MANAGER role.

### How do I update stock levels?

Navigate to the Products page, click on a product, update the stock quantity, and click "Save Changes." This requires MANAGER role.

### What is a low stock alert?

Products with low stock are highlighted on the Products page. The threshold for low stock alerts is configurable.

### Can I delete a product?

Yes, but this requires MANAGER role. Navigate to the Products page, click on a product, click "Delete," and confirm.

---

## Transactions

### How do I view transaction history?

Navigate to the Transactions page to see all transactions. You can filter by client, date range, or transaction type.

### Can I export transactions?

Yes. Apply your desired filters on the Transactions page, click "Export," select a file format (CSV or PDF), and download the file.

### What information is shown in transaction history?

Transaction ID, client name, amount, type (locker rental, room rental, membership, product), date and time, and payment method.

---

## Reports

### Who can access reports?

Only users with MANAGER role can access reports.

### What reports are available?

- Revenue reports (by date range and time granularity)
- Revenue by type (locker, room, membership, products)
- Locker utilization rates
- Room utilization rates
- Peak hours analysis

### How do I generate a report?

Navigate to the Reports page, select the report type, choose a date range, and click "Generate Report."

---

## Staff Administration

### Who can manage staff users?

Only users with MANAGER role can create, update, or delete staff users.

### How do I create a new staff user?

Navigate to the Users page, click "Add User," fill in the username, email, and role (STAFF or MANAGER), and click "Create User." A temporary password will be generated.

### What is the difference between STAFF and MANAGER roles?

- **STAFF:** Can perform daily operations (check-in, client management, resource assignment)
- **MANAGER:** Has all STAFF permissions plus access to reports, staff management, and audit logs

### How do I unlock a locked account?

Navigate to the Users page, click on the locked user, and click "Unlock Account." This requires MANAGER role.

### What are audit logs?

Audit logs track all system actions including who performed them, when, and what was changed. Only MANAGER role can view audit logs.

---

## Security

### What are the password requirements?

Minimum 15 characters. There are no composition rules (no special character requirements).

### Why was my account locked?

Your account is locked after 5 failed login attempts. The lockout lasts 15 minutes.

### How do I unlock my account?

Wait 15 minutes for the automatic unlock, or contact a manager to unlock it immediately.

### Is my data secure?

Yes. Spa-Flow uses industry-standard security measures including:
- JWT authentication with 15-minute session expiry
- Encrypted PII fields (date of birth, address, document number)
- CSRF protection
- Rate limiting
- Audit logging

### Should I share my password?

No. Never share your password with anyone. If you suspect your password has been compromised, change it immediately and notify your manager.

---

## Troubleshooting

### The page isn't loading. What should I do?

Refresh the page (F5 on Windows, Cmd+R on Mac). Check your internet connection. Try a different browser if the issue persists.

### I can't log in. What should I do?

Verify your username and password. If you've had 5 failed attempts, wait 15 minutes for the lockout to expire or contact a manager to unlock your account.

### Payment failed. What should I do?

Check the Square terminal connection. Verify the card is valid and has sufficient funds. Try the payment again or use a different payment method.

### The system is slow. What should I do?

Check your internet connection. Close other browser tabs. If the issue persists, contact IT support.

### I found a bug in the system. What should I do?

Report the issue to your manager or IT support. Include details about what you were doing when the bug occurred and any error messages you saw.

---

## Getting Help

### Where can I find more documentation?

- **User Manual:** Comprehensive guide to all features
- **Quick Reference:** One-page guide for common tasks
- **Troubleshooting Guide:** Common issues and solutions
- **Video Tutorials:** Step-by-step video scripts

### Who should I contact for help?

- **Manager:** For day-to-day questions and account issues
- **IT Support:** For technical problems and system issues
- **Emergency:** For urgent system outages

---

**End of FAQ**
