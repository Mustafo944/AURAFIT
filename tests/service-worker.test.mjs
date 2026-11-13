import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import vm from "node:vm";

function worker(fetch) {
  const handlers = {};
  const stored = [];
  const deleted = [];
  const fallback = new Response("Offline");
  vm.runInNewContext(fs.readFileSync("public/sw.js", "utf8"), {
    URL,
    Response,
    fetch,
    self: {
      location: { origin: "https://aurafit.test" },
      addEventListener: (name, handler) => {
        handlers[name] = handler;
      },
      skipWaiting() {},
      clients: { claim: async () => {} },
    },
    caches: {
      keys: async () => ["aurafit-v6", "aurafit-v7", "another-app"],
      delete: async (key) => {
        deleted.push(key);
      },
      open: async () => ({
        match: async (key) => (key === "/offline.html" ? fallback.clone() : undefined),
        put: async (key) => {
          stored.push(key);
        },
        addAll: async (keys) => {
          stored.push(...keys);
        },
      }),
    },
  });
  return { handlers, stored, deleted };
}

test("service worker never caches account pages or intercepts RSC/API/provider requests", async () => {
  const { handlers, stored } = worker(async () => new Response("Private profile"));
  let response;
  handlers.fetch({
    request: { method: "GET", mode: "navigate", url: "https://aurafit.test/profile" },
    respondWith: (promise) => {
      response = promise;
    },
  });
  assert.equal(await (await response).text(), "Private profile");
  assert.deepEqual(stored, []);
  for (const path of [
    "https://aurafit.test/profile?_rsc=secret",
    "https://aurafit.test/api/test",
    "https://other.test/script.js",
  ]) {
    handlers.fetch({
      request: { method: "GET", mode: "cors", url: path },
      respondWith: () => assert.fail("Private request was intercepted"),
    });
  }
});

test("offline navigation uses a neutral fallback and activation removes only old AuraFit caches", async () => {
  const { handlers, deleted } = worker(async () => {
    throw new Error("Offline");
  });
  let response;
  handlers.fetch({
    request: { method: "GET", mode: "navigate", url: "https://aurafit.test/profile" },
    respondWith: (promise) => {
      response = promise;
    },
  });
  assert.equal(await (await response).text(), "Offline");
  let activation;
  handlers.activate({
    waitUntil: (promise) => {
      activation = promise;
    },
  });
  await activation;
  assert.deepEqual(deleted, ["aurafit-v6"]);
});
