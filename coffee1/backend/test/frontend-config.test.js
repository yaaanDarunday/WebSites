const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");

const root = path.join(__dirname, "../..");
const configSource = fs.readFileSync(path.join(root, "config.js"), "utf8");

function apiFor(hostname) {
  const sandbox = { window: {}, location: { hostname } };
  vm.runInNewContext(configSource, sandbox);
  return sandbox.window.ALTURA_API;
}

test("pages served from localhost talk to the local API", () => {
  assert.equal(apiFor("localhost"), "http://localhost:3000");
  assert.equal(apiFor("127.0.0.1"), "http://localhost:3000");
});

test("any other host never falls back to the visitor's own localhost", () => {
  for (const host of ["altura-coffee.coffee1.workers.dev", "altura-coffee.pages.dev", "example.com"]) {
    const api = apiFor(host);
    assert.match(api, /^https:\/\/[^/]+$/, `${host} -> ${api}`);
    assert.ok(!api.includes("localhost"), `${host} must not use localhost`);
  }
});

test("the static host publishes only the site, not the backend or docs", () => {
  const ignored = fs.readFileSync(path.join(root, ".assetsignore"), "utf8").split(/\r?\n/).map((l) => l.trim());
  for (const entry of ["backend", "docs", "serve.json", ".vercelignore"]) {
    assert.ok(ignored.includes(entry), `.assetsignore must list ${entry}`);
  }
});
