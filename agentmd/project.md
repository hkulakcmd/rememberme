# Project Specification

Project Name:
RememberMe

Mission:
RememberMe helps users remember important birthdays of family members, friends and loved ones.

The application should be simple, modern, fast and easy to use.

--------------------------------------------------
MAIN FEATURES
--------------------------------------------------

1. User Authentication

Users must be able to create an account and log in.

Authentication methods:

- Email and Password
- Google Login
- Facebook Login

Future:
- Instagram integration if supported and approved by Meta APIs

Requirements:

- JWT Authentication
- Secure password storage
- Password reset
- Session management

--------------------------------------------------
2. Birthday Management
--------------------------------------------------

Users can store birthdays of relatives and friends.

For each person save:

- First Name
- Last Name
- Birthday Date
- Relationship (optional)
- Notes (optional)

Users can:

- Add birthday
- Edit birthday
- Delete birthday
- View birthday list
- Search birthdays

The birthday creation process should require the minimum number of clicks possible.

Primary user flow:

+ Add Birthday
→ Enter Name
→ Select Date
→ Save

--------------------------------------------------
3. Dashboard
--------------------------------------------------

The dashboard should display:

- Next upcoming birthdays
- Today's birthdays
- Upcoming birthdays within 30 days
- Total saved birthdays

The interface should present the most important information immediately after login.

--------------------------------------------------
4. Notifications
--------------------------------------------------

Users should receive reminders before birthdays.

Notification methods:

- Browser Push Notifications
- Mobile Push Notifications (PWA)

Not Supported:

- SMS
- Phone Calls

Users can configure:

- 1 day before
- 3 days before
- 7 days before
- Same day

Notifications should work even when the user is not actively browsing the application, where supported by the device and browser.

--------------------------------------------------
5. User Profile
--------------------------------------------------

Users can:

- Edit account settings
- Manage notification preferences
- Manage authentication methods

--------------------------------------------------
TECHNICAL REQUIREMENTS
--------------------------------------------------

Root directory of website: ~/Documents/rme/website

Frontend:

- Next.js
- JavaScript
- Responsive Design
- Mobile First

Backend:

- Python
- Django
- Django REST Framework

Database:

- PostgreSQL

Authentication:

- JWT
- OAuth Social Login

Hosting:

- OVHcloud

Version Control:

- GitHub

--------------------------------------------------
DESIGN REQUIREMENTS
--------------------------------------------------

Style:

- Modern
- Minimalistic
- Professional
- Clean

Design Principles:

- Easy to understand
- Few clicks required
- High readability
- Consistent colors
- Accessible interface

The application must feel simple and polished.

Avoid:

- Cluttered layouts
- Complex navigation
- Unnecessary features

--------------------------------------------------
SECURITY REQUIREMENTS
--------------------------------------------------

- Secure password hashing
- JWT expiration handling
- CSRF protection where applicable
- Input validation
- Rate limiting
- Environment variables for secrets
- No sensitive data stored in source code

--------------------------------------------------
SCALABILITY REQUIREMENTS
--------------------------------------------------

The system should support:

- Thousands of users
- Future mobile application
- Additional notification channels
- Additional social login providers

--------------------------------------------------
SUCCESS CRITERIA
--------------------------------------------------

A user can:

1. Create an account
2. Log in with Google or Facebook
3. Add birthdays quickly
4. Receive push notifications
5. View upcoming birthdays on the dashboard
6. Use the application comfortably on desktop and mobile devices
