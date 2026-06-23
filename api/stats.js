// Vercel serverless function — returns Cooper Flagg's current season averages from BALLDONTLIE.
// The page calls /api/stats and feeds these into the "By the Numbers" reel.
//
// Setup: add your free BALLDONTLIE key as a Vercel env var named  BALLDONTLIE_API_KEY
//   (Vercel → Project → Settings → Environment Variables), then redeploy.
// Without a key it simply returns the known final numbers, so the site never breaks.

const API = 'https://api.balldontlie.io/v1';
const PLAYER_NAME = 'Cooper Flagg';

// NBA season is labelled by its start year (2025 = the 2025-26 season).
// Auto-advance: once October hits, roll to the new season; otherwise use the last one.
function currentSeason() {
  if (process.env.STATS_SEASON) return Number(process.env.STATS_SEASON);
  const now = new Date();
  return now.getMonth() >= 9 ? now.getFullYear() : now.getFullYear() - 1;
}

// Correct final 2025-26 numbers — used if the API is unavailable so nothing ever shows blank.
const FALLBACK = { ok: true, source: 'fallback', ppg: 21.0, rpg: 6.7, apg: 4.5, games: 70 };

const round1 = v => (typeof v === 'number' ? Math.round(v * 10) / 10 : v);

export default async function handler(req, res) {
  // Cache at Vercel's edge for 6h, serve stale up to a day while refreshing.
  res.setHeader('Cache-Control', 's-maxage=21600, stale-while-revalidate=86400');

  const KEY = process.env.BALLDONTLIE_API_KEY;
  if (!KEY) return res.status(200).json(FALLBACK);

  const season = currentSeason();
  const headers = { Authorization: KEY };

  try {
    // 1) Resolve the player id by name.
    const pRes = await fetch(`${API}/players?search=Flagg&per_page=100`, { headers });
    const pJson = await pRes.json();
    const player = (pJson.data || []).find(
      p => `${p.first_name} ${p.last_name}`.toLowerCase() === PLAYER_NAME.toLowerCase()
    );
    if (!player) return res.status(200).json({ ...FALLBACK, note: 'player-not-found' });

    // 2) Pull season averages for that player.
    const sRes = await fetch(`${API}/season_averages?season=${season}&player_ids[]=${player.id}`, { headers });
    const sJson = await sRes.json();
    const a = (sJson.data || [])[0];
    if (!a || !a.games_played) return res.status(200).json({ ...FALLBACK, note: 'no-averages-yet', season });

    return res.status(200).json({
      ok: true,
      source: 'balldontlie',
      season,
      ppg: round1(a.pts),
      rpg: round1(a.reb),
      apg: round1(a.ast),
      games: a.games_played,
      fgPct: a.fg_pct != null ? round1(a.fg_pct * 100) : null,
    });
  } catch (e) {
    return res.status(200).json({ ...FALLBACK, note: 'fetch-error' });
  }
}
