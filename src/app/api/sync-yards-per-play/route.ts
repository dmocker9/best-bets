import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

/**
 * GET /api/sync-yards-per-play
 *
 * Scrapes TeamRankings Yards per Play and upserts into Supabase.
 * Excludes the 2024 column as requested.
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

		const sourceUrl = 'https://www.teamrankings.com/nfl/stat/yards-per-play';
		const res = await fetch(sourceUrl, {
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

		// Attempt to locate the main stats table
		// TeamRankings typically uses .tr-table or a table with headings like "Team" and the current year
		let rows: any[] = [];
		$('table').each((_, table) => {
			const $table = $(table);
			const headerTexts = $table.find('thead th').map((__, th) => $(th).text().trim()).get();
			const hasTeam = headerTexts.some(t => /team/i.test(t));
			const hasYPP = headerTexts.some(t => /yards per play|ypp|2025|this season/i.test(t));
			if (hasTeam && hasYPP) {
				$table.find('tbody tr').each((__, tr) => {
					const cells = $(tr).find('td').map((___, td) => $(td).text().trim()).get();
					if (cells.length >= 2) {
						rows.push({ headerTexts, cells });
					}
				});
			}
		});

		if (rows.length === 0) {
			throw new Error('Could not find Yards per Play table on page');
		}

		// Normalize headers: identify indices
		// Expected headers commonly include: Rank, Team, <CurrentYear>, Last 3, Last 1, Home, Away, 2023, 2024, etc.
		// We will explicitly EXCLUDE the '2024' column when mapping; we only store: rank, team, season, current season YPP, last_3, last_1, home, away.
		const header = rows[0].headerTexts.map((h: string) => h.toLowerCase());

		const idxRank = header.findIndex((h: string) => h === 'rank' || /rank/i.test(h));
		const idxTeam = header.findIndex((h: string) => h === 'team' || /team/i.test(h));
		// For current season column, prefer matching the season (string) or 'yards per play' / 'this season'
		let idxSeasonCol = header.findIndex((h: string) => h.includes(`${season}`) || /yards per play|this season/i.test(h));
		if (idxSeasonCol === -1) {
			// Fallback to the first numeric-like column after Team
			idxSeasonCol = Math.max(idxTeam + 1, 0);
		}
		const idxLast3 = header.findIndex((h: string) => /last 3/i.test(h));
		const idxLast1 = header.findIndex((h: string) => /last 1/i.test(h));
		const idxHome = header.findIndex((h: string) => /^home$/i.test(h));
		const idxAway = header.findIndex((h: string) => /^away$/i.test(h));
		const idx2024 = header.findIndex((h: string) => h.includes('2024'));

		const toNumber = (s: string | undefined) => {
			if (!s) return null;
			const n = parseFloat(s.replace(/[^\d.-]/g, ''));
			return isNaN(n) ? null : n;
		};

		// Map rows to upserts
		const upserts = rows.map(({ cells }) => {
			const teamName = cells[idxTeam] || '';
			return {
				team_name: teamName,
				season,
				rank: idxRank >= 0 ? toNumber(cells[idxRank]) : null,
				yards_per_play: idxSeasonCol >= 0 ? toNumber(cells[idxSeasonCol]) : null,
				last_3: idxLast3 >= 0 ? toNumber(cells[idxLast3]) : null,
				last_1: idxLast1 >= 0 ? toNumber(cells[idxLast1]) : null,
				home: idxHome >= 0 ? toNumber(cells[idxHome]) : null,
				away: idxAway >= 0 ? toNumber(cells[idxAway]) : null,
				// Explicitly ignore 2024: we do not store it at all
				source_url: 'https://www.teamrankings.com/nfl/stat/yards-per-play',
			};
		}).filter(r => r.team_name);

		// Upsert into Supabase
		const { data, error } = await supabase
			.from('yards_per_play')
			.upsert(upserts, { onConflict: 'team_name,season' })
			.select();

		if (error) {
			throw error;
		}

		return NextResponse.json({
			success: true,
			count: data?.length || 0,
			season,
			excluded_columns: idx2024 >= 0 ? ['2024'] : [],
			message: `Upserted ${data?.length || 0} rows for season ${season} (excluded: 2024 column).`,
		}, { status: 200 });
	} catch (error) {
		return NextResponse.json({
			success: false,
			message: error instanceof Error ? error.message : 'Unknown error',
		}, { status: 500 });
	}
}


