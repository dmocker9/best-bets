import { NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";

const ODDS_API_KEY = "d38b7f712b4ef276d719082f04a4c89e";
const ODDS_API_URL = `https://api.the-odds-api.com/v4/sports/americanfootball_nfl/odds/?apiKey=${ODDS_API_KEY}&regions=us&markets=totals&oddsFormat=american`;

interface OddsOutcome {
  name: string;
  price: number;
  point: number;
}

interface OddsMarket {
  key: string;
  last_update: string;
  outcomes: OddsOutcome[];
}

interface Bookmaker {
  key: string;
  title: string;
  last_update: string;
  markets: OddsMarket[];
}

interface Game {
  id: string;
  sport_key: string;
  sport_title: string;
  commence_time: string;
  home_team: string;
  away_team: string;
  bookmakers: Bookmaker[];
}

interface TotalsOddsRecord {
  game_id: string;
  home_team: string;
  away_team: string;
  commence_time: string;
  bookmaker: string;
  over_line: number;
  over_price: number;
  under_line: number;
  under_price: number;
  last_update: string;
}

export async function GET() {
  try {
    console.log("Fetching totals odds from Odds API...");
    
    // Fetch data from the Odds API
    const response = await fetch(ODDS_API_URL);
    
    if (!response.ok) {
      throw new Error(`Odds API error: ${response.statusText}`);
    }

    const games: Game[] = await response.json();
    console.log(`Fetched ${games.length} games from Odds API`);

    // Prepare data for insertion (DraftKings only)
    const totalsOddsData: TotalsOddsRecord[] = [];

    games.forEach((game) => {
      // Filter for DraftKings bookmaker only
      const draftkings = game.bookmakers.find(b => b.key === "draftkings");
      
      if (draftkings) {
        const totalsMarket = draftkings.markets.find(m => m.key === "totals");
        
        if (totalsMarket) {
          const overOutcome = totalsMarket.outcomes.find(o => o.name === "Over");
          const underOutcome = totalsMarket.outcomes.find(o => o.name === "Under");

          if (overOutcome && underOutcome) {
            totalsOddsData.push({
              game_id: game.id,
              home_team: game.home_team,
              away_team: game.away_team,
              commence_time: game.commence_time,
              bookmaker: draftkings.title,
              over_line: overOutcome.point,
              over_price: overOutcome.price,
              under_line: underOutcome.point,
              under_price: underOutcome.price,
              last_update: draftkings.last_update,
            });
          }
        }
      }
    });

    console.log(`Prepared ${totalsOddsData.length} totals odds records`);

    // Insert/Update data in Supabase
    if (totalsOddsData.length > 0) {
      const { data, error } = await supabase
        .from("totals_odds")
        .upsert(totalsOddsData as any, {
          onConflict: "game_id,bookmaker",
          ignoreDuplicates: false,
        });

      if (error) {
        console.error("Error inserting totals odds:", error);
        return NextResponse.json(
          { error: "Failed to insert totals odds data", details: error.message },
          { status: 500 }
        );
      }

      console.log(`Successfully synced ${totalsOddsData.length} totals odds records`);
      
      return NextResponse.json({
        message: "Totals odds synced successfully",
        gamesProcessed: games.length,
        recordsInserted: totalsOddsData.length,
        data: totalsOddsData,
      });
    } else {
      return NextResponse.json({
        message: "No totals odds data found",
        gamesProcessed: games.length,
      });
    }
  } catch (error: any) {
    console.error("Error syncing totals odds:", error);
    return NextResponse.json(
      { error: "Failed to sync totals odds", details: error.message },
      { status: 500 }
    );
  }
}

