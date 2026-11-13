// 공개 사이트 기본 동작 점검 (PC / 모바일)
// 실행: npm test   (처음 한 번: npm install && npx playwright install chromium)
const http = require("node:http");
const fs = require("node:fs");
const path = require("node:path");
const assert = require("node:assert/strict");
const { chromium } = require("playwright");

const ROOT = path.join(__dirname, "..");
const TYPES = { ".html": "text/html", ".css": "text/css", ".js": "text/javascript", ".svg": "image/svg+xml", ".png": "image/png", ".jpg": "image/jpeg" };

function serve() {
  const server = http.createServer((req, res) => {
    let file = decodeURIComponent(req.url.split("?")[0]);
    if (file.endsWith("/")) file += "index.html";
    const full = path.join(ROOT, path.normalize(file));
    if (!full.startsWith(ROOT) || !fs.existsSync(full) || fs.statSync(full).isDirectory()) {
      res.writeHead(404); return res.end();
    }
    res.writeHead(200, { "Content-Type": TYPES[path.extname(full)] || "application/octet-stream" });
    fs.createReadStream(full).pipe(res);
  });
  return new Promise((ok) => server.listen(0, "127.0.0.1", () => ok(server)));
}

const results = [];
async function check(name, fn) {
  try { await fn(); results.push(["통과", name]); }
  catch (e) { results.push(["실패", name + " - " + e.message]); }
}

