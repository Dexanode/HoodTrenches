import test from "node:test";
import assert from "node:assert/strict";
import { TelegramController } from "../src/adapters/telegram.js";

test("does not overlap Telegram getUpdates polling", async () => {
  const controller = new TelegramController({}, {}, {}, { warn() {} });
  let active = 0;
  let maximum = 0;
  controller.poll = async () => {
    active += 1;
    maximum = Math.max(maximum, active);
    await new Promise((resolve) => setTimeout(resolve, 20));
    active -= 1;
  };
  await Promise.all([controller.pollOnce(), controller.pollOnce(), controller.pollOnce()]);
  assert.equal(maximum, 1);
});
