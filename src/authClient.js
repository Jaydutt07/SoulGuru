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
  const clerk = window.Clerk;
  const session = clerk?.session;
  if (!session?.getToken) return "";

  try {
    return await session.getToken();
  } catch {
    return "";
  }
}