(async () => {
  const server = await serve();
  const base = "http://127.0.0.1:" + server.address().port;
  const browser = await chromium.launch();
  const errors = [];

  for (const [label, viewport] of [["PC", { width: 1440, height: 900 }], ["모바일", { width: 390, height: 844 }]]) {
    const page = await browser.newPage({ viewport });
    page.on("pageerror", (e) => errors.push(label + ": " + e.message));
    await page.goto(base + "/index.html");
    await page.waitForSelector(".card");

    await check(label + " 장비 카드 표시", async () => {
      assert.ok((await page.locator(".card").count()) > 0);
    });
    await check(label + " 장비 그림 로드", async () => {
      const broken = await page.$$eval(".card-media img", (a) => a.filter((i) => !i.complete || i.naturalWidth === 0).length);
      assert.equal(broken, 0, "깨진 그림 " + broken + "개");
    });
    await check(label + " 가로 스크롤 없음", async () => {
      assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth), false);
    });

    if (label === "PC") {
      await check("카테고리 필터(발전기)", async () => {
        await page.click('.pill[data-filter="generator"]');
        assert.match(await page.textContent("#list-count"), /발전기/);
        await page.click('.pill[data-filter="all"]');
      });
      await check("검색", async () => {
        await page.fill("#search-input", "양수기");
        await page.press("#search-input", "Enter");
        assert.ok(await page.isVisible("#search-note"));
        await page.click("#search-clear");
      });
      await check("메뉴가 각각 다른 페이지로 이동", async () => {
        const pages = { "회사소개": "about.html", "견적문의": "contact.html", "공지사항": "notice.html", "오시는 길": "location.html", "임대/렌탈": "index.html" };
        for (const [text, file] of Object.entries(pages)) {
          await page.click('#nav a:text-is("' + text + '")');
          await page.waitForLoadState("load");
          assert.ok(page.url().endsWith(file), text + " → " + page.url());
          assert.equal(await page.getAttribute("#nav a.is-current", "href"), file);
          assert.equal(await page.evaluate(() => scrollY), 0, text + " 페이지가 스크롤된 채로 열림");
        }
        await page.waitForSelector(".card");
      });
      await check("견적 요청 버튼이 장비를 미리 선택", async () => {
        await page.locator(".card-cta").first().click();
        await page.waitForSelector("html[data-ready]");
        assert.notEqual(await page.inputValue("#equipment"), "");
        assert.match(await page.inputValue("#message"), /임대 견적/);
      });
      await check("견적 폼 필수값 검사", async () => {
        await page.waitForSelector("html[data-ready]");
        await page.fill("#name", "");
        await page.click("#contact-form button[type=submit]");
        assert.notEqual((await page.textContent('[data-error-for="name"]')).trim(), "");
      });
      await check("다른 페이지에서 검색하면 장비 목록으로 이동", async () => {
        await page.waitForSelector("html[data-ready]");
        await page.fill("#search-input", "발전기");
        await page.press("#search-input", "Enter");
        await page.waitForSelector(".card");
        assert.ok(await page.isVisible("#search-note"));
      });
      await check("공지사항 페이지 전체 목록", async () => {
        await page.goto(base + "/notice.html");
        await page.waitForSelector("html[data-ready]");
        assert.equal(await page.locator("#notice-list li").count(), 5);
      });
    } else {
      await check("모바일 카테고리 드롭다운", async () => {
        await page.selectOption("#category-select", "motor");
        assert.match(await page.textContent("#list-count"), /수중모터/);
      });
      await check("모바일 하단 고정 바", async () => {
        assert.ok(await page.isVisible(".bottom-bar"));
      });
      await check("모바일 메뉴로 페이지 이동", async () => {
        await page.click(".nav-toggle");
        await page.click('#nav a:text-is("회사소개")');
        await page.waitForLoadState("load");
        assert.ok(page.url().endsWith("about.html"));
        assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth), false);
      });
    }
    await page.close();
  }

  await check("관리자 페이지 열림(noindex)", async () => {
    const page = await browser.newPage();
    await page.goto(base + "/admin/index.html");
    assert.equal(await page.getAttribute('meta[name="robots"]', "content"), "noindex, nofollow");
    await page.close();
  });
  await check("견적 요청 관리(예시 화면): 목록·상세·상태 변경", async () => {
    const page = await browser.newPage({ viewport: { width: 1280, height: 900 } });
    page.on("pageerror", (e) => errors.push("관리자: " + e.message));
    await page.goto(base + "/admin/inquiries.html?demo");
    await page.waitForSelector(".inq-item");
    assert.equal(await page.isVisible("#login-view"), false, "예시 화면에서는 로그인 창 숨김");
    assert.equal(await page.locator(".inq-item").count(), 4, "처리할 요청 4건");
    assert.ok(await page.isVisible("#overdue"), "지연 경고 표시");
    await page.locator(".inq-item").first().click();
    assert.ok(await page.isVisible(".inq-contact a[href^='tel:']"), "전화 버튼");
    await page.click(".inq-status-pick span:text-is('연락함')");
    await page.fill("#f-memo", "통화 완료");
    await page.click(".inq-form button[type=submit]");
    await page.waitForSelector(".inq-history li >> text=상태: 연락함");
    assert.equal(await page.textContent(".inq-tab[data-tab=new] .inq-tab-n"), "1");
    await page.fill("#inq-search", "양수기");
    assert.equal(await page.locator(".inq-item").count(), 1);
    await page.close();
  });
  await check("견적 요청 관리(예시 화면): 모바일", async () => {
    const page = await browser.newPage({ viewport: { width: 390, height: 844 } });
    await page.goto(base + "/admin/inquiries.html?demo");
    await page.waitForSelector(".inq-item");
    await page.locator(".inq-item").first().click();
    assert.ok(await page.isVisible(".inq-back"));
    assert.equal(await page.isVisible("#inq-list"), false, "상세를 열면 목록은 숨김");
    assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth), false);
    await page.click(".inq-back");
    assert.ok(await page.isVisible("#inq-list"));
    await page.close();
  });
  await check("스크립트 오류 없음", async () => {
    assert.deepEqual(errors, []);
  });

  await browser.close();
  server.close();
  for (const [s, n] of results) console.log(s + "  " + n);
  const failed = results.filter((r) => r[0] === "실패").length;
  console.log("\n" + (results.length - failed) + "개 통과, " + failed + "개 실패");
  process.exit(failed ? 1 : 0);
})();
