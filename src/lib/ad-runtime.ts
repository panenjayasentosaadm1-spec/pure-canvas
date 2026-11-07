import { isAdActive, type AdSlotId, type AdSlotSetting } from "@/api/ad-slots";

export class AdLoadRegistry {
  private loaded = new Set<AdSlotId>();

  claim(id: AdSlotId, setting: AdSlotSetting): boolean {
    if (!isAdActive(setting) || this.loaded.has(id)) return false;
    this.loaded.add(id);
    return true;
  }
}

interface AdRuntime {
  registry: AdLoadRegistry;
  queue: Promise<void>;
}

type AdWindow = Window & { __usagiAdRuntime?: AdRuntime };

function runtime(): AdRuntime {
  const target = window as AdWindow;
  if (!target.__usagiAdRuntime) {
    target.__usagiAdRuntime = {
      registry: new AdLoadRegistry(),
      queue: Promise.resolve(),
    };
  }
  return target.__usagiAdRuntime;
}

async function executeGlobal(host: HTMLElement, code: string): Promise<void> {
  const template = document.createElement("template");
  template.innerHTML = code;
  const scripts = Array.from(template.content.querySelectorAll("script"));
  host.append(template.content);

  for (const original of scripts) {
    if (!host.isConnected) return;

    const script = document.createElement("script");
    for (const attr of Array.from(original.attributes)) {
      script.setAttribute(attr.name, attr.value);
    }
    script.textContent = original.textContent;

    const write = document.write;
    const writeln = document.writeln;
    const capture = (...values: string[]) => {
      host.append(document.createRange().createContextualFragment(values.join("")));
    };

    document.write = capture;
    document.writeln = (...values: string[]) => capture(...values, "\n");

    try {
      if (script.src) {
        await new Promise<void>((resolve, reject) => {
          const timer = window.setTimeout(() => {
            script.remove();
            reject(new Error("Sumber iklan tidak merespons."));
          }, 15000);

          const done = (error?: Error) => {
            window.clearTimeout(timer);
            error ? reject(error) : resolve();
          };

          script.onload = () => done();
          script.onerror = () => done(new Error("Sumber iklan gagal dimuat."));
          script.async = false;
          original.replaceWith(script);
        });
      } else {
        original.replaceWith(script);
      }
    } finally {
      document.write = write;
      document.writeln = writeln;
    }
  }
}

export function loadGlobalAd(
  id: "social_bar" | "popunder",
  setting: AdSlotSetting,
  host: HTMLElement,
): void {
  const state = runtime();
  if (!state.registry.claim(id, setting)) return;

  state.queue = state.queue
    .then(() => executeGlobal(host, setting.code))
    .catch((error: unknown) => {
      console.warn(`Gagal memuat slot iklan ${id}.`, error);
    });
}

export function bannerDocument(code: string, channel: string): string {
  const message = JSON.stringify(channel).replace(/</g, "\\u003c");

  return `<!doctype html>
<html>
<head>
<meta name="viewport" content="width=device-width, initial-scale=1">
<style>
html, body { margin: 0; padding: 0; width: 100%; min-height: 90px; overflow-x: hidden; }
body { display: flow-root; }
img, iframe, video { max-width: 100%; }
</style>
</head>
<body>
${code}
<script>
(() => {
  const send = () => {
    parent.postMessage({
      channel: ${message},
      height: Math.max(90, document.body.scrollHeight, document.body.offsetHeight)
    }, '*');
  };
  if ('ResizeObserver' in window) {
    new ResizeObserver(send).observe(document.body);
  }
  addEventListener('load', send);
  setTimeout(send, 500);
  setTimeout(send, 2000);
  send();
})();
</script>
</body>
</html>`;
}
