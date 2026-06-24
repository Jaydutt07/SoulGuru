const CLERK_PUBLISHABLE_KEY = import.meta.env.VITE_CLERK_PUBLISHABLE_KEY || "";
let clerkLoadPromise = null;

export function initializeClerkAuth() {
  if (!CLERK_PUBLISHABLE_KEY || typeof window === "undefined") {
    return Promise.resolve(null);
  }

  if (!clerkLoadPromise) {
    clerkLoadPromise = loadClerkBrowser()
      .catch((error) => {
        console.warn("Unable to initialize Clerk auth", error.message);
        return null;
      });
  }

  return clerkLoadPromise;
}

export async function authFetch(input, init = {}) {
  const token = await getClerkToken();
  const headers = new Headers(init.headers || {});

  if (token && !headers.has("Authorization")) {
    headers.set("Authorization", `Bearer ${token}`);
  }

  return fetch(input, {
    ...init,
    headers
  });
}

async function getClerkToken() {
  const clerk = await initializeClerkAuth();
  const session = clerk?.session;
  if (!session?.getToken) return "";

  try {
    return await session.getToken();
  } catch {
    return "";
  }
}

async function loadClerkBrowser() {
  if (window.Clerk?.load) {
    await loadClerkInstance(window.Clerk);
    return window.Clerk;
  }

  const clerkDomain = getClerkFrontendDomain(CLERK_PUBLISHABLE_KEY);
  if (!clerkDomain) {
    throw new Error("VITE_CLERK_PUBLISHABLE_KEY is not a valid Clerk publishable key");
  }

  await loadScriptOnce(
    "soulguru-clerk-ui",
    `https://${clerkDomain}/npm/@clerk/ui@1/dist/ui.browser.js`
  );
  await loadScriptOnce(
    "soulguru-clerk-js",
    `https://${clerkDomain}/npm/@clerk/clerk-js@6/dist/clerk.browser.js`,
    {
      "data-clerk-publishable-key": CLERK_PUBLISHABLE_KEY
    }
  );

  await loadClerkInstance(window.Clerk);
  return window.Clerk || null;
}

async function loadClerkInstance(clerk) {
  if (!clerk?.load || clerk.loaded) {
    return;
  }

  await clerk.load({
    ui: { ClerkUI: window.__internal_ClerkUICtor }
  });
}

function loadScriptOnce(id, src, attributes = {}) {
  return new Promise((resolve, reject) => {
    const existing = document.getElementById(id);
    if (existing?.dataset.loaded === "true") {
      resolve();
      return;
    }
    if (existing) {
      existing.addEventListener("load", resolve, { once: true });
      existing.addEventListener("error", () => reject(new Error(`Failed to load ${src}`)), { once: true });
      return;
    }

    const script = document.createElement("script");
    script.id = id;
    script.src = src;
    script.async = true;
    script.defer = true;
    script.crossOrigin = "anonymous";
    Object.entries(attributes).forEach(([key, value]) => {
      script.setAttribute(key, value);
    });
    script.addEventListener("load", () => {
      script.dataset.loaded = "true";
      resolve();
    }, { once: true });
    script.addEventListener("error", () => reject(new Error(`Failed to load ${src}`)), { once: true });
    document.head.appendChild(script);
  });
}

function getClerkFrontendDomain(publishableKey) {
  const encodedDomain = String(publishableKey || "").split("_")[2] || "";
  if (!encodedDomain) return "";

  try {
    const base64 = encodedDomain.replace(/-/g, "+").replace(/_/g, "/");
    const padded = base64.padEnd(Math.ceil(base64.length / 4) * 4, "=");
    return window.atob(padded).replace(/\$$/, "");
  } catch {
    return "";
  }
}
