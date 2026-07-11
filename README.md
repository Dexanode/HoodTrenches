# HoodTrenches

Robinhood Chain intelligence bot. It watches GMGN Trenches, enriches direct token tweets through FxTwitter, computes deterministic social/deployer/risk signals, and sends alerts to a private Telegram group. Qualified, tracked-wallet, or strong-social listings are sent immediately; other `new_creation` listings are summarized in a periodic top-five digest. It does not trade and does not use an LLM.

## Pipeline

```text
GMGN Robinhood Trenches
  -> token, deployer, holder and smart-money fields
  -> direct X /status/<tweet_id> URL
  -> api.fxtwitter.com tweet + engagement
  -> time-series engagement velocity
  -> deterministic 0-100 alpha score
  -> Telegram alert
```

## Setup

1. Copy `.env.example` to `.env` and fill GMGN plus Telegram credentials.
2. Run `npm install`.
3. Run `npm start`.

Keep `GMGN_CLI_PATH=node_modules/.bin/gmgn-cli` in production. HoodTrenches pins a CLI release that supports the `robinhood` chain; an older globally installed `gmgn-cli` may reject it.

## Production with PM2

The tracker is a continuous process, not a scheduled cron task. PM2 keeps it alive and restores it after a crash or VPS reboot.

```bash
npm install
npm install -g pm2
pm2 start ecosystem.config.cjs
pm2 save
pm2 startup
```

Run the command printed by `pm2 startup`, then run `pm2 save` once more. Useful commands:

```bash
pm2 status
pm2 logs hoodtrenches
pm2 restart hoodtrenches --update-env
pm2 stop hoodtrenches
```

If Telegram reports `terminated by other getUpdates request`, another process is using the same bot token. Keep exactly one HoodTrenches process:

```bash
pm2 delete hoodtrenches
pm2 start ecosystem.config.cjs
pm2 save
```

Telegram commands: `/status`, `/wallets`, `/addwallet 0x... label`, `/delwallet 0x...`, `/pause`, `/resume`.

Tracked wallet matches currently use wallet addresses present in GMGN token payloads. Full real-time transfer monitoring requires a Robinhood Chain RPC/indexer and is intentionally not inferred.

State and the latest 48 social snapshots per tweet are stored in `data/state.json`.

Deployer enrichment reads Robinhood Chain mainnet (chain ID 4663) through JSON-RPC and the official Blockscout explorer. It reports native ETH balance, earliest indexed inbound funding, wallet/contract status, and up to five token holdings. Public endpoints are rate-limited; configure an Alchemy Robinhood RPC URL for production reliability.
