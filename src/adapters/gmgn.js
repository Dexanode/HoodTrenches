import { execFile } from "node:child_process";

function run(command, args, env) {
  return new Promise((resolve, reject) => execFile(command, args, { env, maxBuffer: 10_000_000 }, (error, stdout, stderr) => {
    if (error) return reject(Object.assign(error, { stderr }));
    try { resolve(JSON.parse(stdout)); } catch { reject(new Error("GMGN returned invalid JSON")); }
  }));
}
const num = (value, fallback = 0) => Number.isFinite(Number(value)) ? Number(value) : fallback;
const first = (object, keys) => keys.map((key) => object?.[key]).find((value) => value !== undefined && value !== null && value !== "");

function extractTweetUrl(token) {
  const values = [];
  const visit = (value, depth = 0) => {
    if (depth > 3 || value == null) return;
    if (typeof value === "string") values.push(value);
    else if (Array.isArray(value)) value.forEach((item) => visit(item, depth + 1));
    else if (typeof value === "object") Object.entries(value).forEach(([key, item]) => {
      if (/twitter|tweet|social|link|url/i.test(key)) visit(item, depth + 1);
    });
  };
  visit(token);
  const joined = values.join(" ");
  return joined.match(/https?:\/\/(?:www\.)?(?:x|twitter)\.com\/[A-Za-z0-9_]+\/status\/\d+/i)?.[0] ?? null;
}

function lists(payload) {
  const data = payload?.data ?? payload;
  return [
    ...(data?.new_creation ?? []).map((x) => ({ ...x, stage: "new_creation" })),
    ...(data?.pump ?? data?.near_completion ?? []).map((x) => ({ ...x, stage: "near_completion" })),
    ...(data?.completed ?? []).map((x) => ({ ...x, stage: "completed" }))
  ];
}

export function normalizeToken(token) {
  const address = first(token, ["address", "token_address", "mint"]);
  if (!address) return null;
  const deployerAddress = first(token, ["creator_address", "creator", "deployer", "deployer_address", "owner_address"]);
  const relatedWallets = [deployerAddress, ...(token.wallets ?? []), ...(token.smart_wallets ?? [])].filter(Boolean).map(String);
  return {
    id: `${address}:${token.stage ?? "unknown"}`,
    address: String(address), symbol: token.symbol ?? "UNKNOWN", name: token.name ?? token.symbol ?? "Unknown",
    description: token.description ?? "", stage: token.stage ?? "unknown", progress: num(token.progress ?? token.bonding_curve_progress),
    launchpad: first(token, ["launchpad_platform", "launchpad", "platform", "exchange"]) ?? "unknown",
    priceUsd: num(token.price), marketCapUsd: num(token.market_cap ?? token.marketcap ?? token.mc), liquidityUsd: num(token.liquidity),
    holderCount: num(token.holder_count), top10Rate: num(token.top_10_holder_rate ?? token.top10_holder_rate),
    devHoldRate: num(token.dev_team_hold_rate ?? token.creator_hold_rate ?? token.creator_balance_rate),
    smartWalletCount: num(first(token, ["smart_degen_count", "smart_money_count", "smart_wallet_count"])),
    relatedWallets,
    deployer: { address: deployerAddress ?? null, createdCount: num(first(token, ["creator_created_count", "creator_token_count", "created_token_count"])), rugCount: num(first(token, ["creator_rug_count", "deployer_rug_count", "rug_count"])), rugRatio: num(token.rug_ratio) },
    risks: { washTrading: Boolean(token.is_wash_trading ?? token.wash_trading), bundlerRate: num(token.bundler_rate ?? token.bundler_trader_amount_rate), insiderRate: num(token.insider_rate ?? token.rat_trader_amount_rate) },
    twitterUrl: extractTweetUrl(token), detectedAt: new Date().toISOString(), rawSource: "gmgn"
  };
}

export class GmgnTrenches {
  constructor(config) { this.config = config; this.lastPoll = 0; this.seen = new Map(); }
  async poll() {
    if (!this.config.gmgnApiKey || Date.now() - this.lastPoll < this.config.gmgnPollIntervalMs) return [];
    this.lastPoll = Date.now();
    const args = ["market", "trenches", "--chain", "robinhood", "--type", "new_creation", "--type", "near_completion", "--type", "completed", "--limit", String(this.config.gmgnTrenchesLimit), "--raw"];
    const payload = await run(this.config.gmgnCliPath, args, { ...process.env, GMGN_API_KEY: this.config.gmgnApiKey });
    return lists(payload).map(normalizeToken).filter(Boolean).filter((token) => {
      const last = this.seen.get(token.id) ?? 0; if (Date.now() - last < this.config.gmgnPollIntervalMs) return false;
      this.seen.set(token.id, Date.now()); return true;
    });
  }
}
