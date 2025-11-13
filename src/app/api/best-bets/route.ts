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

		// Fetch ALL predictions for the week (including those with recommended_bet='none')
		// This allows us to rank by quality and show top 5 even if fewer meet strict criteria
		const { createClient } = await import('@supabase/supabase-js');
		const supabase = createClient(
			process.env.NEXT_PUBLIC_SUPABASE_URL!,
			process.env.SUPABASE_SERVICE_ROLE_KEY!
		);
		
		let query = supabase
			.from('spread_predictions')
			.select(`
				*,
				odds_bets:game_id (
					home_team,
					away_team,
					home_spread,
					away_spread,
					home_price,
					away_price,
					commence_time
				)
			`)
			.gte('value_score', 1.3); // Only show picks with 1.3+ edge
		
		if (week) query = query.eq('week_number', week);
		if (season) query = query.eq('season', season);
		
		const { data: allPredictions, error: fetchError } = await query;
		
		let predictions: any[] = [];
		
		if (fetchError) {
			console.error('Error fetching predictions:', fetchError);
			predictions = [];
		} else {
			// Sort by confidence, but boost picks with exceptional edge (4.0+)
			predictions = (allPredictions || [])
				.map((p: any) => ({
					...p,
					quality_score: (p.confidence_score || 0) * (Math.min(p.value_score || 0, 7.5)),
					// Boost score for exceptional edge plays
					sort_score: p.value_score >= 4.0 ? (p.confidence_score + 10) : p.confidence_score
				}))
				.sort((a: any, b: any) => b.sort_score - a.sort_score)
				.slice(0, limit);
		}

		// Auto-fallback: if empty AND week provided, generate then retry once
		if ((!predictions || predictions.length === 0) && typeof week === 'number') {
			console.log('No predictions found. Triggering auto-generation fallback...');
			await generateAndSavePredictions(week, season ?? new Date().getFullYear());
			// Re-query (will apply the same filters as above)
			predictions = await getBestBetsFromDatabase(limit, week, season);
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
			let betStrength = 'value'; // value, good, strong
			
			// Determine bet strength based on confidence and edge
			if (pred.confidence_score >= 75 && pred.value_score >= 3.5) {
				betStrength = 'strong';
			} else if (pred.confidence_score >= 65 && pred.value_score >= 2.5) {
				betStrength = 'good';
			}
			
			// Format the bet recommendation based on type
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
			} else {
				// For 'none' bets with good edge - determine value side
				// If model predicts smaller margin than Vegas, value is on underdog
				const modelMargin = parseFloat(pred.predicted_spread || 0);
				const vegasHomeSpread = parseFloat(game?.home_spread || 0);
				
				// If model thinks it's closer than Vegas, take the underdog
				if (Math.abs(modelMargin) < Math.abs(vegasHomeSpread)) {
					// Value on underdog
					if (vegasHomeSpread > 0) {
						// Home is underdog
						formattedBet = `${game?.home_team} ${game?.home_spread}`;
						currentSpread = game?.home_spread;
					} else {
						// Away is underdog
						formattedBet = `${game?.away_team} ${game?.away_spread}`;
						currentSpread = game?.away_spread;
					}
				} else {
					// Value on favorite (model predicts bigger margin)
					formattedBet = `${pred.predicted_winner} ${pred.predicted_winner === game?.home_team ? game?.home_spread : game?.away_spread}`;
					currentSpread = pred.predicted_winner === game?.home_team ? game?.home_spread : game?.away_spread;
				}
				betStrength = 'value';
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
				bet_strength: betStrength, // strong, good, value, insight
				reasoning: pred.reasoning,
				week_number: pred.week_number,
				season: pred.season,
				created_at: pred.created_at,
				quality_score: (pred.confidence_score || 0) * (Math.min(pred.value_score || 0, 7.5)),
				// Include full team stats for detailed analysis
				home_stats: homeStats,
				away_stats: awayStats,
			};
		}));

		const response: BestBetsResponse = {
			success: true,
			message: predictions.length > 0 
				? `Found ${predictions.length} ${typeParam === 'spreads' ? 'spread' : ''} bet${predictions.length > 1 ? 's' : ''} with betting value`
				: (typeof week === 'number' 
					? 'No bets meet our criteria this week. The model is conservative and only recommends high-value plays.' 
					: 'No predictions available. Provide week param to auto-generate.'),
			predictions: formattedPredictions,
			analyzed: predictions.length,
			recommendations: predictions.length,
			generated_at: new Date().toISOString(),
		};

		return NextResponse.json(response, {
			status: 200,
			headers: {
				'Cache-Control': 'no-cache, no-store, must-revalidate',
				'Pragma': 'no-cache',
				'Expires': '0'
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

