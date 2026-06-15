const { chromium } = require('playwright');

(async () => {
    const browser = await chromium.launch();
    const base = 'http://localhost:8090/development/Faith-Fast/';
    const outDir = 'C:/Users/khaya/AppData/Local/Temp/pw-faithfast2/';

    async function login(page) {
        await page.goto(base + 'index.html');
        await page.waitForLoadState('networkidle');
        await page.fill('#loginEmail', 'mkhayguze@gmail.com').catch(() => {});
        await page.fill('#loginPassword', '123').catch(() => {});
        const loginBtn = await page.$('button[type="submit"]');
        if (loginBtn) await loginBtn.click();
        else await page.keyboard.press('Enter');
        await page.waitForLoadState('networkidle');
        await page.waitForTimeout(1000);
    }

    const context = await browser.newContext({ serviceWorkers: 'block', viewport: { width: 1440, height: 900 } });
    const page = await context.newPage();

    page.on('console', msg => { if (msg.type() === 'error') console.log('PAGE ERROR LOG:', msg.text()); });
    page.on('pageerror', err => console.log('PAGE ERROR:', err.message));
    page.on('response', async (res) => {
        if (res.url().includes('highlights.php')) {
            console.log('RESPONSE', res.request().method(), res.url(), res.status(), await res.text().catch(() => ''));
        }
    });

    await login(page);

    await page.evaluate(() => { window.location.hash = '#bible'; });
    await page.waitForTimeout(1000);

    await page.selectOption('#bookSelect', { label: 'Genesis' });
    await page.waitForTimeout(300);
    await page.selectOption('#chapterSelect', '1');
    await page.waitForTimeout(1000);

    // First clean up: remove any leftover highlights on verses 1, 2, 8
    for (const v of [1, 2, 8]) {
        const el = await page.$(`.verse-item[data-verse-number="${v}"]`);
        const cls = await el.evaluate(e => e.className);
        if (cls.includes('highlight-')) {
            await el.click();
            await page.waitForTimeout(200);
            const removeBtn = await page.$(`.highlight-menu[data-verse-number="${v}"] .highlight-swatch-remove`);
            if (removeBtn) {
                await removeBtn.click();
                await page.waitForTimeout(400);
            }
        }
    }

    // Now: highlight verse 1 yellow
    let el1 = await page.$('.verse-item[data-verse-number="1"]');
    await el1.click();
    await page.waitForTimeout(300);
    await page.click('.highlight-menu .highlight-swatch-yellow');
    await page.waitForTimeout(500);
    await page.screenshot({ path: outDir + 'bh_01_yellow.png' });
    let cls1 = await page.$eval('.verse-item[data-verse-number="1"]', el => el.className);
    console.log('After yellow:', cls1);

    // Reload chapter to confirm persistence
    await page.selectOption('#chapterSelect', '2');
    await page.waitForTimeout(800);
    await page.selectOption('#chapterSelect', '1');
    await page.waitForTimeout(800);
    cls1 = await page.$eval('.verse-item[data-verse-number="1"]', el => el.className);
    console.log('After reload:', cls1);
    await page.screenshot({ path: outDir + 'bh_02_persisted.png' });

    // Edit -> change to pink
    el1 = await page.$('.verse-item[data-verse-number="1"]');
    await el1.click();
    await page.waitForTimeout(300);
    await page.screenshot({ path: outDir + 'bh_03_edit_menu.png' });
    await page.click('.highlight-menu .highlight-swatch-pink');
    await page.waitForTimeout(500);
    cls1 = await page.$eval('.verse-item[data-verse-number="1"]', el => el.className);
    console.log('After edit to pink:', cls1);
    await page.screenshot({ path: outDir + 'bh_04_edited.png' });

    // Remove highlight
    el1 = await page.$('.verse-item[data-verse-number="1"]');
    await el1.click();
    await page.waitForTimeout(300);
    await page.click('.highlight-menu .highlight-swatch-remove');
    await page.waitForTimeout(500);
    cls1 = await page.$eval('.verse-item[data-verse-number="1"]', el => el.className);
    console.log('After remove:', cls1);
    await page.screenshot({ path: outDir + 'bh_05_removed.png' });

    // Mobile check
    await page.setViewportSize({ width: 390, height: 844 });
    await page.waitForTimeout(500);
    el1 = await page.$('.verse-item[data-verse-number="3"]');
    await el1.click();
    await page.waitForTimeout(300);
    await page.screenshot({ path: outDir + 'bh_06_mobile_menu.png' });
    await page.click('.highlight-menu .highlight-swatch-blue');
    await page.waitForTimeout(500);
    await page.screenshot({ path: outDir + 'bh_07_mobile_applied.png' });

    await context.close();
    await browser.close();
})();
