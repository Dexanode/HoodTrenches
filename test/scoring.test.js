import test from "node:test";
import assert from "node:assert/strict";
import { scoreToken } from "../src/core/scoring.js";

const token = { stage: "new_creation", liquidityUsd: 20_000, smartWalletCount: 3, relatedWallets: ["0xabc"], top10Rate: 0.2, devHoldRate: 0.05, deployer: { rugRatio: 0, rugCount: 0 }, risks: { washTrading: false, bundlerRate: 0, insiderRate: 0 } };
test("rewards social and smart-wallet confirmation", () => { const social = { available: true, engagement: 500, engagementPerView: 3, velocityPerMinute: 8 }; const result = scoreToken(token, social, [{ address: "0xAbC", label: "alpha" }]); assert.ok(result.score >= 70); assert.equal(result.walletHits.length, 1); });
test("penalizes deployer and manipulation risks", () => { const risky = { ...token, deployer: { rugRatio: 0.8, rugCount: 4 }, risks: { washTrading: true, bundlerRate: 0.6, insiderRate: 0.5 } }; const result = scoreToken(risky, { available: false }, []); assert.ok(result.score < 30); assert.ok(result.risks.length >= 4); });
