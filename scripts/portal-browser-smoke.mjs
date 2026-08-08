import fs from 'node:fs';
import path from 'node:path';

const workspace = path.resolve(import.meta.dirname, '..');
const credentialText = fs.readFileSync(path.join(workspace, 'LOCAL-TEST-CREDENTIALS.md'), 'utf8');
const portalSection = credentialText.split('## Portal')[1]?.split('## Important')[0] ?? '';

function credential(label) {
  const match = portalSection.match(new RegExp(`- ${label}:\\s*(.+)`));
  if (!match) throw new Error(`Missing Portal ${label} in LOCAL-TEST-CREDENTIALS.md`);
  return match[1].replace(/[*`]/g, '').trim();
}

const portalEmail = credential('Email');
const portalPassword = credential('Password');
const shouldSendChat = process.argv.includes('--send');
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

class CdpClient {
  constructor(webSocketUrl) {
    this.nextId = 1;
    this.pending = new Map();
    this.listeners = new Map();
    this.socket = new WebSocket(webSocketUrl);
  }

  async connect() {
    await new Promise((resolve, reject) => {
      this.socket.addEventListener('open', resolve, { once: true });
      this.socket.addEventListener('error', reject, { once: true });
    });
    this.socket.addEventListener('message', (event) => {
      const message = JSON.parse(event.data);
      if (message.id) {
        const pending = this.pending.get(message.id);
        if (!pending) return;
        this.pending.delete(message.id);
        if (message.error) pending.reject(new Error(message.error.message));
        else pending.resolve(message.result);
        return;
      }
      for (const listener of this.listeners.get(message.method) ?? []) listener(message.params);
    });
  }

  send(method, params = {}) {
    const id = this.nextId++;
    return new Promise((resolve, reject) => {
      this.pending.set(id, { resolve, reject });
      this.socket.send(JSON.stringify({ id, method, params }));
    });
  }

  on(method, listener) {
    const listeners = this.listeners.get(method) ?? [];
    listeners.push(listener);
    this.listeners.set(method, listeners);
  }

  close() {
    this.socket.close();
  }
}

async function waitFor(predicate, timeoutMs = 20_000, intervalMs = 200) {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    const value = await predicate();
    if (value) return value;
    await sleep(intervalMs);
  }
  return null;
}

const targets = await fetch('http://127.0.0.1:9222/json/list').then((response) => response.json());
const target = targets.find((candidate) => candidate.type === 'page');
if (!target) throw new Error('No Edge page target found on CDP port 9222');

const cdp = new CdpClient(target.webSocketDebuggerUrl);
await cdp.connect();
await Promise.all([
  cdp.send('Page.enable'),
  cdp.send('Runtime.enable'),
  cdp.send('Network.enable'),
  cdp.send('Log.enable'),
]);

const runtimeErrors = [];
const failedResponses = [];
cdp.on('Runtime.exceptionThrown', ({ exceptionDetails }) => {
  runtimeErrors.push(exceptionDetails.exception?.description || exceptionDetails.text || 'Runtime exception');
});
cdp.on('Log.entryAdded', ({ entry }) => {
  if (entry.level === 'error') runtimeErrors.push(entry.text);
});
cdp.on('Network.responseReceived', ({ response }) => {
  if (response.status >= 400 && !response.url.includes('favicon')) {
    failedResponses.push({ status: response.status, url: response.url });
  }
});
cdp.on('Network.loadingFailed', ({ errorText, canceled, type }) => {
  if (!canceled && errorText !== 'net::ERR_ABORTED') {
    failedResponses.push({ status: 0, url: `${type}: ${errorText}` });
  }
});

await cdp.send('Page.addScriptToEvaluateOnNewDocument', {
  source: `
    window.__crewlabSmokeErrors = [];
    window.addEventListener('error', (event) => window.__crewlabSmokeErrors.push(String(event.error || event.message)));
    window.addEventListener('unhandledrejection', (event) => window.__crewlabSmokeErrors.push(String(event.reason)));
  `,
});

async function evaluate(expression, awaitPromise = true) {
  const result = await cdp.send('Runtime.evaluate', {
    expression,
    awaitPromise,
    returnByValue: true,
  });
  if (result.exceptionDetails) {
    throw new Error(result.exceptionDetails.exception?.description || result.exceptionDetails.text);
  }
  return result.result.value;
}

async function navigate(url) {
  await cdp.send('Page.navigate', { url });
  await waitFor(() => evaluate(`document.readyState === 'complete'`), 20_000);
  await sleep(900);
}

await navigate('http://localhost:3000/login');
if (await evaluate(`location.pathname === '/login'`)) {
  await evaluate(`(() => {
    const setValue = (selector, value) => {
      const input = document.querySelector(selector);
      const setter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value').set;
      setter.call(input, value);
      input.dispatchEvent(new Event('input', { bubbles: true }));
    };
    setValue('#login-email', ${JSON.stringify(portalEmail)});
    setValue('#login-password', ${JSON.stringify(portalPassword)});
    document.querySelector('#login-submit').click();
  })()`);

  const loginResult = await waitFor(
    () => evaluate(`location.pathname !== '/login' || document.querySelector('[role="alert"]')?.textContent || false`),
    25_000,
    300,
  );
  if (!loginResult || (typeof loginResult === 'string' && loginResult.includes('mật khẩu'))) {
    throw new Error(`Portal login failed: ${JSON.stringify({
      message: loginResult || 'timeout',
      runtimeErrors,
      failedResponses,
    })}`);
  }
}

runtimeErrors.length = 0;
failedResponses.length = 0;

const routeResults = [];
const routes = ['/', '/a01-chat', '/content-hub', '/assets', '/reports', '/settings'];
for (const route of routes) {
  const errorStart = runtimeErrors.length;
  const networkStart = failedResponses.length;
  await navigate(`http://localhost:3000${route}`);
  await waitFor(
    () => evaluate(`!document.body.innerText.includes('Đang tải client…') || Boolean(document.querySelector('[role="alert"]'))`),
    12_000,
    250,
  );
  const result = await evaluate(`(() => {
    const text = document.body.innerText;
    return {
      requestedRoute: ${JSON.stringify(route)},
      actualPath: location.pathname,
      heading: document.querySelector('h1')?.textContent?.trim() || '',
      nextRuntimeOverlay: text.includes('Unhandled Runtime Error') || text.includes('Application error:'),
      inlineAlerts: [...document.querySelectorAll('[role="alert"]')].map((item) => item.textContent.trim()),
      browserErrors: window.__crewlabSmokeErrors || [],
      hasA01Navigation: text.includes('Trò chuyện A01'),
      hasOldBriefAction: text.includes('Tạo Brief') || text.includes('Tạo brief'),
      clientLoaded: !text.includes('Đang tải client…'),
      bodySnippet: text.replace(/\\s+/g, ' ').slice(0, 180),
    };
  })()`);
  result.runtimeErrors = runtimeErrors.slice(errorStart);
  result.failedResponses = failedResponses.slice(networkStart);
  routeResults.push(result);
}

await navigate('http://localhost:3000/');
const dashboardInteractions = await evaluate(`(async () => {
  const themeButton = document.querySelector('#theme-toggle');
  themeButton?.click();
  const filter = document.querySelector('#kanban-filter-pending_approval');
  filter?.click();
  await new Promise((resolve) => setTimeout(resolve, 200));
  const cta = [...document.querySelectorAll('a')].find((item) => item.textContent.includes('Trò chuyện với A01'));
  const result = {
    themeToggled: Boolean(themeButton),
    filterSelected: filter?.className.includes('bg-lime-brand') || false,
    a01CtaFound: Boolean(cta),
  };
  cta?.click();
  return result;
})()`);
await waitFor(() => evaluate(`location.pathname === '/a01-chat'`), 10_000);
dashboardInteractions.a01CtaNavigated = await evaluate(`location.pathname === '/a01-chat'`);

const chatState = await evaluate(`(() => ({
  hasTitle: document.body.innerText.includes('Trò chuyện với A01'),
  hasComposer: Boolean(document.querySelector('textarea[aria-label="Nhắn tin cho A01"]')),
  hasSendButton: Boolean(document.querySelector('button[aria-label="Gửi tin nhắn"]')),
  hasRuntimeOverlay: document.body.innerText.includes('Unhandled Runtime Error'),
  inlineAlerts: [...document.querySelectorAll('[role="alert"]')].map((item) => item.textContent.trim()),
}))()`);

let chatSend = null;
if (shouldSendChat) {
  const smokeMessage = `Kiểm thử A01 ${new Date().toISOString()}: Hãy viết một bài Facebook ngắn giới thiệu cold brew cho cuối tuần, mục tiêu kéo khách đến quán.`;
  await evaluate(`(() => {
    const textarea = document.querySelector('textarea[aria-label="Nhắn tin cho A01"]');
    const setter = Object.getOwnPropertyDescriptor(HTMLTextAreaElement.prototype, 'value').set;
    setter.call(textarea, ${JSON.stringify(smokeMessage)});
    textarea.dispatchEvent(new Event('input', { bubbles: true }));
  })()`);
  await sleep(200);
  await evaluate(`document.querySelector('button[aria-label="Gửi tin nhắn"]')?.click()`);
  const sendResult = await waitFor(
    () => evaluate(`document.body.innerText.includes(${JSON.stringify(smokeMessage)}) || document.querySelector('[role="alert"]')?.textContent || false`),
    90_000,
    500,
  );
  chatSend = await evaluate(`(() => ({
    completed: document.body.innerText.includes(${JSON.stringify(smokeMessage)}),
    stillThinking: document.body.innerText.includes('A01 đang suy nghĩ'),
    dispatched: document.body.innerText.includes('Đã giao vào quy trình nội dung'),
    pendingDispatch: document.body.innerText.includes('Đã nhận, đang chờ hệ thống xử lý'),
    inlineAlerts: [...document.querySelectorAll('[role="alert"]')].map((item) => item.textContent.trim()),
  }))()`);
  chatSend.waitResult = sendResult;
}

const summary = {
  authenticated: true,
  routes: routeResults,
  dashboardInteractions,
  chatState,
  chatSend,
  totalRuntimeErrors: runtimeErrors.length,
  totalFailedResponses: failedResponses.length,
};

console.log(JSON.stringify(summary, null, 2));
cdp.close();
