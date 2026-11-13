import { spawn } from "node:child_process";
import { mkdirSync, mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";

const BRAVE = "/usr/bin/brave-browser-stable";
const LAUNCH_TIMEOUT_MS = 15000;
const LAUNCH_POLL_MS = 250;
const LOAD_TIMEOUT_MS = 30000;
const sleep = (ms) => new Promise((done) => setTimeout(done, ms));

const fetchJson = async (url, options) => {
  const response = await fetch(url, options);
  if (!response.ok) throw new Error(`${options?.method ?? "GET"} ${url} -> ${response.status}`);
  return response.json();
};

const consoleText = (args) =>
  args.map((arg) => arg.value ?? arg.description ?? "").join(" ");

const isGlError = (text) => text.includes("THREE.WebGLProgram") || text.includes("WebGL:");

async function openSocket(url) {
  const socket = new WebSocket(url);
  await new Promise((done, fail) => {
    socket.addEventListener("open", done, { once: true });
    socket.addEventListener("error", () => fail(new Error(`WebSocket failed: ${url}`)), { once: true });
  });
  return socket;
}

async function createPage(port, url, { width = 1280, height = 720 }) {
  const target = await fetchJson(`http://localhost:${port}/json/new?about:blank`, { method: "PUT" });
  const socket = await openSocket(target.webSocketDebuggerUrl);
  const pending = new Map();
  const listeners = new Map();
  const errors = [];
  let nextId = 0;

  socket.addEventListener("message", ({ data }) => {
    const message = JSON.parse(data);
    if (message.id !== undefined) {
      const { resolve, reject } = pending.get(message.id);
      pending.delete(message.id);
      if (message.error) reject(new Error(`${message.error.message} (${message.error.code})`));
      else resolve(message.result);
      return;
    }
    for (const listener of listeners.get(message.method) ?? []) listener(message.params);
  });

  const send = (method, params = {}) =>
    new Promise((resolve, reject) => {
      const id = ++nextId;
      pending.set(id, { resolve, reject });
      socket.send(JSON.stringify({ id, method, params }));
    });

  const on = (method, listener) => {
    listeners.set(method, [...(listeners.get(method) ?? []), listener]);
  };

  on("Runtime.exceptionThrown", ({ exceptionDetails }) => {
    errors.push(`exception: ${exceptionDetails.text} ${exceptionDetails.exception?.description ?? ""}`.trim());
  });
  on("Runtime.consoleAPICalled", ({ type, args }) => {
    const text = consoleText(args);
    if (type === "error" || type === "assert" || isGlError(text)) errors.push(`console.${type}: ${text}`);
  });
  on("Log.entryAdded", ({ entry }) => {
    if (entry.level === "error") errors.push(`log: ${entry.text} ${entry.url ?? ""}`.trim());
  });

  const evaluate = async (expression) => {
    const { result, exceptionDetails } = await send("Runtime.evaluate", {
      expression,
      awaitPromise: true,
      returnByValue: true,
    });
    if (exceptionDetails) {
      throw new Error(`evaluate failed: ${exceptionDetails.exception?.description ?? exceptionDetails.text}`);
    }
    return result.value;
  };

  const waitFor = async (expression, timeoutMs = 10000) => {
    const deadline = Date.now() + timeoutMs;
    while (Date.now() < deadline) {
      if (await evaluate(expression)) return;
      await sleep(100);
    }
    throw new Error(`waitFor timed out after ${timeoutMs} ms: ${expression}`);
  };

  const click = async (selector) => {
    const { x, y } = await evaluate(`(() => {
      const box = document.querySelector(${JSON.stringify(selector)}).getBoundingClientRect();
      return { x: box.left + box.width / 2, y: box.top + box.height / 2 };
    })()`);
    const mouse = { x, y, button: "left", clickCount: 1 };
    await send("Input.dispatchMouseEvent", { type: "mousePressed", ...mouse });
    await send("Input.dispatchMouseEvent", { type: "mouseReleased", ...mouse });
  };

  const screenshot = async (file) => {
    const { data } = await send("Page.captureScreenshot", { format: "png" });
    mkdirSync(dirname(file), { recursive: true });
    writeFileSync(file, Buffer.from(data, "base64"));
  };

  const close = async () => {
    socket.close();
    await fetch(`http://localhost:${port}/json/close/${target.id}`);
  };

  await send("Runtime.enable");
  await send("Log.enable");
  await send("Page.enable");
  await send("Emulation.setDeviceMetricsOverride", { width, height, deviceScaleFactor: 1, mobile: false });

  const loaded = new Promise((done, fail) => {
    const timer = setTimeout(() => fail(new Error(`load timed out: ${url}`)), LOAD_TIMEOUT_MS);
    on("Page.loadEventFired", () => {
      clearTimeout(timer);
      done();
    });
  });
  await send("Page.navigate", { url });
  await loaded;

  return { errors, send, on, evaluate, waitFor, click, screenshot, close };
}

export async function connectBrowser(port = 9222) {
  const versionUrl = `http://localhost:${port}/json/version`;
  let child = null;
  try {
    await fetchJson(versionUrl);
  } catch {
    const userDataDir = mkdtempSync(join(tmpdir(), "ihby-brave-"));
    child = spawn(BRAVE, [
      `--remote-debugging-port=${port}`,
      "--headless=new",
      `--user-data-dir=${userDataDir}`,
      "about:blank",
    ], { detached: false, stdio: "ignore" });
    const deadline = Date.now() + LAUNCH_TIMEOUT_MS;
    for (;;) {
      try {
        await fetchJson(versionUrl);
        break;
      } catch (error) {
        if (Date.now() >= deadline) {
          child.kill();
          throw new Error(`Brave did not start within ${LAUNCH_TIMEOUT_MS / 1000} s`, { cause: error });
        }
        await sleep(LAUNCH_POLL_MS);
      }
    }
  }

  return {
    openPage: (url, size = {}) => createPage(port, url, size),
    close: async () => {
      child?.kill();
    },
  };
}
