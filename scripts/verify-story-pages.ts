import { mkdirSync } from "node:fs";
import { spawn } from "node:child_process";
import { loadEnvConfig } from "@next/env";
import { createClient } from "@sanity/client";

loadEnvConfig(process.cwd());

const CHROME = "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome";
const PORT = 9335;
const ORIGIN = "http://localhost:3010";

type Target = { code: string; slug: string; lang: "en" | "es" | "zh" };

function plain(value: unknown): string {
  if (value == null) return "";
  if (typeof value === "string") return value;
  if (Array.isArray(value)) return value.map(plain).join(" ");
  if (typeof value === "object") return Object.values(value as Record<string, unknown>).map(plain).join(" ");
  return "";
}

async function targets(): Promise<Target[]> {
  const client = createClient({
    projectId: process.env.NEXT_PUBLIC_SANITY_PROJECT_ID,
    dataset: process.env.NEXT_PUBLIC_SANITY_DATASET || "production",
    apiVersion: "2024-10-01",
    token: process.env.SANITY_API_WRITE_TOKEN,
    useCdn: false,
    perspective: "previewDrafts",
  });
  const stories = await client.fetch<{ participantCode: string; slug: string; segments?: { quote?: { en?: string; es?: string; zh?: string }; body?: unknown }[] }[]>(
    `*[_type=="story"]{ participantCode, "slug": slug.current, segments }`,
  );
  const byCode = new Map<string, Target>();
  for (const story of stories) {
    const lengths = { en: 0, es: 0, zh: 0 };
    for (const segment of story.segments || []) {
      lengths.en += (segment.quote?.en || "").length + plain(segment.body && (segment.body as { en?: unknown }).en).length;
      lengths.es += (segment.quote?.es || "").length + plain(segment.body && (segment.body as { es?: unknown }).es).length;
      lengths.zh += (segment.quote?.zh || "").length + plain(segment.body && (segment.body as { zh?: unknown }).zh).length;
    }
    const lang = (Object.entries(lengths).sort((a, b) => b[1] - a[1])[0]?.[0] || "en") as Target["lang"];
    byCode.set(story.participantCode, { code: story.participantCode, slug: story.slug, lang });
  }
  return [...byCode.values()].sort((a, b) => a.code.localeCompare(b.code));
}

class Cdp {
  next = 1;
  pending = new Map<number, { resolve: (value: unknown) => void; reject: (error: Error) => void }>();
  constructor(private socket: WebSocket) {
    socket.addEventListener("message", (event) => {
      const message = JSON.parse(String(event.data)) as { id?: number; result?: unknown; error?: { message?: string } };
      if (!message.id) return;
      const waiter = this.pending.get(message.id);
      if (!waiter) return;
      this.pending.delete(message.id);
      if (message.error) waiter.reject(new Error(message.error.message || "cdp error"));
      else waiter.resolve(message.result);
    });
  }
  send(method: string, params: Record<string, unknown> = {}, sessionId?: string) {
    const id = this.next++;
    return new Promise((resolve, reject) => {
      this.pending.set(id, { resolve, reject });
      this.socket.send(JSON.stringify({ id, method, params, sessionId }));
    });
  }
}

