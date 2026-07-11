const weiToEth = (value) => Number(BigInt(value || "0")) / 1e18;
const tokenAmount = (value, decimals = 18) => Number(BigInt(value || "0")) / (10 ** Number(decimals || 0));

export class DeployerOnchain {
  constructor(config) { this.config = config; this.cache = new Map(); }
  async rpc(method, params) {
    const response = await fetch(this.config.robinhoodRpcUrl, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ jsonrpc: "2.0", id: 1, method, params }), signal: AbortSignal.timeout(10_000) });
    if (!response.ok) throw new Error(`Robinhood RPC HTTP ${response.status}`);
    const body = await response.json(); if (body.error) throw new Error(body.error.message); return body.result;
  }
  async explorer(params) {
    const url = new URL("/api", this.config.robinhoodExplorerUrl); Object.entries(params).forEach(([key, value]) => url.searchParams.set(key, value));
    const response = await fetch(url, { signal: AbortSignal.timeout(12_000) }); if (!response.ok) throw new Error(`Blockscout HTTP ${response.status}`); const body = await response.json(); return Array.isArray(body.result) ? body.result : [];
  }
  async enrich(address) {
    if (!/^0x[a-fA-F0-9]{40}$/.test(address ?? "")) return { available: false, reason: "deployer unavailable" };
    const key = address.toLowerCase(); const cached = this.cache.get(key); if (cached && Date.now() - cached.at < this.config.deployerCacheMs) return cached.value;
    const results = await Promise.allSettled([
      this.rpc("eth_getBalance", [address, "latest"]), this.rpc("eth_getCode", [address, "latest"]),
      this.explorer({ module: "account", action: "txlist", address, page: "1", offset: "25", sort: "asc" }),
      this.explorer({ module: "account", action: "tokenlist", address })
    ]);
    const valueAt = (index, fallback) => results[index].status === "fulfilled" ? results[index].value : fallback;
    const balanceHex = valueAt(0, null); const code = valueAt(1, null); const transactions = valueAt(2, []); const tokenList = valueAt(3, []);
    const incoming = transactions.find((tx) => tx.to?.toLowerCase() === key && tx.from?.toLowerCase() !== key && BigInt(tx.value || "0") > 0n);
    const tokens = tokenList.map((token) => ({ symbol: token.symbol || token.name || "TOKEN", address: token.contractAddress, amount: tokenAmount(token.balance, token.decimals) })).filter((token) => token.amount > 0).sort((a, b) => b.amount - a.amount).slice(0, 5);
    const errors = results.flatMap((result) => result.status === "rejected" ? [result.reason?.cause?.code ?? result.reason?.message ?? "provider failed"] : []);
    const value = { available: results.some((result) => result.status === "fulfilled"), partial: errors.length > 0, errors, address, nativeBalanceEth: balanceHex ? weiToEth(balanceHex) : null, isContract: code == null ? null : code !== "0x", transactionCount: transactions.length, funding: incoming ? { from: incoming.from, amountEth: weiToEth(incoming.value), txHash: incoming.hash, timestamp: incoming.timeStamp ? new Date(Number(incoming.timeStamp) * 1000).toISOString() : null } : null, tokens };
    this.cache.set(key, { at: Date.now(), value }); return value;
  }
}
