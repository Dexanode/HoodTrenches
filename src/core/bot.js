import { GmgnTrenches } from "../adapters/gmgn.js";
import { TwitterNarrative } from "../adapters/twitter.js";
import { DeployerOnchain } from "../adapters/onchain.js";
import { scoreToken } from "./scoring.js";

export class HoodTrenchesBot {
  constructor(config, store, logger) { this.config = config; this.store = store; this.logger = logger; this.gmgn = new GmgnTrenches(config); this.twitter = new TwitterNarrative(config, store); this.onchain = new DeployerOnchain(config); this.timer = null; this.paused = false; this.alertSink = null; this.batchSink = null; this.alertedAt = new Map(); }
  setAlertSink(sink) { this.alertSink = sink; }
  setBatchSink(sink) { this.batchSink = sink; }
  shouldAlertImmediately(event) {
    const socialStrong = event.social.available && (event.social.engagementPerView >= 3 || event.social.velocityPerMinute >= 5);
    return event.analysis.score >= this.config.minAlphaScore || event.analysis.walletHits.length > 0 || socialStrong;
  }
  async start() { if (!this.config.gmgnApiKey) throw new Error("GMGN_API_KEY is required"); this.store.setStatus("running"); await this.loop(); this.timer = setInterval(() => this.loop().catch((error) => this.fail(error)), this.config.pollIntervalMs); }
  stop() { if (this.timer) clearInterval(this.timer); this.store.setStatus("stopped"); }
  pause() { this.paused = true; this.store.setStatus("paused"); }
  resume() { this.paused = false; this.store.setStatus("running"); }
  fail(error) { this.logger.error("tracker loop failed", { error: error.message }); this.store.addLog("error", "tracker loop failed", { error: error.message }); }
  async loop() {
    if (this.paused) return;
    let tokens; try { tokens = await this.gmgn.poll(); } catch (error) { this.fail(error); return; }
    for (const token of tokens) {
      let social; try { social = await this.twitter.enrich(token); } catch (error) { social = { available: false, reason: error.message }; }
      let deployerOnchain; try { deployerOnchain = await this.onchain.enrich(token.deployer.address); } catch (error) { deployerOnchain = { available: false, reason: error.message }; }
      token.deployer.onchain = deployerOnchain;
      const analysis = scoreToken(token, social, this.store.snapshot().smartWallets);
      const event = { ...token, social, analysis };
      this.store.addEvent(event);
      const last = this.alertedAt.get(token.address) ?? 0;
      const hasMinimumLiquidity = token.liquidityUsd >= this.config.minLiquidityUsd;
      const immediate = this.shouldAlertImmediately(event) && hasMinimumLiquidity;
      if (this.alertSink && immediate && Date.now() - last >= this.config.alertCooldownMs) {
        await this.alertSink(event); this.alertedAt.set(token.address, Date.now());
      } else if (token.stage === "new_creation" && this.batchSink) {
        this.batchSink(event);
      }
    }
    if (tokens.length) this.store.addLog("info", "GMGN cycle completed", { scanned: tokens.length });
  }
}
