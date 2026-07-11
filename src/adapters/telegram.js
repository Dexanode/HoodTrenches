const esc = (value) => String(value ?? "").replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;");
const money = (value) => `$${Number(value ?? 0).toLocaleString("en-US", { maximumFractionDigits: 0 })}`;
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

export class TelegramController {
  constructor(config, bot, store, logger) { this.config = config; this.bot = bot; this.store = store; this.logger = logger; this.offset = 0; this.timer = null; this.polling = false; }
  configured() { return Boolean(this.config.telegramBotToken && this.config.telegramChatId); }
  start() { if (!this.configured()) { this.logger.warn("Telegram disabled: token or chat ID missing"); return; } this.bot.setAlertSink((event) => this.sendAlpha(event)); this.timer = setInterval(() => this.pollOnce(), 3000); this.pollOnce(); }
  stop() { if (this.timer) clearInterval(this.timer); }
  async call(method, payload) {
    let lastError;
    for (let attempt = 1; attempt <= 3; attempt += 1) {
      try {
        const response = await fetch(`https://api.telegram.org/bot${this.config.telegramBotToken}/${method}`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(payload), signal: AbortSignal.timeout(15_000) });
        const body = await response.json();
        if (!body.ok) throw Object.assign(new Error(body.description ?? `Telegram HTTP ${response.status}`), { telegramApiError: true });
        return body;
      } catch (error) {
        if (error.telegramApiError) throw error;
        lastError = error;
        if (attempt < 3) await sleep(attempt * 1000);
      }
    }
    const detail = lastError?.cause?.code ?? lastError?.cause?.message ?? lastError?.message ?? "unknown network error";
    throw new Error(`Telegram network failed after 3 attempts: ${detail}`);
  }
  send(text) { return this.call("sendMessage", { chat_id: this.config.telegramChatId, text, parse_mode: "HTML", disable_web_page_preview: true }); }
  async pollOnce() { if (this.polling) return; this.polling = true; try { await this.poll(); } catch (error) { this.logger.warn("Telegram polling failed", { error: error.message }); } finally { this.polling = false; } }
  async sendAlpha(event) {
    const s = event.social; const a = event.analysis; const narrative = s.available ? s.text.slice(0, 300) : event.description || "No direct X narrative";
    const heading = event.stage === "new_creation" ? "🆕 <b>NEW TRENCHES LISTED</b>" : "🚨 <b>HOODTRENCHES UPDATE</b>";
    const verdict = a.score >= this.config.minAlphaScore ? "✅ QUALIFIED" : a.score >= 30 ? "👀 WATCH" : "⛔ HIGH RISK";
    return this.send([heading,`<b>${esc(event.symbol)}</b> · ${esc(event.name)}`,`Launchpad: <b>${esc(event.launchpad)}</b>`,`Stage: <b>${esc(event.stage)}</b> · ${event.progress.toFixed(0)}%`,`Alpha: <b>${a.score}/100 · ${verdict}</b>`,`MC / Liquidity: ${money(event.marketCapUsd)} / ${money(event.liquidityUsd)}`,`Holders: ${event.holderCount} · Top 10: ${(Number(event.top10Rate) <= 1 ? Number(event.top10Rate) * 100 : Number(event.top10Rate)).toFixed(1)}%`,`Smart signals: ${event.smartWalletCount} GMGN · ${a.walletHits.length} tracked match`,`Deployer: <code>${esc(event.deployer.address ?? "unavailable")}</code>`,`Narrative: ${esc(narrative)}`,s.available ? `X: ${s.metrics.likes} likes · ${s.metrics.reposts} reposts · ${s.metrics.views} views · ${s.engagementPerView.toFixed(2)}% eng/view · ${s.velocityPerMinute.toFixed(1)}/min` : `X: ${esc(s.reason)}`,a.positives.length ? `Signals: ${esc(a.positives.join(" · "))}` : "Signals: none",a.risks.length ? `Risks: ${esc(a.risks.join(" · "))}` : "Risks: none in current payload",`<a href="https://gmgn.ai/robinhood/token/${encodeURIComponent(event.address)}">Open GMGN</a>`,`<code>${esc(event.address)}</code>`].join("\n"));
  }
  async poll() { const body = await this.call("getUpdates", { offset: this.offset, timeout: 1, allowed_updates: ["message"] }); for (const update of body.result ?? []) { this.offset = update.update_id + 1; const message = update.message; if (!message?.text || String(message.chat.id) !== String(this.config.telegramChatId)) continue; await this.command(message.text.trim(), String(message.from?.id ?? "")); } }
  async command(text, userId) { const [raw, address, ...label] = text.split(/\s+/); const command = raw.split("@")[0].toLowerCase(); const admin = !this.config.telegramAdminIds.length || this.config.telegramAdminIds.includes(userId); if (command === "/status") return this.send(`<b>HoodTrenches</b>\nStatus: ${this.store.snapshot().status}\nSignals: ${this.store.snapshot().events.length}\nTracked wallets: ${this.store.snapshot().smartWallets.length}`); if (command === "/wallets") return this.send(this.store.snapshot().smartWallets.map((w) => `• ${esc(w.label)} — <code>${esc(w.address)}</code>`).join("\n") || "No tracked wallets."); if (!admin) return this.send("Admin only."); if (command === "/addwallet") { if (!/^0x[a-fA-F0-9]{40}$/.test(address ?? "")) return this.send("Format: <code>/addwallet 0x... label</code>"); return this.send(this.store.addSmartWallet(address, label.join(" ") || "smart") ? "✅ Wallet added." : "Wallet already tracked."); } if (command === "/delwallet") return this.send(this.store.removeSmartWallet(address ?? "") ? "✅ Wallet removed." : "Wallet not found."); if (command === "/pause") { this.bot.pause(); return this.send("Bot paused."); } if (command === "/resume") { this.bot.resume(); return this.send("Bot resumed."); } return this.send("<b>Commands</b>\n/status\n/wallets\n/addwallet 0x... label\n/delwallet 0x...\n/pause\n/resume"); }
}
