import test from "node:test";
import assert from "node:assert/strict";
import { DeployerOnchain } from "../src/adapters/onchain.js";

test("rejects missing deployer addresses without network calls", async () => { const tracker = new DeployerOnchain({}); const result = await tracker.enrich(null); assert.equal(result.available, false); });
