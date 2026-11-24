import assert from 'node:assert/strict';
import {mkdir} from 'node:fs/promises';
import {chromium} from 'playwright';

const browser = await chromium.launch();
try {
  await mkdir('qa-screenshots', {recursive: true});
  for (const [width, height] of [[1440,900], [1024,768], [390,844], [320,640]]) {
    const phone = width < 700;
    const page = await browser.newPage({viewport: {width,height}, hasTouch: phone, isMobile: phone});
    await page.goto('http://127.0.0.1:8842/articles.html');
    const deck = page.locator('#articles .article-deck');
    const stage = deck.locator('.article-stage');
    const active = deck.locator('.article-slide.is-active');
    await stage.scrollIntoViewIfNeeded();
    assert.match(await active.locator('h3').innerText(), /Gazology/);
    assert.equal(await deck.locator('.article-slide').count(), 5);
    assert.equal(await deck.locator('.article-controls').count(), 0);
    assert.equal(await deck.getByText('I Was Wrong About Israel').count(), 0);
    await page.screenshot({path: 'qa-screenshots/articles-' + width + '.png'});

    await stage.focus();
    const titles = [/Good Man/, /consequences/, /Chomsky/, /Dylan/, /Gazology/];
    for (const title of titles) {
      await stage.press('ArrowRight');
      assert.match(await active.locator('h3').innerText(), title);
      await active.locator('img').evaluateAll(images => Promise.all(images.map(image => image.decode())));
    }
    assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth));

    if (width === 1440) {
      await page.locator('body').click({position: {x: 2, y: 2}});
      await page.mouse.move(0, 0);
      await page.waitForFunction(() => document.querySelector('#articles .is-active h3').textContent.includes('Good Man'), undefined, {timeout: 9000});
      await active.locator('.article-art').click();
      assert.match(await active.locator('h3').innerText(), /Good Man/);
      await page.waitForTimeout(5300);
      assert.match(await active.locator('h3').innerText(), /Good Man/);
      await page.mouse.move(0, 0);
      await page.waitForTimeout(5300);
      assert.match(await active.locator('h3').innerText(), /consequences/);
    }
    console.log('Article rotation and layout passed at ' + width + ' × ' + height);
    await page.close();
  }
} finally {
  await browser.close();
}