async function main() {
  mkdirSync("docs/screenshots", { recursive: true });
  const chrome = spawn(CHROME, ["--headless=new", "--disable-gpu", `--remote-debugging-port=${PORT}`, "--user-data-dir=/tmp/chrome-archive-stories", "about:blank"], { stdio: "ignore" });
  let version: { webSocketDebuggerUrl: string } | null = null;
  for (let attempt = 0; attempt < 30 && !version; attempt += 1) {
    try {
      version = await fetch(`http://127.0.0.1:${PORT}/json/version`).then((response) => response.json());
    } catch {
      await new Promise((resolve) => setTimeout(resolve, 200));
    }
  }
  if (!version) throw new Error("Chrome did not start");
  const socket = new WebSocket(version.webSocketDebuggerUrl);
  await new Promise((resolve) => socket.addEventListener("open", resolve));
  const browser = new Cdp(socket);
  const only = new Set((process.env.ONLY || "").split(",").map((code) => code.trim()).filter(Boolean));
  const stories = (await targets()).filter((story) => only.size === 0 || only.has(story.code));
  const shots = [
    { file: "bmnj-en-desktop", target: stories.find((story) => story.code === "BMNJ"), width: 1440, height: 1100 },
    { file: "bmnj-en-mobile", target: stories.find((story) => story.code === "BMNJ"), width: 390, height: 844 },
    { file: "cssf-zh-desktop", target: stories.find((story) => story.code === "CSSF"), width: 1440, height: 1100 },
    { file: "cssf-zh-mobile", target: stories.find((story) => story.code === "CSSF"), width: 390, height: 844 },
    { file: "rhwe-es-desktop", target: stories.find((story) => story.code === "RHWE"), width: 1440, height: 1100 },
    { file: "rhwe-es-mobile", target: stories.find((story) => story.code === "RHWE"), width: 390, height: 844 },
    { file: "frnj-en-desktop", target: stories.find((story) => story.code === "FRNJ"), width: 1440, height: 1100 },
    { file: "frnj-en-mobile", target: stories.find((story) => story.code === "FRNJ"), width: 390, height: 844 },
  ];
  const results: string[] = [];
  for (const story of stories) {
    const created = (await browser.send("Target.createTarget", { url: "about:blank" })) as { targetId: string };
    const attached = (await browser.send("Target.attachToTarget", { targetId: created.targetId, flatten: true })) as { sessionId: string };
    const send = (method: string, params: Record<string, unknown> = {}) => browser.send(method, params, attached.sessionId);
    await send("Page.enable");
    await send("Runtime.enable");
    const shot = shots.find((item) => item.target?.code === story.code && item.width === 1440);
    const width = shot ? 1440 : 1280;
    const height = shot ? 1100 : 900;
    await send("Emulation.setDeviceMetricsOverride", { width, height, deviceScaleFactor: 1, mobile: false });
    const url = `${ORIGIN}/${story.lang}/stories/${story.slug}`;
    for (let attempt = 0; attempt < 4; attempt += 1) {
      const response = await fetch(url).catch(() => null);
      const html = response ? await response.text() : "";
      if (response?.ok && html.includes("storyStageItems")) break;
      await new Promise((resolve) => setTimeout(resolve, 800));
    }
    await send("Page.navigate", { url });
    const expression = `(async () => {
        const started = Date.now();
        while (!document.querySelector(".storyStageItems a[href^='#segment-']") && Date.now() - started < 15000) {
          await new Promise((resolve) => setTimeout(resolve, 250));
        }
        const title = document.title;
        const heading = document.querySelector("h1")?.textContent || "";
        const link = document.querySelector(".storyStageItems a[href^='#segment-']");
        if (!link) return { title, heading, clicked: false, reason: document.body.innerText.includes("clientReferenceManifest") ? "next error overlay" : "no timeline link" };
        link.click();
        await new Promise((resolve) => setTimeout(resolve, 800));
        const id = link.getAttribute("href").slice(1);
        const target = document.getElementById(id);
        const top = target ? target.getBoundingClientRect().top : null;
        return { title, heading, clicked: true, hash: location.hash, id, top };
      })()`;
    let check = (await send("Runtime.evaluate", {
      expression,
      awaitPromise: true,
      returnByValue: true,
    })) as { result?: { value?: { title: string; heading: string; clicked: boolean; reason?: string; hash?: string; id?: string; top?: number | null } } };
    if (!check.result?.value?.clicked) {
      await send("Page.reload", { ignoreCache: true });
      check = (await send("Runtime.evaluate", {
        expression,
        awaitPromise: true,
        returnByValue: true,
      })) as typeof check;
    }
    const value = check.result?.value;
    const hash = value?.hash ? decodeURIComponent(value.hash) : "";
    const ok = Boolean(value?.clicked && hash === `#${value?.id}` && value?.heading.includes(story.code) && value?.top != null && value.top < 180);
    results.push([story.code, story.lang, ok ? "page-ok" : "page-fail", value?.reason || "", value?.hash || "", String(value?.top ?? "")].join("\t"));
    for (const item of shots.filter((entry) => entry.target?.code === story.code && ok)) {
      await send("Emulation.setDeviceMetricsOverride", { width: item.width, height: item.height, deviceScaleFactor: 1, mobile: item.width < 500 });
      await send("Runtime.evaluate", {
        expression: `new Promise((resolve) => {
          window.scrollTo(0, 0);
          const image = document.querySelector(".storyHero img");
          if (!image || image.complete) return resolve(true);
          image.addEventListener("load", () => resolve(true), { once: true });
          setTimeout(resolve, 2500);
        })`,
        awaitPromise: true,
      });
      await new Promise((resolve) => setTimeout(resolve, 400));
      const image = (await send("Page.captureScreenshot", { format: "png" })) as { data: string };
      const path = `docs/screenshots/${item.file}.png`;
      await import("node:fs").then((fs) => fs.writeFileSync(path, Buffer.from(image.data, "base64")));
      results.push(`shot\t${path}`);
    }
    await browser.send("Target.closeTarget", { targetId: created.targetId });
    await new Promise((resolve) => setTimeout(resolve, 600));
  }
  console.log(results.join("\n"));
  chrome.kill();
  socket.close();
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : "verify failed");
  process.exit(1);
});
