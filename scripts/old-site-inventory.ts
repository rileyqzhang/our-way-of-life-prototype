import { readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import { chromium, type Browser, type Page } from "playwright-core";

const CHROME = "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome";
const SITE = "https://www.ourwayoflifearchive.com";
const PAGE_TIMEOUT_MS = 60_000;
const OUTPUT = path.join(process.cwd(), "source-documents/old-site-inventory.json");

type Card = { code: string; bio: string; photo: string; photoPreview: string; storyUrl: string; codeLines: string[] };
type Segment = { order: number; position: number; title: string; bodyStart: string; bodyWords: number; bodyText: string };
type OutlineItem = { position: number; tag: string; size: number; weight: number; text: string };
type StoryPage = { url: string; pageTitle: string; intro: string[]; outline?: OutlineItem[]; segments: Segment[]; error?: string };

async function withPage<T>(browser: Browser, url: string, read: (page: Page) => Promise<T>): Promise<T> {
  const page = await browser.newPage({ viewport: { width: 1440, height: 1000 } });
  // tsx compiles named arrow functions with a __name helper that the browser does not have.
  await page.addInitScript("window.__name = (fn) => fn;");
  let timer: NodeJS.Timeout | undefined;
  try {
    const timeout = new Promise<never>((_, reject) => {
      timer = setTimeout(() => reject(new Error(`Timed out after 60s: ${url}`)), PAGE_TIMEOUT_MS);
    });
    return await Promise.race([
      (async () => {
        await page.goto(url, { waitUntil: "networkidle", timeout: 45_000 });
        for (let i = 0; i < 60; i += 1) {
          const atEnd = await page.evaluate(() => {
            window.scrollBy(0, 900);
            return window.scrollY + window.innerHeight >= document.body.scrollHeight - 5;
          });
          await page.waitForTimeout(200);
          if (atEnd) break;
        }
        await page.waitForTimeout(1200);
        return read(page);
      })(),
      timeout,
    ]);
  } finally {
    if (timer) clearTimeout(timer);
    await page.close();
  }
}

function readCards(page: Page) {
  return page.evaluate(() => {
    const CODE = /^[A-Za-z]{4,5}\d{0,3}$/;
    const outside = (el: Element) => !el.closest("header, nav, footer, [class*=cart], [class*=Cart]");
    const isContentImage = (img: HTMLImageElement) => {
      const src = img.currentSrc || img.src;
      return (/\/uploads\//.test(src) || /images\.unsplash\.com/.test(src)) && !/Our%20Way%20of%20Life/i.test(src) && outside(img);
    };
    const codeLines = (el: Element) =>
      ((el as HTMLElement).innerText || "")
        .split("\n")
        .map((line) => line.trim())
        .filter((line) => CODE.test(line) && !/^(Home|More|Menu)$/i.test(line));
    const cards: { code: string; bio: string; photo: string; photoPreview: string; storyUrl: string; codeLines: string[] }[] = [];
    for (const img of [...document.querySelectorAll("img")] as HTMLImageElement[]) {
      if (!isContentImage(img)) continue;
      let node: Element | null = img.parentElement;
      while (node && node !== document.body && !codeLines(node).length) node = node.parentElement;
      if (!node || node === document.body) continue;
      const codes = codeLines(node);
      const links = [...node.querySelectorAll("a[href*='/s/stories/']")].map((a) => (a as HTMLAnchorElement).href);
      const lines = ((node as HTMLElement).innerText || "").split("\n").map((line) => line.trim()).filter(Boolean);
      const codeIndex = lines.findIndex((line) => CODE.test(line));
      const bio = lines.slice(codeIndex + 1).filter((line) => !/^learn more$/i.test(line)).join(" ");
      const preview = img.currentSrc || img.src;
      cards.push({
        code: codes[0] || "",
        bio,
        photo: preview.split("?")[0],
        photoPreview: preview,
        storyUrl: [...new Set(links)][0] || "",
        codeLines: codes,
      });
    }
    const covered = new Set(cards.map((card) => card.storyUrl));
    for (const link of [...document.querySelectorAll("a[href*='/s/stories/']")] as HTMLAnchorElement[]) {
      if (!outside(link) || covered.has(link.href)) continue;
      covered.add(link.href);
      let node: Element = link;
      while (node.parentElement && node.parentElement !== document.body) {
        const parent = node.parentElement;
        const slugs = new Set([...parent.querySelectorAll("a[href*='/s/stories/']")].map((a) => (a as HTMLAnchorElement).href));
        if (slugs.size > 1) break;
        node = parent;
      }
      const codes = codeLines(node);
      const lines = ((node as HTMLElement).innerText || "").split("\n").map((line) => line.trim()).filter(Boolean);
      const codeIndex = lines.findIndex((line) => CODE.test(line));
      const img = [...node.querySelectorAll("img")].find((el) => isContentImage(el as HTMLImageElement)) as HTMLImageElement | undefined;
      const background = [node, ...node.querySelectorAll("*")]
        .map((el) => getComputedStyle(el).backgroundImage)
        .find((value) => /\/uploads\//.test(value));
      const preview = img ? img.currentSrc || img.src : background?.match(/url\("?([^")]+)"?\)/)?.[1] || "";
      cards.push({
        code: codes[0] || "",
        bio: lines.slice(codeIndex + 1).filter((line) => !/^learn more$/i.test(line)).join(" "),
        photo: preview.split("?")[0],
        photoPreview: preview,
        storyUrl: link.href,
        codeLines: codes,
      });
    }
    return cards;
  });
}

function readStory(page: Page) {
  return page.evaluate(() => {
    const outside = (el: Element) => !el.closest("header, nav, footer, [class*=cart], [class*=Cart], [class*=heading-content]");
    const clean = (text: string) => text.replace(/\s+/g, " ").trim();
    const outline: { position: number; tag: string; size: number; weight: number; text: string }[] = [];
    const seen = new Set<Element>();
    const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
    for (let node = walker.nextNode(); node; node = walker.nextNode()) {
      if (!clean(node.textContent || "")) continue;
      const block = node.parentElement?.closest("h1, h2, h3, h4, h5, h6, p, li, blockquote, div");
      if (!block || seen.has(block) || block.closest("header, nav, footer, script, style, [class*=cart], [class*=Cart]")) continue;
      if ((block as HTMLElement).offsetParent === null) continue;
      seen.add(block);
      const style = getComputedStyle(block);
      outline.push({
        position: outline.length,
        tag: block.tagName,
        size: parseFloat(style.fontSize),
        weight: Number(style.fontWeight) || 400,
        text: clean(block.textContent || "").slice(0, 160),
      });
    }
    const blocks = [...document.querySelectorAll("h1, h2, h3, h4, p")]
      .filter(outside)
      .map((el) => {
        const text = clean(el.textContent || "");
        const bold = clean([...el.querySelectorAll("strong, b")].map((node) => node.textContent || "").join(""));
        const isHeading = /^H[1-4]$/.test(el.tagName) || (el.tagName === "P" && text.length > 0 && text.length < 300 && bold === text);
        return { text, isHeading };
      })
      .filter((block) => block.text && !/^back to cart$/i.test(block.text) && !/^you don't have any items/i.test(block.text));
    const intro: string[] = [];
    const segments: { title: string; body: string[] }[] = [];
    for (const block of blocks) {
      if (block.isHeading) segments.push({ title: block.text, body: [] });
      else if (segments.length) segments[segments.length - 1].body.push(block.text);
      else intro.push(block.text);
    }
    const kept: { title: string; body: string[] }[] = [];
    for (const segment of segments) {
      if (!segment.body.length && !kept.length) intro.push(segment.title);
      else kept.push(segment);
    }
    let cursor = 0;
    return {
      pageTitle: document.title,
      intro,
      outline,
      segments: kept.map((segment, order) => {
        const words = segment.body.join(" ").split(/\s+/).filter(Boolean);
        const found = outline.findIndex((item, index) => index >= cursor && item.text === segment.title.slice(0, 160));
        if (found >= 0) cursor = found + 1;
        return { order, position: found, title: segment.title, bodyStart: words.slice(0, 20).join(" "), bodyWords: words.length, bodyText: segment.body.join("\n") };
      }),
    };
  });
}

async function main() {
  const browser = await chromium.launch({ executablePath: CHROME, headless: true });
  try {
    const cards: Card[] = await withPage(browser, `${SITE}/participants`, readCards);
    console.log(`Participants page: ${cards.length} image cards`);
    const only = process.argv.slice(2).map((slug) => slug.toLowerCase());
    let stories: Record<string, StoryPage> = {};
    let urls = [...new Set(cards.map((card) => card.storyUrl).filter(Boolean))];
    if (only.length) {
      stories = JSON.parse(readFileSync(OUTPUT, "utf8")).stories;
      urls = urls.filter((url) => only.includes(url.split("/").pop() || ""));
    }
    for (const url of urls) {
      try {
        const story = await withPage(browser, url, readStory);
        stories[url] = { url, ...story };
        console.log(`${url.split("/").pop()}: ${story.segments.length} segments`);
      } catch (error) {
        stories[url] = { url, pageTitle: "", intro: [], segments: [], error: error instanceof Error ? error.message : String(error) };
        console.log(`${url}: FAILED ${stories[url].error}`);
      }
    }
    writeFileSync(OUTPUT, JSON.stringify({ scrapedAt: new Date().toISOString(), source: `${SITE}/participants`, cards, stories }, null, 2));
    console.log(`Saved ${path.relative(process.cwd(), OUTPUT)}`);
  } finally {
    await browser.close();
  }
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
