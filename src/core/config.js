import { existsSync, readFileSync } from "node:fs";

function parseEnv(path = ".env") {
  if (!existsSync(path)) return {};
  return Object.fromEntries(readFileSync(path, "utf8").split(/\r?\n/).flatMap((line) => {
    const value = line.trim();
    if (!value || value.startsWith("#") || !value.includes("=")) return [];
    const at = value.indexOf("=");
    return [[value.slice(0, at).trim(), value.slice(at + 1).trim().replace(/^["']|["']$/g, "")]];
  }));
}

const fileEnv = parseEnv();
const get = (name, fallback = "") => process.env[name] ?? fileEnv[name] ?? fallback;
const number = (name, fallback) => Number.isFinite(Number(get(name))) ? Number(get(name)) : fallback;

export function loadConfig() {
  return Object.freeze({
    gmgnApiKey: get("GMGN_API_KEY"),
    gmgnCliPath: get("GMGN_CLI_PATH", "node_modules/.bin/gmgn-cli"),
    gmgnPollIntervalMs: number("GMGN_POLL_INTERVAL_MS", 15_000),
    gmgnTrenchesLimit: number("GMGN_TRENCHES_LIMIT", 80),
    twitterPollIntervalMs: number("TWITTER_POLL_INTERVAL_MS", 5 * 60_000),
    robinhoodRpcUrl: get("ROBINHOOD_RPC_URL", "https://rpc.mainnet.chain.robinhood.com"),
    robinhoodExplorerUrl: get("ROBINHOOD_EXPLORER_URL", "https://robinhoodchain.blockscout.com"),
    deployerCacheMs: number("DEPLOYER_CACHE_MS", 5 * 60_000),
    alertCooldownMs: number("ALERT_COOLDOWN_MS", 30 * 60_000),
    minAlphaScore: number("MIN_ALPHA_SCORE", 45),
    minLiquidityUsd: number("MIN_LIQUIDITY_USD", 0),
    newListingBatchIntervalMs: number("NEW_LISTING_BATCH_INTERVAL_MS", 120_000),
    newListingBatchLimit: number("NEW_LISTING_BATCH_LIMIT", 5),
    pollIntervalMs: number("POLL_INTERVAL_MS", 5_000),
    telegramBotToken: get("TELEGRAM_BOT_TOKEN"),
    telegramChatId: get("TELEGRAM_CHAT_ID"),
    telegramAdminIds: get("TELEGRAM_ADMIN_IDS").split(",").map((id) => id.trim()).filter(Boolean)
  });
}
