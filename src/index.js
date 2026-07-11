import { loadConfig } from "./core/config.js";
import { createLogger } from "./core/logger.js";
import { Store } from "./core/store.js";
import { HoodTrenchesBot } from "./core/bot.js";
import { TelegramController } from "./adapters/telegram.js";

const config = loadConfig(); const logger = createLogger("hoodtrenches"); const store = new Store();
const bot = new HoodTrenchesBot(config, store, logger); const telegram = new TelegramController(config, bot, store, logger);
telegram.start(); await bot.start();
const shutdown = () => { telegram.stop(); bot.stop(); process.exit(0); };
process.on("SIGINT", shutdown); process.on("SIGTERM", shutdown);
