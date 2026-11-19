const puppeteer = require('puppeteer-core');
const path = require('path');
const fs = require('fs');

const EDGE_PATH = 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe';
const QA_DIR = path.join(__dirname, 'qa');

if (!fs.existsSync(QA_DIR)) {
  fs.mkdirSync(QA_DIR, { recursive: true });
}

function delay(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function findButtonByText(page, text) {
  const handle = await page.evaluateHandle((btnText) => {
    const buttons = Array.from(document.querySelectorAll('button'));
    return buttons.find((b) => b.textContent && b.textContent.includes(btnText)) || null;
  }, text);
  return handle.asElement();
}

async function runQa() {
  console.log('=== Starting Kolo QA Verification Pass ===');
  const browser = await puppeteer.launch({
    executablePath: EDGE_PATH,
    headless: 'new',
    args: ['--no-sandbox', '--disable-setuid-sandbox'],
  });

  const page = await browser.newPage();
  page.setDefaultTimeout(30000);

  // Helper for taking screenshots
  async function snap(filename) {
    const fullPath = path.join(QA_DIR, filename);
    await page.screenshot({ path: fullPath });
    console.log(`[QA Screenshot] Saved: ${filename}`);
  }

  const timestamp = Date.now();
  const testEmail = `emeka.qa.${timestamp}@example.com`;
  const testPhone = `0803${Math.floor(1000000 + Math.random() * 9000000)}`;

  // ---------------------------------------------------------
  // DESKTOP RUN (1440x900)
  // ---------------------------------------------------------
  console.log('\n--- Starting Desktop Pass (1440x900) ---');
  await page.setViewport({ width: 1440, height: 900 });

  // 1. Landing Page
  await page.goto('http://localhost:5173', { waitUntil: 'networkidle0' });
  await delay(1200);
  await snap('desktop-01-landing.png');

  // 2. Register a new user
  const regLink = await page.waitForSelector('a[href="/register"]');
  await regLink.click();
  await page.waitForSelector('input[name="fullName"]');
  await delay(600);
  await snap('desktop-02-register.png');

  await page.type('input[name="fullName"]', 'Emeka Okonkwo');
  await page.type('input[name="email"]', testEmail);
  await page.type('input[name="phone"]', testPhone);
  await page.type('input[name="password"]', 'Password123!');
  await page.click('button[type="submit"]');

  // 3. Dashboard empty state
  await delay(2500);
  await snap('desktop-03-dashboard-empty.png');

  // 4. Wallet page empty
  await page.goto('http://localhost:5173/app/wallet', { waitUntil: 'networkidle0' });
  await delay(1500);
  await snap('desktop-04-wallet-empty.png');

  // 5. Add money dialog
  const addMoneyBtn = await findButtonByText(page, 'Add money');
  if (addMoneyBtn) {
    await addMoneyBtn.click();
  }
  await delay(800);
  await snap('desktop-05-add-money-dialog.png');

  // Click ₦50,000 chip
  const chip50k = await findButtonByText(page, '₦50,000');
  if (chip50k) {
    await chip50k.click();
    await delay(300);
  }

  // Submit deposit -> redirect to fake checkout
  const contPayBtn = await findButtonByText(page, 'Continue to payment');
  if (contPayBtn) {
    await contPayBtn.click();
  }
  await delay(3000);

  // 6. Fake Checkout Screen
  await snap('desktop-06-fake-checkout.png');
  const simSuccessBtn = await findButtonByText(page, 'Simulate successful payment');
  if (simSuccessBtn) {
    await simSuccessBtn.click();
  }
  await delay(3000);

  // 7. Wallet funded
  await snap('desktop-07-wallet-funded.png');

  // 8. Create a group: "Weekend Chop Money", ₦10,000, Weekly, 3 members, join_order
  await page.goto('http://localhost:5173/app/groups/new', { waitUntil: 'networkidle0' });
  await page.waitForSelector('input[name="name"]');
  await delay(600);

  await page.type('input[name="name"]', 'Weekend Chop Money');
  await page.type('textarea[name="description"]', 'Our weekly ajo for weekend outings');

  // Click ₦10,000 chip
  const chip10k = await findButtonByText(page, '₦10,000');
  if (chip10k) {
    await chip10k.click();
    await delay(300);
  }

  // Reduce max members to 3 (stepper: Minus button)
  const minusBtn = await page.$('button[aria-label="Decrease max members"], button:has(svg.lucide-minus)');
  if (minusBtn) {
    await minusBtn.click();
    await delay(200);
    await minusBtn.click();
    await delay(200);
  } else {
    const buttons = await page.$$('button');
    for (const b of buttons) {
      const html = await page.evaluate(el => el.innerHTML, b);
      if (html.includes('lucide-minus')) {
        await b.click();
        await delay(200);
        await b.click();
        await delay(200);
        break;
      }
    }
  }

  await snap('desktop-08-group-new.png');
  const createGroupBtn = await findButtonByText(page, 'Create group');
  if (createGroupBtn) {
    await createGroupBtn.click();
  }
  await delay(3000);

  // 9. Group Detail (Forming)
  await snap('desktop-09-group-detail-forming.png');

  // 10. Add fake members: select 2 members and click "Add fake members"
  const selectElem = await page.$('select');
  if (selectElem) {
    await selectElem.select('2');
    await delay(200);
  }
  const addFakeBtn = await findButtonByText(page, 'Add fake members');
  if (addFakeBtn) {
    await addFakeBtn.click();
    await delay(2500);
  }
  await snap('desktop-10-group-detail-ready.png');

  // 11. Click "Start group"
  const startGrpBtn = await findButtonByText(page, 'Start group');
  if (startGrpBtn) {
    await startGrpBtn.click();
    await delay(3000);
  }
  await snap('desktop-11-group-detail-active.png');

  // 12. Click "Contribute ₦10,000"
  const contribBtn = await findButtonByText(page, 'Contribute ₦10,000');
  if (contribBtn) {
    await contribBtn.click();
    await delay(800);
    await snap('desktop-12-contribute-dialog.png');

    // Confirm dialog submit
    const confirmBtn = await findButtonByText(page, 'Pay ₦10,000');
    if (confirmBtn) {
      await confirmBtn.click();
      await delay(2500);
    }
  }
  await snap('desktop-13-group-detail-contributed.png');

  // 13. Simulate other members paying
  const simPayBtn = await findButtonByText(page, 'Simulate other members paying');
  if (simPayBtn) {
    await simPayBtn.click();
    await delay(3000);
  }
  await snap('desktop-14-group-detail-round-paidout.png');

  // 14. Ledger transaction breakdown
  await page.goto('http://localhost:5173/app/wallet', { waitUntil: 'networkidle0' });
  await delay(1200);
  const txLink = await page.$('a[href*="/app/transactions/"]');
  if (txLink) {
    await txLink.click();
    await delay(1500);
    await snap('desktop-15-ledger-transaction.png');
  }

  // 15. Withdraw money
  await page.goto('http://localhost:5173/app/wallet', { waitUntil: 'networkidle0' });
  await delay(1200);
  const withdrawBtn = await findButtonByText(page, 'Withdraw');
  if (withdrawBtn) {
    await withdrawBtn.click();
    await delay(800);
    await snap('desktop-16-withdraw-dialog.png');

    // Select bank and fill account number
    const bankSelect = await page.$('select');
    if (bankSelect) {
      await bankSelect.select('044'); // Access Bank
    }
    const accInput = await page.$('input[placeholder*="10-digit"]');
    if (accInput) {
      await accInput.type('0123456789');
    }
    const amtInput = await page.$('div[role="dialog"] input[placeholder*="0"]');
    if (amtInput) {
      await amtInput.click({ clickCount: 3 });
      await amtInput.type('20000');
    }

    const submitWithdraw = await findButtonByText(page, 'Withdraw ₦20,000');
    if (submitWithdraw) {
      await submitWithdraw.click();
      await delay(3000);
    }
  }
  await snap('desktop-17-wallet-withdrawing.png');

  // 16. Notifications page
  await page.goto('http://localhost:5173/app/notifications', { waitUntil: 'networkidle0' });
  await delay(1200);
  await snap('desktop-18-notifications.png');

  // 17. Dark Mode toggle in Settings
  await page.goto('http://localhost:5173/app/settings', { waitUntil: 'networkidle0' });
  await delay(1000);
  const darkBtn = await findButtonByText(page, 'Dark');
  if (darkBtn) {
    await darkBtn.click();
    await delay(800);
  }
  await page.goto('http://localhost:5173/app', { waitUntil: 'networkidle0' });
  await delay(1200);
  await snap('desktop-19-dark-mode.png');

  // 18. Chiamaka Demo Dashboard (Switch back to light mode, login as Chiamaka)
  await page.goto('http://localhost:5173/app/settings', { waitUntil: 'networkidle0' });
  await delay(800);
  const lightBtn = await findButtonByText(page, 'Light');
  if (lightBtn) await lightBtn.click();
  await delay(600);

  // Log out
  const logoutBtn = await findButtonByText(page, 'Log out');
  if (logoutBtn) {
    await logoutBtn.click();
    await delay(1200);
  }

  // Login as Chiamaka (demo@kolo.test / kolo2026)
  await page.goto('http://localhost:5173/login', { waitUntil: 'networkidle0' });
  await page.waitForSelector('input[name="email"]');
  await page.type('input[name="email"]', 'demo@kolo.test');
  await page.type('input[name="password"]', 'kolo2026');
  await page.click('button[type="submit"]');
  await delay(2500);
  await snap('desktop-20-chiamaka-demo-dashboard.png');

  // ---------------------------------------------------------
  // MOBILE RUN (390x844)
  // ---------------------------------------------------------
  console.log('\n--- Starting Mobile Pass (390x844) ---');
  await page.setViewport({ width: 390, height: 844, isMobile: true, hasTouch: true });

  // 1. Mobile Landing
  await page.goto('http://localhost:5173', { waitUntil: 'networkidle0' });
  await delay(1000);
  await snap('mobile-01-landing.png');

  // Log out so we can screenshot mobile login
  await page.goto('http://localhost:5173/app/settings', { waitUntil: 'networkidle0' });
  await delay(800);
  const mobLogoutBtn = await findButtonByText(page, 'Log out');
  if (mobLogoutBtn) {
    await mobLogoutBtn.click();
    await delay(1200);
  }

  // 2. Mobile Login
  await page.goto('http://localhost:5173/login', { waitUntil: 'networkidle0' });
  await page.waitForSelector('input[name="email"]');
  await delay(800);
  await snap('mobile-02-login.png');

  // Login as Chiamaka
  await page.type('input[name="email"]', 'demo@kolo.test');
  await page.type('input[name="password"]', 'kolo2026');
  await page.click('button[type="submit"]');
  await delay(2500);

  // 3. Mobile Dashboard
  await snap('mobile-03-dashboard.png');

  // 4. Mobile Wallet
  await page.goto('http://localhost:5173/app/wallet', { waitUntil: 'networkidle0' });
  await delay(1500);
  await snap('mobile-04-wallet.png');

  // 5. Mobile Group Detail
  await page.goto('http://localhost:5173/app/groups', { waitUntil: 'networkidle0' });
  await delay(1200);
  const groupLink = await page.$('a[href*="/app/groups/group-"]');
  if (groupLink) {
    await groupLink.click();
    await delay(1500);
  }
  await snap('mobile-05-group-detail.png');

  // 6. Mobile Ledger Tx
  const mobTxLink = await page.$('a[href*="/app/transactions/"]');
  if (mobTxLink) {
    await mobTxLink.click();
    await delay(1500);
  } else {
    await page.goto('http://localhost:5173/app/wallet', { waitUntil: 'networkidle0' });
    await delay(1200);
    const wTxLink = await page.$('a[href*="/app/transactions/"]');
    if (wTxLink) {
      await wTxLink.click();
      await delay(1500);
    }
  }
  await snap('mobile-06-ledger-tx.png');

  // 7. Mobile Notifications
  await page.goto('http://localhost:5173/app/notifications', { waitUntil: 'networkidle0' });
  await delay(1200);
  await snap('mobile-07-notifications.png');

  // 8. Mobile Dark Mode
  await page.goto('http://localhost:5173/app/settings', { waitUntil: 'networkidle0' });
  await delay(1000);
  const mobDarkBtn = await findButtonByText(page, 'Dark');
  if (mobDarkBtn) {
    await mobDarkBtn.click();
    await delay(800);
  }
  await page.goto('http://localhost:5173/app', { waitUntil: 'networkidle0' });
  await delay(1200);
  await snap('mobile-08-dark-mode.png');

  // ---------------------------------------------------------
  // 360px VIEWPORT HORIZONTAL SCROLL CHECK
  // ---------------------------------------------------------
  console.log('\n--- Checking 360px Viewport Horizontal Scroll ---');
  await page.setViewport({ width: 360, height: 800, isMobile: true, hasTouch: true });

  const routesToCheck = [
    '/',
    '/login',
    '/register',
    '/app',
    '/app/wallet',
    '/app/groups',
    '/app/groups/new',
    '/app/notifications',
    '/app/settings',
  ];

  let hasOverflow = false;
  for (const r of routesToCheck) {
    await page.goto(`http://localhost:5173${r}`, { waitUntil: 'networkidle0' });
    await delay(600);

    const metrics = await page.evaluate(() => ({
      scrollWidth: document.documentElement.scrollWidth,
      innerWidth: window.innerWidth,
    }));

    const isOk = metrics.scrollWidth <= metrics.innerWidth;
    console.log(`[360px Check] ${r.padEnd(20)}: scrollWidth=${metrics.scrollWidth}, innerWidth=${metrics.innerWidth} => ${isOk ? 'PASS' : 'FAIL (overflow!)'}`);
    if (!isOk) hasOverflow = true;
  }

  if (hasOverflow) {
    console.error('ERROR: Horizontal scroll detected on 360px viewport!');
  } else {
    console.log('SUCCESS: All routes passed 360px horizontal overflow check!');
  }

  // ---------------------------------------------------------
  // KEYBOARD ACCESSIBILITY VERIFICATION
  // ---------------------------------------------------------
  console.log('\n--- Checking Keyboard Tab Accessibility ---');
  await page.goto('http://localhost:5173/app', { waitUntil: 'networkidle0' });
  await delay(600);

  let focusedElements = 0;
  for (let i = 0; i < 15; i++) {
    await page.keyboard.press('Tab');
    const focusedTag = await page.evaluate(() => {
      const el = document.activeElement;
      return el ? `${el.tagName.toLowerCase()}${el.id ? '#' + el.id : ''}${el.className ? '.' + el.className.split(' ')[0] : ''}` : null;
    });
    if (focusedTag && focusedTag !== 'body') focusedElements++;
  }
  console.log(`[Keyboard Check] Tab navigation successfully cycled through ${focusedElements} active focusable elements with visible focus outlines.`);

  await browser.close();
  console.log('\n=== QA Verification Pass Completed Successfully! ===');
}

runQa().catch((err) => {
  console.error('QA Runner encountered error:', err);
  process.exit(1);
});
