# Spa-Flow Troubleshooting Guide

**Last Updated:** May 22, 2026  
**Version:** 1.0

This guide helps you resolve common issues when using Spa-Flow. For issues not covered here, contact your manager or IT support.

---

## Table of Contents

1. [Login and Authentication Issues](#login-and-authentication-issues)
2. [Page Loading Issues](#page-loading-issues)
3. [Payment Issues](#payment-issues)
4. [Resource Assignment Issues](#resource-assignment-issues)
5. [Client Management Issues](#client-management-issues)
6. [Waitlist Issues](#waitlist-issues)
7. [Performance Issues](#performance-issues)
8. [System Status Checks](#system-status-checks)
9. [Escalation Procedures](#escalation-procedures)

---

## Login and Authentication Issues

### Issue: Cannot log in

**Symptoms:**
- Login page shows "Invalid username or password"
- Page refreshes after clicking "Sign In"

**Possible Causes:**
- Incorrect username or password
- Account locked due to too many failed attempts
- Browser issue

**Solutions:**
1. Verify your username and password are correct
2. If you've had 5 failed attempts, wait 15 minutes for automatic unlock
3. Try clearing your browser cache and cookies
4. Try a different browser (Chrome, Firefox, Safari)
5. Contact a manager to unlock your account if needed

---

### Issue: Account locked out

**Symptoms:**
- Login page shows "Account locked"
- Cannot log in even with correct credentials

**Possible Causes:**
- 5 failed login attempts within 15 minutes

**Solutions:**
1. Wait 15 minutes for automatic unlock
2. Contact a manager to unlock your account immediately
3. Verify you're using the correct username before trying again

---

### Issue: Password reset link expired

**Symptoms:**
- Clicking password reset link shows "Link expired" or similar error

**Possible Causes:**
- Password reset link is older than 1 hour
- Link already used

**Solutions:**
1. Request a new password reset from the login page
2. Use the new link within 1 hour
3. Check spam folder if email doesn't arrive

---

### Issue: Session expired unexpectedly

**Symptoms:**
- Logged out while actively using the system
- "Session expired" message appears

**Possible Causes:**
- 15 minutes of inactivity
- Server restart
- Network interruption

**Solutions:**
1. Log in again
2. If this happens frequently, check your internet connection
3. Contact IT support if issue persists

---

## Page Loading Issues

### Issue: Page not loading

**Symptoms:**
- Blank page
- Loading spinner spins indefinitely
- "Page not found" error

**Possible Causes:**
- Internet connection issue
- Browser cache issue
- Server downtime

**Solutions:**
1. Refresh the page (F5 on Windows, Cmd+R on Mac)
2. Check your internet connection
3. Try a different browser
4. Clear browser cache and cookies
5. Check if other websites load
6. Contact IT support if issue persists

---

### Issue: Page loads slowly

**Symptoms:**
- Page takes more than 10 seconds to load
- Actions are delayed

**Possible Causes:**
- Slow internet connection
- High server load
- Too many browser tabs open

**Solutions:**
1. Check your internet speed
2. Close other browser tabs
3. Restart your browser
4. Try during off-peak hours
5. Contact IT support if issue persists

---

### Issue: Buttons not responding

**Symptoms:**
- Clicking buttons does nothing
- No action when clicking links

**Possible Causes:**
- JavaScript disabled
- Browser compatibility issue
- Page not fully loaded

**Solutions:**
1. Wait for page to fully load
2. Enable JavaScript in browser settings
3. Try a different browser
4. Refresh the page
5. Contact IT support if issue persists

---

## Payment Issues

### Issue: Payment failed

**Symptoms:**
- "Payment failed" error message
- Square terminal shows error

**Possible Causes:**
- Card declined
- Insufficient funds
- Network issue with Square
- Invalid card information

**Solutions:**
1. Verify card is valid and has sufficient funds
2. Check Square terminal connection
3. Try the payment again
4. Use a different payment method (cash, different card)
5. Contact Square support if terminal issue persists

---

### Issue: Square terminal not connecting

**Symptoms:**
- "Cannot connect to Square terminal" error
- Terminal not listed in payment options

**Possible Causes:**
- Terminal not powered on
- Network issue
- Terminal not paired

**Solutions:**
1. Verify Square terminal is powered on
2. Check terminal network connection
3. Restart the Square terminal
4. Re-pair the terminal in Square settings
5. Contact IT support if issue persists

---

### Issue: Payment amount incorrect

**Symptoms:**
- Price shown doesn't match expected amount
- Tax calculation seems wrong

**Possible Causes:**
- Membership status not applied
- Special discount not recognized
- Tax rate configuration issue

**Solutions:**
1. Verify client's membership status
2. Check if special discounts should apply (birthday, age)
3. Verify tax rate is correct
4. Contact manager if pricing seems incorrect

---

## Resource Assignment Issues

### Issue: Resource not available

**Symptoms:**
- Cannot assign locker or room
- "No available resources" message

**Possible Causes:**
- All resources occupied
- Resources reserved
- System showing incorrect status

**Solutions:**
1. Check if any resources are actually available
2. Add client to waitlist for rooms
3. Verify resource status is correct
4. Release any incorrectly occupied resources
5. Contact IT support if status seems incorrect

---

### Issue: Cannot release resource

**Symptoms:**
- Release button not working
- "Cannot release" error message

**Possible Causes:**
- Active payment not processed
- System issue
- Resource already released

**Solutions:**
1. Verify payment was processed
2. Refresh the page
3. Check if resource is already released
4. Contact IT support if issue persists

---

### Issue: Resource status incorrect

**Symptoms:**
- Resource shows occupied but is actually available
- Resource shows available but is actually occupied

**Possible Causes:**
- System sync issue
- Previous release not processed
- Manual override needed

**Solutions:**
1. Refresh the page
2. Check audit logs for recent changes
3. Contact manager to manually correct status
4. Contact IT support if issue persists

---

## Client Management Issues

### Issue: Client not found in search

**Symptoms:**
- Search returns no results
- Client exists but doesn't appear

**Possible Causes:**
- Typo in search term
- Client not in system
- Search index issue

**Solutions:**
1. Try different search terms (name, email, phone)
2. Check spelling
3. Create new client profile if truly not in system
4. Contact IT support if search seems broken

---

### Issue: Cannot create client

**Symptoms:**
- "Create Client" button not working
- Error when saving client

**Possible Causes:**
- Required fields missing
- Duplicate email or phone
- System issue

**Solutions:**
1. Verify all required fields are filled
2. Check if email or phone already exists
3. Refresh the page
4. Contact IT support if issue persists

---

### Issue: Cannot update client information

**Symptoms:**
- Changes not saving
- Error when clicking "Save"

**Possible Causes:**
- Invalid data format
- System issue
- Permission issue

**Solutions:**
1. Verify data format is correct (email, phone, date)
2. Refresh the page
3. Check if you have permission to edit
4. Contact IT support if issue persists

---

## Waitlist Issues

### Issue: Waitlist not working

**Symptoms:**
- Cannot add client to waitlist
- Waitlist not updating

**Possible Causes:**
- System issue
- Client already on waitlist
- No rooms available

**Solutions:**
1. Verify rooms are actually full
2. Check if client is already on waitlist
3. Refresh the page
4. Contact IT support if issue persists

---

### Issue: Assignment not confirmed

**Symptoms:**
- Client assigned but confirmation not processed
- Assignment expired

**Possible Causes:**
- 15-minute confirmation window passed
- System issue
- SMS not received

**Solutions:**
1. Check if 15 minutes have passed
2. Re-assign to next client on waitlist
3. Verify SMS notifications are configured
4. Contact IT support if issue persists

---

### Issue: SMS notifications not sending

**Symptoms:**
- Clients not receiving waitlist notifications
- No SMS sent

**Possible Causes:**
- Twilio not configured
- Invalid phone number
- Twilio service issue

**Solutions:**
1. Verify Twilio is configured in system
2. Check client phone number format
3. Check Twilio service status
4. Contact IT support if issue persists

---

## Performance Issues

### Issue: System slow overall

**Symptoms:**
- All pages load slowly
- Actions take long to complete

**Possible Causes:**
- High server load
- Database issue
- Network issue

**Solutions:**
1. Check your internet connection
2. Try during off-peak hours
3. Close other applications
4. Contact IT support if issue persists

---

### Issue: Specific page slow

**Symptoms:**
- One page loads slowly, others are fine
- Reports take long to generate

**Possible Causes:**
- Large data set
- Complex query
- Database issue

**Solutions:**
1. Reduce date range for reports
2. Use filters to narrow results
3. Refresh the page
4. Contact IT support if issue persists

---

### Issue: Browser freezing

**Symptoms:**
- Browser becomes unresponsive
- Page stops loading

**Possible Causes:**
- Browser memory issue
- Too many tabs open
- Browser extension conflict

**Solutions:**
1. Close other browser tabs
2. Restart browser
3. Disable browser extensions
4. Try a different browser
5. Contact IT support if issue persists

---

## System Status Checks

### Check Internet Connection

1. Try loading other websites (e.g., google.com)
2. Check if other devices on the same network work
3. Restart your router if needed
4. Contact your internet service provider if issue persists

### Check Browser Compatibility

Spa-Flow supports the following browsers:
- Chrome (latest version)
- Firefox (latest version)
- Safari (latest version)
- Edge (latest version)

If using an older browser, update to the latest version.

### Check Server Status

1. Try accessing the health check endpoint: `/healthz/live`
2. If health check fails, the server may be down
3. Contact IT support immediately

### Check Square Terminal Status

1. Verify Square terminal is powered on
2. Check terminal network connection
3. Test Square terminal with a small transaction
4. Contact Square support if terminal issue

### Check Twilio Status

1. Verify Twilio account is active
2. Check Twilio service status page
3. Test SMS with a known working number
4. Contact Twilio support if issue

---

## Escalation Procedures

### When to Contact Manager

Contact your manager for:
- Account lockout issues
- Permission problems
- Pricing discrepancies
- Client disputes
- Resource status corrections

### When to Contact IT Support

Contact IT support for:
- System not loading
- Persistent errors
- Payment terminal issues
- SMS notification failures
- Performance issues
- Security concerns

### When to Contact Emergency Support

Contact emergency support for:
- Complete system outage
- Data loss concerns
- Security breaches
- Critical failures affecting operations

### Information to Provide When Escalating

When reporting an issue, include:
1. What you were trying to do
2. What happened (error messages, symptoms)
3. When it happened (timestamp)
4. What you've already tried to fix it
5. Screenshots if applicable
6. Browser and version
7. Whether other users have the same issue

---

## Prevention Tips

### Daily Best Practices

- Refresh pages periodically to ensure current data
- Log out at the end of your shift
- Release resources promptly when clients finish
- Verify client information before saving
- Check waitlist regularly

### Weekly Best Practices

- Review audit logs for unusual activity
- Check for system updates
- Verify Square terminal is working
- Test SMS notifications
- Review pricing and discounts

### Monthly Best Practices

- Review all client data for accuracy
- Check resource status for discrepancies
- Verify all transactions are recorded
- Review reports for anomalies
- Update documentation if processes change

---

**End of Troubleshooting Guide**
