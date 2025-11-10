import { NextResponse } from 'next/server';
import { getBestBetsFromDatabase, generateAndSavePredictions } from '@/lib/predictGames';
import { getTeamStats } from '@/lib/fetchNFLStats';

export const dynamic = 'force-dynamic';

interface BestBetsResponse {
	success: boolean;
	message: string;
	predictions: any[];
	analyzed: number;
	recommendations: number;
	generated_at: string;
}

/**
 * GET /api/best-bets
 * 
 * Returns the top recommended bets from stored predictions
 * Now reads from the predictions table for instant results!
 * 
 * Query params:
 *   - limit: number of bets to return (default: 5, max: 20)
 *   - week: filter by week number (optional)
 *   - season: filter by season (optional)
 *   - type: optional filter ("spreads") to only return spread picks
 * 
 * @example
 * GET /api/best-bets?limit=10
 * GET /api/best-bets?limit=5&week=9&season=2025
 * GET /api/best-bets?type=spreads
 */
export async function GET(request: Request) {
	try {
		const { searchParams } = new URL(request.url);
		const limitParam = searchParams.get('limit');
		const weekParam = searchParams.get('week');
		const seasonParam = searchParams.get('season');
		const typeParam = searchParams.get('type');
		
		const limit = Math.min(parseInt(limitParam || '5'), 20);
		const week = weekParam ? parseInt(weekParam) : undefined;
		const season = seasonParam ? parseInt(seasonParam) : undefined;

		console.log(`\n${'='.repeat(60)}`);
		console.log(`🎯 BEST BETS REQUEST - Top ${limit} picks`);
		if (week) console.log(`   Week: ${week}`);
		if (season) console.log(`   Season: ${season}`);
		if (typeParam) console.log(`   Type: ${typeParam}`);
		console.log(`${'='.repeat(60)}\n`);

		// Initial fetch
		let predictions = await getBestBetsFromDatabase(limit, week, season);

		// Optional filter: spreads only
		if (typeParam === 'spreads') {
			predictions = (predictions || []).filter((p: any) => p?.recommended_bet === 'home_spread' || p?.recommended_bet === 'away_spread');
		}

		// Auto-fallback: if empty AND week provided, generate then retry once
		if ((!predictions || predictions.length === 0) && typeof week === 'number') {
			console.log('No predictions found. Triggering auto-generation fallback...');
			await generateAndSavePredictions(week, season ?? new Date().getFullYear());
			// Re-query
			predictions = await getBestBetsFromDatabase(limit, week, season);
			if (typeParam === 'spreads') {
				predictions = (predictions || []).filter((p: any) => p?.recommended_bet === 'home_spread' || p?.recommended_bet === 'away_spread');
			}
		}

		console.log(`\n✅ Retrieved from database:`);
		console.log(`   Found ${predictions.length} recommended bets\n`);

		// Format predictions for response with team stats
		const formattedPredictions = await Promise.all(predictions.map(async (pred: any) => {
			const game = pred.odds_bets;
			
			// Fetch team stats for detailed analysis
			const homeStats = await getTeamStats(game?.home_team);
			const awayStats = await getTeamStats(game?.away_team);
			
			// Format the recommended bet to show team name and spread
			let formattedBet = pred.recommended_bet;
			let currentSpread = game?.home_spread;
			
			if (pred.recommended_bet === 'home_spread') {
				formattedBet = `${game?.home_team} ${game?.home_spread}`;
				currentSpread = game?.home_spread;
			} else if (pred.recommended_bet === 'away_spread') {
				formattedBet = `${game?.away_team} ${game?.away_spread}`;
				currentSpread = game?.away_spread;
			} else if (pred.recommended_bet === 'home_ml') {
				formattedBet = `${game?.home_team} Moneyline (${game?.home_price})`;
				currentSpread = game?.home_spread;
			} else if (pred.recommended_bet === 'away_ml') {
				formattedBet = `${game?.away_team} Moneyline (${game?.away_price})`;
				currentSpread = game?.away_spread;
			}
			
			return {
				game_id: pred.game_id,
				home_team: game?.home_team,
				away_team: game?.away_team,
				commence_time: game?.commence_time,
				predicted_winner: pred.predicted_winner,
				confidence_score: pred.confidence_score,
				predicted_margin: pred.predicted_spread,
				home_team_strength: pred.home_team_strength,
				away_team_strength: pred.away_team_strength,
				current_spread: currentSpread,
				home_moneyline: game?.home_price,
				away_moneyline: game?.away_price,
				value_score: pred.value_score,
				recommended_bet: formattedBet,
				bet_type: pred.recommended_bet,
				reasoning: pred.reasoning,
				week_number: pred.week_number,
				season: pred.season,
				created_at: pred.created_at,
				// Include full team stats for detailed analysis
				home_stats: homeStats,
				away_stats: awayStats,
			};
		}));

		const response: BestBetsResponse = {
			success: true,
			message: predictions.length > 0 
				? `Found ${predictions.length} recommended bet${predictions.length > 1 ? 's' : ''}`
				: (typeof week === 'number' 
					? 'No predictions available after generation.' 
					: 'No predictions available. Provide week param to auto-generate.'),
			predictions: formattedPredictions,
			analyzed: predictions.length,
			recommendations: predictions.length,
			generated_at: new Date().toISOString(),
		};

		return NextResponse.json(response, {
			status: 200,
			headers: {
				'Cache-Control': 'public, s-maxage=60, stale-while-revalidate=300',
			},
		});
	} catch (error) {
		console.error('Best bets endpoint error:', error);
		
		return NextResponse.json(
			{
				success: false,
				message: 'Internal server error',
				error: error instanceof Error ? error.message : 'Unknown error',
				predictions: [],
				analyzed: 0,
				recommendations: 0,
				generated_at: new Date().toISOString(),
			},
			{ status: 500 }
		);
	}
}

/**
 * POST /api/best-bets
 * 
 * Alternative method to get best bets
 */
export async function POST(request: Request) {
	return GET(request);
}

