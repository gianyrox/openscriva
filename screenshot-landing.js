const { chromium } = require('playwright');
const path = require('path');

async function takeScreenshots() {
  console.log('Launching browser...');
  const browser = await chromium.launch({
    headless: true,
  });
  
  const context = await browser.newContext({
    viewport: { width: 1440, height: 900 },
    deviceScaleFactor: 1,
  });
  
  const page = await context.newPage();
  
  try {
    console.log('Navigating to http://localhost:3001/landing...');
    await page.goto('http://localhost:3001/landing', {
      waitUntil: 'networkidle',
      timeout: 30000,
    });
    
    console.log('Page loaded successfully!');
    
    // Create screenshots directory
    const screenshotsDir = path.join(__dirname, 'screenshots');
    
    // 1. Hero section (top of page)
    console.log('Taking screenshot 1: Hero section');
    await page.evaluate(() => window.scrollTo(0, 0));
    await page.waitForTimeout(500);
    await page.screenshot({
      path: path.join(screenshotsDir, '01-hero-section.png'),
      fullPage: false,
    });
    
    // 2. Problem/Solution section
    console.log('Taking screenshot 2: Problem/Solution section');
    const problemSection = await page.locator('text=Your manuscript deserves better than this.').first();
    if (await problemSection.count() > 0) {
      await problemSection.scrollIntoViewIfNeeded();
      await page.waitForTimeout(500);
      await page.screenshot({
        path: path.join(screenshotsDir, '02-problem-solution.png'),
        fullPage: false,
      });
    }
    
    // 3. Feature cards
    console.log('Taking screenshot 3: Feature cards');
    const featuresSection = await page.locator('#features').first();
    if (await featuresSection.count() > 0) {
      await featuresSection.scrollIntoViewIfNeeded();
      await page.waitForTimeout(500);
      await page.screenshot({
        path: path.join(screenshotsDir, '03-feature-cards.png'),
        fullPage: false,
      });
    }
    
    // 4. How it works section
    console.log('Taking screenshot 4: How it works section');
    const howItWorksSection = await page.locator('#how-it-works').first();
    if (await howItWorksSection.count() > 0) {
      await howItWorksSection.scrollIntoViewIfNeeded();
      await page.waitForTimeout(500);
      await page.screenshot({
        path: path.join(screenshotsDir, '04-how-it-works.png'),
        fullPage: false,
      });
    }
    
    // 5. Open source section
    console.log('Taking screenshot 5: Open source section');
    const openSourceSection = await page.locator('#open-source').first();
    if (await openSourceSection.count() > 0) {
      await openSourceSection.scrollIntoViewIfNeeded();
      await page.waitForTimeout(500);
      await page.screenshot({
        path: path.join(screenshotsDir, '05-open-source.png'),
        fullPage: false,
      });
    }
    
    // 6. Email capture section
    console.log('Taking screenshot 6: Email capture section');
    const waitlistSection = await page.locator('#waitlist').first();
    if (await waitlistSection.count() > 0) {
      await waitlistSection.scrollIntoViewIfNeeded();
      await page.waitForTimeout(500);
      await page.screenshot({
        path: path.join(screenshotsDir, '06-email-capture.png'),
        fullPage: false,
      });
    }
    
    // 7. FAQ section
    console.log('Taking screenshot 7: FAQ section');
    const faqSection = await page.locator('text=Questions').first();
    if (await faqSection.count() > 0) {
      await faqSection.scrollIntoViewIfNeeded();
      await page.waitForTimeout(500);
      await page.screenshot({
        path: path.join(screenshotsDir, '07-faq-section.png'),
        fullPage: false,
      });
    }
    
    // 8. Footer
    console.log('Taking screenshot 8: Footer');
    await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
    await page.waitForTimeout(500);
    await page.screenshot({
      path: path.join(screenshotsDir, '08-footer.png'),
      fullPage: false,
    });
    
    // Full page screenshot
    console.log('Taking full page screenshot...');
    await page.evaluate(() => window.scrollTo(0, 0));
    await page.waitForTimeout(500);
    await page.screenshot({
      path: path.join(screenshotsDir, '00-full-page.png'),
      fullPage: true,
    });
    
    console.log('\n✅ All screenshots saved to ./screenshots/');
    
    // Check for console errors
    page.on('console', msg => {
      if (msg.type() === 'error') {
        console.error('Browser console error:', msg.text());
      }
    });
    
    page.on('pageerror', error => {
      console.error('Page error:', error.message);
    });
    
  } catch (error) {
    console.error('Error taking screenshots:', error);
    throw error;
  } finally {
    await browser.close();
  }
}

takeScreenshots().catch(console.error);
