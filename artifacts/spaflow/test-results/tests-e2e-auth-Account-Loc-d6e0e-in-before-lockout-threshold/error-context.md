# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: tests\e2e\auth.spec.ts >> Account Lockout >> should allow login before lockout threshold
- Location: tests\e2e\auth.spec.ts:152:3

# Error details

```
Test timeout of 30000ms exceeded.
```

```
Error: page.waitForURL: Test timeout of 30000ms exceeded.
=========================== logs ===========================
waiting for navigation to "/dashboard" until "load"
============================================================
```

# Page snapshot

```yaml
- generic [ref=e2]:
  - generic [ref=e3]:
    - generic [ref=e5]:
      - img [ref=e7]
      - heading "SpaFlow" [level=1] [ref=e11]
      - paragraph [ref=e12]: The spa management system that keeps your front desk calm and in control — even on the busiest days.
    - generic [ref=e14]:
      - heading "Sign in" [level=2] [ref=e15]
      - paragraph [ref=e16]: Enter your staff credentials to continue
      - generic [ref=e17]:
        - generic [ref=e18]:
          - text: Email
          - textbox "Email" [ref=e19]:
            - /placeholder: you@spaflow.com
            - text: lockout-test@spaflow.com
        - generic [ref=e20]:
          - text: Password
          - textbox "Password" [ref=e21]:
            - /placeholder: ••••••••
            - text: LockoutTest123!
        - paragraph [ref=e22]: Invalid email or password
        - button "Sign in" [ref=e23]
  - region "Notifications (F8)":
    - list
```

# Test source

```ts
  1  | import { Page, Locator } from '@playwright/test';
  2  | import { BasePage } from './BasePage';
  3  | 
  4  | export class LoginPage extends BasePage {
  5  |   readonly emailInput: Locator;
  6  |   readonly passwordInput: Locator;
  7  |   readonly submitButton: Locator;
  8  |   readonly errorMessage: Locator;
  9  | 
  10 |   constructor(page: Page) {
  11 |     super(page);
  12 |     this.emailInput = page.getByTestId('input-email');
  13 |     this.passwordInput = page.getByTestId('input-password');
  14 |     this.submitButton = page.getByTestId('button-submit');
  15 |     this.errorMessage = page.getByTestId('text-login-error');
  16 |   }
  17 | 
  18 |   async goto() {
  19 |     await this.navigate('/login');
  20 |   }
  21 | 
  22 |   async login(email: string, password: string) {
  23 |     await this.fillInput(this.emailInput, email);
  24 |     await this.fillInput(this.passwordInput, password);
  25 |     await this.clickElement(this.submitButton);
  26 |   }
  27 | 
  28 |   async getErrorMessage(): Promise<string> {
  29 |     return await this.getText(this.errorMessage);
  30 |   }
  31 | 
  32 |   async waitForLoginSuccess() {
> 33 |     await this.page.waitForURL('/dashboard');
     |                     ^ Error: page.waitForURL: Test timeout of 30000ms exceeded.
  34 |   }
  35 | }
  36 | 
```