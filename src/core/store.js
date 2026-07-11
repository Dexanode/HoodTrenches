import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname } from "node:path";

const initial = { status: "idle", events: [], smartWallets: [], socialSnapshots: {}, logs: [] };

export class Store {
  constructor(path = "data/state.json") {
    this.path = path;
    mkdirSync(dirname(path), { recursive: true });
    try {
      const loaded = existsSync(path) ? JSON.parse(readFileSync(path, "utf8")) : {};
      this.state = {
        status: loaded.status ?? initial.status,
        events: Array.isArray(loaded.events) ? loaded.events.filter((event) => event?.rawSource === "gmgn").slice(0, 500) : [],
        smartWallets: Array.isArray(loaded.smartWallets) ? loaded.smartWallets : [],
        socialSnapshots: loaded.socialSnapshots && typeof loaded.socialSnapshots === "object" ? loaded.socialSnapshots : {},
        logs: []
      };
      for (const key of Object.keys(initial)) {
        if (this.state[key] == null) this.state[key] = structuredClone(initial[key]);
      }
    } catch { this.state = structuredClone(initial); }
  }
  save() { writeFileSync(this.path, JSON.stringify(this.state, null, 2)); }
  setStatus(status) { this.state.status = status; this.save(); }
  addEvent(event) { this.state.events.unshift(event); this.state.events = this.state.events.slice(0, 500); this.save(); }
  addLog(level, message, meta = {}) { this.state.logs.unshift({ ts: new Date().toISOString(), level, message, ...meta }); this.state.logs = this.state.logs.slice(0, 300); this.save(); }
  socialHistory(tweetId) { return this.state.socialSnapshots[tweetId] ?? []; }
  addSocialSnapshot(tweetId, snapshot) { const history = this.socialHistory(tweetId); history.push(snapshot); this.state.socialSnapshots[tweetId] = history.slice(-48); this.save(); }
  addSmartWallet(address, label = "smart") { const normalized = address.toLowerCase(); if (this.state.smartWallets.some((w) => w.address.toLowerCase() === normalized)) return false; this.state.smartWallets.push({ address, label, addedAt: new Date().toISOString() }); this.save(); return true; }
  removeSmartWallet(address) { const before = this.state.smartWallets.length; this.state.smartWallets = this.state.smartWallets.filter((w) => w.address.toLowerCase() !== address.toLowerCase()); this.save(); return before !== this.state.smartWallets.length; }
  snapshot() { return structuredClone(this.state); }
}
