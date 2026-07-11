import test from "node:test";
import assert from "node:assert/strict";
import { normalizeToken } from "../src/adapters/gmgn.js";

test("extracts a direct X status URL and launchpad", () => { const token = normalizeToken({ address: "0x1", symbol: "HOOD", launchpad_platform: "hood.fun", socials: { twitter: "https://x.com/hood/status/123456" }, stage: "new_creation" }); assert.equal(token.twitterUrl, "https://x.com/hood/status/123456"); assert.equal(token.launchpad, "hood.fun"); });
test("rejects profile-only X URLs for narrative enrichment", () => { const token = normalizeToken({ address: "0x1", twitter: "https://x.com/hood", stage: "new_creation" }); assert.equal(token.twitterUrl, null); });
