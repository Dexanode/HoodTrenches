import test from "node:test";
import assert from "node:assert/strict";
import { HoodTrenchesBot } from "../src/core/bot.js";

function bot(minAlphaScore = 45) { return new HoodTrenchesBot({ minAlphaScore }, {}, { error() {} }); }
function event(score, social = {}, walletHits = []) { return { analysis: { score, walletHits }, social: { available: false, engagementPerView: 0, velocityPerMinute: 0, ...social } }; }

test("does not promote a listing only because GMGN smart count exists", () => { assert.equal(bot().shouldAlertImmediately({ ...event(35), smartWalletCount: 5 }), false); });
test("promotes qualified, tracked-wallet, or strong-social listings", () => { const subject = bot(); assert.equal(subject.shouldAlertImmediately(event(45)), true); assert.equal(subject.shouldAlertImmediately(event(20, {}, [{ address: "0x1" }])), true); assert.equal(subject.shouldAlertImmediately(event(20, { available: true, engagementPerView: 4 })), true); });
