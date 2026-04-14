const { chromium } = require('playwright');

async function inspectPage() {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    viewport: { width: 1440, height: 900 },
  });
  const page = await context.newPage();
  
  const consoleErrors = [];
  const pageErrors = [];
  const failedRequests = [];
  
  // Capture console errors
  page.on('console', msg => {
    if (msg.type() === 'error') {
      consoleErrors.push(msg.text());
    }
  });
  
  // Capture page errors
  page.on('pageerror', error => {
    pageErrors.push(error.message);
  });
  
  // Capture failed requests
  page.on('requestfailed', request => {
    failedRequests.push({
      url: request.url(),
      failure: request.failure()?.errorText || 'Unknown error'
    });
  });
  
  try {
    console.log('Loading page...');
    await page.goto('http://localhost:3001/landing', {
      waitUntil: 'networkidle',
      timeout: 30000,
    });
    
    console.log('\n=== PAGE INSPECTION REPORT ===\n');
    
    // Check for broken images
    const brokenImages = await page.evaluate(() => {
      const images = Array.from(document.querySelectorAll('img'));
      return images
        .filter(img => !img.complete || img.naturalHeight === 0)
        .map(img => img.src || img.outerHTML);
    });
    
    // Check for missing sections
    const sections = [
      { id: '#top', name: 'Hero Section' },
      { id: '#features', name: 'Features Section' },
      { id: '#how-it-works', name: 'How It Works Section' },
      { id: '#open-source', name: 'Open Source Section' },
      { id: '#waitlist', name: 'Waitlist Section' },
    ];
    
    const missingSections = [];
    for (const section of sections) {
      const element = await page.locator(section.id).count();
      if (element === 0) {
        missingSections.push(section.name);
      }
    }
    
    // Check for text overflow or layout issues
    const layoutIssues = await page.evaluate(() => {
      const issues = [];
      const elements = document.querySelectorAll('*');
      
      elements.forEach(el => {
        const rect = el.getBoundingClientRect();
        const style = window.getComputedStyle(el);
        
        // Check for horizontal overflow
        if (rect.width > window.innerWidth && style.overflow !== 'hidden') {
          issues.push({
            type: 'horizontal-overflow',
            element: el.tagName,
            width: rect.width,
            className: el.className
          });
        }
      });
      
      return issues;
    });
    
    // Check navigation
    const navLinks = await page.evaluate(() => {
      const links = Array.from(document.querySelectorAll('nav a'));
      return links.map(link => ({
        text: link.textContent?.trim(),
        href: link.getAttribute('href')
      }));
    });
    
    // Check buttons
    const buttons = await page.evaluate(() => {
      const btns = Array.from(document.querySelectorAll('button, a[href="#waitlist"]'));
      return btns.map(btn => ({
        text: btn.textContent?.trim(),
        type: btn.tagName,
        disabled: btn.disabled
      }));
    });
    
    // Print report
    console.log('📊 SECTIONS STATUS:');
    if (missingSections.length > 0) {
      console.log('  ❌ Missing sections:', missingSections.join(', '));
    } else {
      console.log('  ✅ All sections present');
    }
    
    console.log('\n🖼️  IMAGES:');
    if (brokenImages.length > 0) {
      console.log('  ❌ Broken images found:');
      brokenImages.forEach(img => console.log('    -', img));
    } else {
      console.log('  ✅ All images loaded correctly');
    }
    
    console.log('\n🔗 NAVIGATION:');
    console.log('  Links found:', navLinks.length);
    navLinks.forEach(link => {
      console.log(`    - ${link.text} → ${link.href}`);
    });
    
    console.log('\n🔘 INTERACTIVE ELEMENTS:');
    console.log('  Buttons/CTAs found:', buttons.length);
    buttons.slice(0, 5).forEach(btn => {
      console.log(`    - ${btn.type}: "${btn.text?.substring(0, 50)}${btn.text?.length > 50 ? '...' : ''}"`);
    });
    
    console.log('\n🎨 LAYOUT:');
    if (layoutIssues.length > 0) {
      console.log('  ⚠️  Potential layout issues:');
      layoutIssues.slice(0, 5).forEach(issue => {
        console.log(`    - ${issue.type}: ${issue.element} (${issue.className})`);
      });
    } else {
      console.log('  ✅ No obvious layout issues detected');
    }
    
    console.log('\n🐛 ERRORS:');
    if (consoleErrors.length > 0) {
      console.log('  ❌ Console errors:');
      consoleErrors.forEach(err => console.log('    -', err));
    } else {
      console.log('  ✅ No console errors');
    }
    
    if (pageErrors.length > 0) {
      console.log('  ❌ Page errors:');
      pageErrors.forEach(err => console.log('    -', err));
    } else {
      console.log('  ✅ No page errors');
    }
    
    if (failedRequests.length > 0) {
      console.log('  ❌ Failed requests:');
      failedRequests.forEach(req => console.log(`    - ${req.url}: ${req.failure}`));
    } else {
      console.log('  ✅ No failed requests');
    }
    
    console.log('\n=== END REPORT ===\n');
    
  } catch (error) {
    console.error('Error during inspection:', error);
  } finally {
    await browser.close();
  }
}

inspectPage().catch(console.error);
