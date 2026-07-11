const clamp = (value) => Math.max(0, Math.min(100, Math.round(value)));
const percent = (value) => Number(value ?? 0) <= 1 ? Number(value ?? 0) * 100 : Number(value ?? 0);

export function scoreToken(token, social, trackedWallets = []) {
  let score = 20; const positives = []; const risks = [];
  if (token.stage === "new_creation") { score += 10; positives.push("early deploy"); }
  else if (token.stage === "near_completion") { score += 7; positives.push("near completion"); }
  if (token.liquidityUsd > 0) { score += Math.min(12, Math.log10(token.liquidityUsd + 1) * 2); positives.push("liquidity present"); }
  if (token.smartWalletCount >= 2) { score += Math.min(15, token.smartWalletCount * 3); positives.push(`${token.smartWalletCount} GMGN smart wallets`); }
  const related = new Set(token.relatedWallets.map((x) => x.toLowerCase()));
  const walletHits = trackedWallets.filter((wallet) => related.has(wallet.address.toLowerCase()));
  if (walletHits.length) { score += Math.min(20, walletHits.length * 10); positives.push(`${walletHits.length} tracked wallet match`); }
  if (social.available) {
    score += Math.min(12, Math.log10(social.engagement + 1) * 3);
    score += Math.min(10, social.engagementPerView * 2);
    score += Math.min(10, social.velocityPerMinute);
    positives.push("direct X narrative");
  } else risks.push("no direct X post");
  if (token.deployer.rugRatio > 0.3 || token.deployer.rugCount >= 2) { score -= 30; risks.push("risky deployer history"); }
  if (token.risks.washTrading) { score -= 25; risks.push("wash trading"); }
  if (percent(token.risks.bundlerRate) > 30) { score -= 18; risks.push("high bundler rate"); }
  if (percent(token.risks.insiderRate) > 30) { score -= 18; risks.push("high insider rate"); }
  if (percent(token.top10Rate) > 45) { score -= 15; risks.push("concentrated top holders"); }
  if (percent(token.devHoldRate) > 18) { score -= 15; risks.push("high deployer holding"); }
  return { score: clamp(score), positives, risks, walletHits };
}
