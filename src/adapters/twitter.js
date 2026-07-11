function tweetId(url) { return url?.match(/\/status\/(\d+)/)?.[1] ?? null; }
const num = (...values) => { const value = values.find((x) => x !== undefined && x !== null); return Number(value ?? 0) || 0; };

export class TwitterNarrative {
  constructor(config, store) { this.config = config; this.store = store; this.cache = new Map(); }
  async enrich(token) {
    const id = tweetId(token.twitterUrl); if (!id) return { available: false, reason: "no direct tweet URL" };
    const cached = this.cache.get(id); if (cached && Date.now() - cached.at < this.config.twitterPollIntervalMs) return cached.value;
    const response = await fetch(`https://api.fxtwitter.com/status/${id}`, { signal: AbortSignal.timeout(10_000) });
    if (!response.ok) throw new Error(`FxTwitter HTTP ${response.status}`);
    const body = await response.json(); const tweet = body.tweet ?? body;
    const author = tweet.author ?? {};
    const metrics = { likes: num(tweet.likes, tweet.favorite_count), reposts: num(tweet.retweets, tweet.reposts), replies: num(tweet.replies), quotes: num(tweet.quotes), views: num(tweet.views), followers: num(author.followers, author.followers_count) };
    const engagement = metrics.likes + metrics.reposts * 2 + metrics.quotes * 2 + metrics.replies;
    const history = this.store.socialHistory(id); const previous = history.at(-1);
    const elapsedMinutes = previous ? Math.max(1 / 60, (Date.now() - new Date(previous.at).getTime()) / 60_000) : 0;
    const velocityPerMinute = previous ? Math.max(0, engagement - previous.engagement) / elapsedMinutes : 0;
    const value = { available: true, tweetId: id, url: token.twitterUrl, text: tweet.text ?? "", author: { name: author.name ?? "", screenName: author.screen_name ?? author.username ?? "", verified: Boolean(author.verified), followers: metrics.followers }, metrics, engagement, engagementPerView: metrics.views ? engagement / metrics.views * 100 : 0, engagementPerFollower: metrics.followers ? engagement / metrics.followers * 100 : 0, velocityPerMinute };
    this.store.addSocialSnapshot(id, { at: new Date().toISOString(), engagement, ...metrics }); this.cache.set(id, { at: Date.now(), value }); return value;
  }
}
