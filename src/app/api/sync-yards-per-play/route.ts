import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

/**
 * GET /api/sync-yards-per-play
 *
 * Scrapes TeamRankings Yards per Play and upserts into Supabase.
 * Excludes the 2024 column as requested.
	 * Also scrapes Plays per Game and upserts matching *_plpg columns.
 *
 * Query (optional):
 *  - season: number (default: current year)
 */
export async function GET(request: Request) {
	try {
		const { searchParams } = new URL(request.url);
		const season = parseInt(searchParams.get('season') || `${new Date().getFullYear()}`);

		const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
		const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
		if (!supabaseUrl || !supabaseServiceKey) {
			throw new Error('Missing Supabase environment variables');
		}

		// Lazy import to avoid impacting cold start
		const [{ createClient }, cheerio] = await Promise.all([
			import('@supabase/supabase-js'),
			import('cheerio'),
		]);
		const supabase = createClient(supabaseUrl, supabaseServiceKey);

		const yppUrl = 'https://www.teamrankings.com/nfl/stat/yards-per-play';
		const res = await fetch(yppUrl, {
			headers: {
				'User-Agent': 'Mozilla/5.0 (compatible; BestBetsBot/1.0; +https://example.com)',
			},
			cache: 'no-store',
		});
		if (!res.ok) {
			throw new Error(`Failed to fetch page: ${res.status} ${res.statusText}`);
		}
		const html = await res.text();
		const $ = cheerio.load(html);

		// Attempt to locate the main stats table (YPP)
		// TeamRankings typically uses .tr-table or a table with headings like "Team" and the current year
		let yppRows: any[] = [];
		$('table').each((_, table) => {
			const $table = $(table);
			const headerTexts = $table.find('thead th').map((__, th) => $(th).text().trim()).get();
			const hasTeam = headerTexts.some(t => /team/i.test(t));
			const hasYPP = headerTexts.some(t => /yards per play|ypp|2025|this season/i.test(t));
			if (hasTeam && hasYPP) {
				$table.find('tbody tr').each((__, tr) => {
					const cells = $(tr).find('td').map((___, td) => $(td).text().trim()).get();
					if (cells.length >= 2) {
						yppRows.push({ headerTexts, cells });
					}
				});
			}
		});

		if (yppRows.length === 0) {
			throw new Error('Could not find Yards per Play table on page');
		}

		// Normalize headers: identify indices (YPP)
		// Expected headers commonly include: Rank, Team, <CurrentYear>, Last 3, Last 1, Home, Away, 2023, 2024, etc.
		// We will explicitly EXCLUDE the '2024' column when mapping; we only store: rank, team, season, current season YPP, last_3, last_1, home, away.
		const yppHeader = yppRows[0].headerTexts.map((h: string) => h.toLowerCase());

		const idxRank = yppHeader.findIndex((h: string) => h === 'rank' || /rank/i.test(h));
		const idxTeam = yppHeader.findIndex((h: string) => h === 'team' || /team/i.test(h));
		// For current season column, prefer matching the season (string) or 'yards per play' / 'this season'
		let idxSeasonCol = yppHeader.findIndex((h: string) => h.includes(`${season}`) || /yards per play|this season/i.test(h));
		if (idxSeasonCol === -1) {
			// Fallback to the first numeric-like column after Team
			idxSeasonCol = Math.max(idxTeam + 1, 0);
		}
		const idxLast3 = yppHeader.findIndex((h: string) => /last 3/i.test(h));
		const idxLast1 = yppHeader.findIndex((h: string) => /last 1/i.test(h));
		const idxHome = yppHeader.findIndex((h: string) => /^home$/i.test(h));
		const idxAway = yppHeader.findIndex((h: string) => /^away$/i.test(h));
		const idx2024 = yppHeader.findIndex((h: string) => h.includes('2024'));

		const toNumber = (s: string | undefined) => {
			if (!s) return null;
			const n = parseFloat(s.replace(/[^\d.-]/g, ''));
			return isNaN(n) ? null : n;
		};

		// Map YPP rows to upserts
		const yppUpserts = yppRows.map(({ cells }) => {
			const teamName = cells[idxTeam] || '';
			return {
				team_name: teamName,
				season,
				rank_ypp: idxRank >= 0 ? toNumber(cells[idxRank]) : null,
				yards_per_play_ypp: idxSeasonCol >= 0 ? toNumber(cells[idxSeasonCol]) : null,
				last_3_ypp: idxLast3 >= 0 ? toNumber(cells[idxLast3]) : null,
				last_1_ypp: idxLast1 >= 0 ? toNumber(cells[idxLast1]) : null,
				home_ypp: idxHome >= 0 ? toNumber(cells[idxHome]) : null,
				away_ypp: idxAway >= 0 ? toNumber(cells[idxAway]) : null,
				// Explicitly ignore 2024: we do not store it at all
				source_url: yppUrl,
			};
		}).filter(r => r.team_name);

		// Fetch Plays per Game page and map to *_plpg
		const plpgUrl = 'https://www.teamrankings.com/nfl/stat/plays-per-game';
		const res2 = await fetch(plpgUrl, {
			headers: {
				'User-Agent': 'Mozilla/5.0 (compatible; BestBetsBot/1.0; +https://example.com)',
			},
			cache: 'no-store',
		});
		if (!res2.ok) {
			throw new Error(`Failed to fetch plays per game page: ${res2.status} ${res2.statusText}`);
		}
		const html2 = await res2.text();
		const $2 = cheerio.load(html2);

		let plpgRows: any[] = [];
		$2('table').each((_, table) => {
			const $table = $2(table);
			const headerTexts = $table.find('thead th').map((__, th) => $2(th).text().trim()).get();
			const hasTeam = headerTexts.some(t => /team/i.test(t));
			const hasPlays = headerTexts.some(t => /plays per game|plays|this season/i.test(t.toLowerCase()));
			if (hasTeam && hasPlays) {
				$table.find('tbody tr').each((__, tr) => {
					const cells = $2(tr).find('td').map((___, td) => $2(td).text().trim()).get();
					if (cells.length >= 2) {
						plpgRows.push({ headerTexts, cells });
					}
				});
			}
		});

		if (plpgRows.length === 0) {
			throw new Error('Could not find Plays per Game table on page');
		}

		const plpgHeader = plpgRows[0].headerTexts.map((h: string) => h.toLowerCase());
		const pIdxRank = plpgHeader.findIndex((h: string) => h === 'rank' || /rank/i.test(h));
		const pIdxTeam = plpgHeader.findIndex((h: string) => h === 'team' || /team/i.test(h));
		let pIdxSeasonCol = plpgHeader.findIndex((h: string) => h.includes(`${season}`) || /plays per game|this season/i.test(h));
		if (pIdxSeasonCol === -1) pIdxSeasonCol = Math.max(pIdxTeam + 1, 0);
		const pIdxLast3 = plpgHeader.findIndex((h: string) => /last 3/i.test(h));
		const pIdxLast1 = plpgHeader.findIndex((h: string) => /last 1/i.test(h));
		const pIdxHome = plpgHeader.findIndex((h: string) => /^home$/i.test(h));
		const pIdxAway = plpgHeader.findIndex((h: string) => /^away$/i.test(h));
		// We don't store 2024 explicitly

		const plpgMap = new Map<string, any>();
		plpgRows.forEach(({ cells }) => {
			const teamName = cells[pIdxTeam] || '';
			if (!teamName) return;
			plpgMap.set(teamName, {
				rank_plpg: pIdxRank >= 0 ? toNumber(cells[pIdxRank]) : null,
				plays_per_game_plpg: pIdxSeasonCol >= 0 ? toNumber(cells[pIdxSeasonCol]) : null,
				last_3_plpg: pIdxLast3 >= 0 ? toNumber(cells[pIdxLast3]) : null,
				last_1_plpg: pIdxLast1 >= 0 ? toNumber(cells[pIdxLast1]) : null,
				home_plpg: pIdxHome >= 0 ? toNumber(cells[pIdxHome]) : null,
				away_plpg: pIdxAway >= 0 ? toNumber(cells[pIdxAway]) : null,
			});
		});

		// Merge YPP upserts with PLPG metrics by team_name
		const mergedUpserts = yppUpserts.map(row => {
			const pl = plpgMap.get(row.team_name) || {};
			return {
				...row,
				...pl,
			};
		});

		// Upsert into Supabase (merged)
		const { data, error } = await supabase
			.from('yards_per_play')
			.upsert(mergedUpserts, { onConflict: 'team_name,season' })
			.select();

		if (error) {
			throw error;
		}

		return NextResponse.json({
			success: true,
			count: data?.length || 0,
			season,
			excluded_columns: idx2024 >= 0 ? ['2024'] : [],
			message: `Upserted ${data?.length || 0} rows for season ${season} with YPP and PLPG (excluded: 2024 column).`,
		}, { status: 200 });
	} catch (error) {
		return NextResponse.json({
			success: false,
			message: error instanceof Error ? error.message : 'Unknown error',
		}, { status: 500 });
	}
}


