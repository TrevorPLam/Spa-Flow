# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: tests\e2e\auth.spec.ts >> Account Lockout >> should allow manager to unlock locked account
- Location: tests\e2e\auth.spec.ts:274:3

# Error details

```
Error: expect(received).toContain(expected) // indexOf

Expected substring: "locked"
Received string:    "Invalid email or password"
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
  188 |     }
  189 | 
  190 |     // Attempt login with correct credentials during lockout should fail
  191 |     await page.goto(`${BASE_URL}/login`);
  192 |     await loginPage.login(LOCKOUT_TEST_USER.email, LOCKOUT_TEST_USER.password);
  193 |     
  194 |     const errorMessage = await loginPage.getErrorMessage();
  195 |     expect(errorMessage).toContain('locked');
  196 |     await expect(page).toHaveURL(`${BASE_URL}/login`);
  197 |   });
  198 | 
  199 |   test('should remain locked during lockout period', async ({ page }) => {
  200 |     const loginPage = new LoginPage(page);
  201 | 
  202 |     // Trigger lockout
  203 |     for (let i = 0; i < LOCKOUT_THRESHOLD; i++) {
  204 |       await page.goto(`${BASE_URL}/login`);
  205 |       await loginPage.login(LOCKOUT_TEST_USER.email, 'wrongpassword');
  206 |     }
  207 | 
  208 |     // Wait a short time (less than lockout duration)
  209 |     await page.waitForTimeout(2000);
  210 | 
  211 |     // Should still be locked
  212 |     await page.goto(`${BASE_URL}/login`);
  213 |     await loginPage.login(LOCKOUT_TEST_USER.email, LOCKOUT_TEST_USER.password);
  214 |     
  215 |     const errorMessage = await loginPage.getErrorMessage();
  216 |     expect(errorMessage).toContain('locked');
  217 |     await expect(page).toHaveURL(`${BASE_URL}/login`);
  218 |   });
  219 | 
  220 |   test('should allow login after lockout expires', async ({ page, request }) => {
  221 |     const loginPage = new LoginPage(page);
  222 | 
  223 |     // Trigger lockout
  224 |     for (let i = 0; i < LOCKOUT_THRESHOLD; i++) {
  225 |       await page.goto(`${BASE_URL}/login`);
  226 |       await loginPage.login(LOCKOUT_TEST_USER.email, 'wrongpassword');
  227 |     }
  228 | 
  229 |     // Manually expire the lockout by updating the database
  230 |     // This is a test-only operation to avoid waiting 15 minutes
  231 |     try {
  232 |       const loginResponse = await request.post('http://localhost:5000/auth/login', {
  233 |         data: {
  234 |           email: 'admin@spaflow.com',
  235 |           password: 'SpaFlow2024!'
  236 |         }
  237 |       });
  238 |       
  239 |       if (loginResponse.ok()) {
  240 |         const cookies = loginResponse.headers['set-cookie'];
  241 |         // Get user ID first
  242 |         const usersResponse = await request.get('http://localhost:5000/users', {
  243 |           headers: {
  244 |             'Cookie': cookies
  245 |           }
  246 |         });
  247 |         
  248 |         if (usersResponse.ok()) {
  249 |           const users = await usersResponse.json();
  250 |           const testUser = users.find((u: any) => u.email === LOCKOUT_TEST_USER.email);
  251 |           
  252 |           if (testUser) {
  253 |             // Reset lockout via database (simulating time passing)
  254 |             await request.post(`http://localhost:5000/users/${testUser.id}/unlock`, {
  255 |               headers: {
  256 |                 'Cookie': cookies
  257 |               }
  258 |             });
  259 |           }
  260 |         }
  261 |       }
  262 |     } catch (e) {
  263 |       console.log('Manual unlock warning:', e);
  264 |     }
  265 | 
  266 |     // Should now be able to login
  267 |     await page.goto(`${BASE_URL}/login`);
  268 |     await loginPage.login(LOCKOUT_TEST_USER.email, LOCKOUT_TEST_USER.password);
  269 |     await loginPage.waitForLoginSuccess();
  270 | 
  271 |     await expect(page).toHaveURL(`${BASE_URL}/dashboard`);
  272 |   });
  273 | 
  274 |   test('should allow manager to unlock locked account', async ({ page, request }) => {
  275 |     const loginPage = new LoginPage(page);
  276 | 
  277 |     // Trigger lockout
  278 |     for (let i = 0; i < LOCKOUT_THRESHOLD; i++) {
  279 |       await page.goto(`${BASE_URL}/login`);
  280 |       await loginPage.login(LOCKOUT_TEST_USER.email, 'wrongpassword');
  281 |     }
  282 | 
  283 |     // Verify account is locked
  284 |     await page.goto(`${BASE_URL}/login`);
  285 |     await loginPage.login(LOCKOUT_TEST_USER.email, LOCKOUT_TEST_USER.password);
  286 |     
  287 |     let errorMessage = await loginPage.getErrorMessage();
> 288 |     expect(errorMessage).toContain('locked');
      |                          ^ Error: expect(received).toContain(expected) // indexOf
  289 | 
  290 |     // Login as manager and unlock the account
  291 |     const managerLoginResponse = await request.post('http://localhost:5000/auth/login', {
  292 |       data: {
  293 |         email: 'admin@spaflow.com',
  294 |         password: 'SpaFlow2024!'
  295 |       }
  296 |     });
  297 |     
  298 |     expect(managerLoginResponse.ok()).toBeTruthy();
  299 |     
  300 |     const managerCookies = managerLoginResponse.headers['set-cookie'];
  301 |     
  302 |     // Get user ID
  303 |     const usersResponse = await request.get('http://localhost:5000/users', {
  304 |       headers: {
  305 |         'Cookie': managerCookies
  306 |       }
  307 |     });
  308 |     
  309 |     expect(usersResponse.ok()).toBeTruthy();
  310 |     const users = await usersResponse.json();
  311 |     const testUser = users.find((u: any) => u.email === LOCKOUT_TEST_USER.email);
  312 |     expect(testUser).toBeDefined();
  313 |     
  314 |     // Unlock the account
  315 |     const unlockResponse = await request.post(`http://localhost:5000/users/${testUser.id}/unlock`, {
  316 |       headers: {
  317 |         'Cookie': managerCookies
  318 |       }
  319 |     });
  320 |     
  321 |     expect(unlockResponse.ok()).toBeTruthy();
  322 |     const unlockData = await unlockResponse.json();
  323 |     expect(unlockData.success).toBe(true);
  324 | 
  325 |     // Now the locked user should be able to login
  326 |     await page.goto(`${BASE_URL}/login`);
  327 |     await loginPage.login(LOCKOUT_TEST_USER.email, LOCKOUT_TEST_USER.password);
  328 |     await loginPage.waitForLoginSuccess();
  329 | 
  330 |     await expect(page).toHaveURL(`${BASE_URL}/dashboard`);
  331 |   });
  332 | });
  333 | 
```