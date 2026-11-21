import assert from 'node:assert/strict';
import {mkdir} from 'node:fs/promises';
import {chromium} from 'playwright';

const browser = await chromium.launch();
try {
  await mkdir('qa-screenshots', {recursive: true});
  for (const [width, height] of [[1440,900], [1024,768], [390,844], [320,640]]) {
    const phone = width < 700;
    const page = await browser.newPage({viewport: {width,height}, hasTouch: phone, isMobile: phone});
    await page.goto('http://127.0.0.1:8842/media.html#articles');
    const deck = page.locator('#articles .article-deck');
    const active = deck.locator('.article-slide.is-active');
    const rotation = deck.locator('.rotation-toggle');
    if (phone) await rotation.tap();
    else await rotation.click();
    assert.match(await active.locator('h3').innerText(), /Gazology/);
    await page.screenshot({path: 'qa-screenshots/articles-' + width + '.png'});
    const selectors = deck.locator('.article-index button');
    for (let index = 0; index < 6; index++) {
      if (phone) await deck.locator('select').selectOption(String(index));
      else await selectors.nth(index).click();
      assert.equal(await selectors.nth(index).getAttribute('aria-pressed'), 'true');
      assert.ok(await active.locator('.article-excerpt').innerText());
      await active.locator('img').evaluateAll(images => Promise.all(images.map(image => image.decode())));
    }
    assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth));
    if (phone) {
      await deck.locator('select').selectOption('0');
      await rotation.tap();
      await active.locator('.article-excerpt').tap();
      assert.equal(await rotation.innerText(), 'Resume');
      await rotation.tap();
      await page.waitForFunction(() => document.querySelector('#articles .is-active h3').textContent.includes('Good Man'), undefined, {timeout: 9000});
    } else {
      await selectors.nth(5).press('ArrowRight');
      assert.match(await active.locator('h3').innerText(), /Gazology/);
    }
    console.log('Article controls and layout passed at ' + width + ' × ' + height);
    await page.close();
  }
} finally {
  await browser.close();
}
