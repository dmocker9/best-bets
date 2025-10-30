-- Seed data for NFL Week 9

-- Insert sports
INSERT INTO sports (name) VALUES ('NFL');

-- Insert games for NFL Week 9
INSERT INTO games (sport_id, week, home_team, away_team, game_date)
SELECT 
  s.id,
  9,
  home,
  away,
  '2025-11-04 13:00:00'::timestamptz
FROM sports s
CROSS JOIN (
  VALUES 
    ('Dolphins', 'Ravens'),
    ('Panthers', 'Packers'),
    ('Giants', '49ers'),
    ('Bills', 'Chiefs')
) AS teams(home, away)
WHERE s.name = 'NFL';

-- Insert sample bets for each game
-- Ravens -7.5 vs Dolphins
INSERT INTO bets (game_id, player_name, bet_type, line, odds, sportsbook)
SELECT 
  g.id,
  'N/A',
  'spread',
  -7.5,
  '-110',
  'DraftKings'
FROM games g
WHERE g.home_team = 'Dolphins' AND g.away_team = 'Ravens';

-- Packers -13 vs Panthers
INSERT INTO bets (game_id, player_name, bet_type, line, odds, sportsbook)
SELECT 
  g.id,
  'N/A',
  'spread',
  -13,
  '-110',
  'FanDuel'
FROM games g
WHERE g.home_team = 'Panthers' AND g.away_team = 'Packers';

-- 49ers -3 vs Giants
INSERT INTO bets (game_id, player_name, bet_type, line, odds, sportsbook)
SELECT 
  g.id,
  'N/A',
  'spread',
  -3,
  '-110',
  'BetMGM'
FROM games g
WHERE g.home_team = 'Giants' AND g.away_team = '49ers';

-- Chiefs -1 vs Bills
INSERT INTO bets (game_id, player_name, bet_type, line, odds, sportsbook)
SELECT 
  g.id,
  'N/A',
  'spread',
  -1,
  '-110',
  'Caesars'
FROM games g
WHERE g.home_team = 'Bills' AND g.away_team = 'Chiefs';

-- Insert sample odds_bets data with flattened bookmakers structure
INSERT INTO odds_bets (api_id, sport_key, sport_title, commence_time, home_team, away_team, bookmakers)
VALUES 
  ('ravens_dolphins_2025', 'americanfootball_nfl', 'NFL', '2025-11-04 13:00:00'::timestamptz, 'Miami Dolphins', 'Baltimore Ravens', 
   '[{"bookmaker_name":"DraftKings","home_team_price":-110,"away_team_price":-110,"home_team_line":7.5,"away_team_line":-7.5},
     {"bookmaker_name":"FanDuel","home_team_price":-108,"away_team_price":-112,"home_team_line":7.5,"away_team_line":-7.5}]'::jsonb),
  
  ('packers_panthers_2025', 'americanfootball_nfl', 'NFL', '2025-11-04 13:00:00'::timestamptz, 'Carolina Panthers', 'Green Bay Packers',
   '[{"bookmaker_name":"FanDuel","home_team_price":-110,"away_team_price":-110,"home_team_line":13,"away_team_line":-13},
     {"bookmaker_name":"BetMGM","home_team_price":-105,"away_team_price":-115,"home_team_line":13,"away_team_line":-13}]'::jsonb),
  
  ('49ers_giants_2025', 'americanfootball_nfl', 'NFL', '2025-11-04 13:00:00'::timestamptz, 'New York Giants', 'San Francisco 49ers',
   '[{"bookmaker_name":"BetMGM","home_team_price":-110,"away_team_price":-110,"home_team_line":3,"away_team_line":-3},
     {"bookmaker_name":"Caesars","home_team_price":-112,"away_team_price":-108,"home_team_line":3,"away_team_line":-3}]'::jsonb),
  
  ('chiefs_bills_2025', 'americanfootball_nfl', 'NFL', '2025-11-04 16:00:00'::timestamptz, 'Buffalo Bills', 'Kansas City Chiefs',
   '[{"bookmaker_name":"Caesars","home_team_price":-110,"away_team_price":-110,"home_team_line":1,"away_team_line":-1},
     {"bookmaker_name":"DraftKings","home_team_price":-115,"away_team_price":-105,"home_team_line":1,"away_team_line":-1}]'::jsonb);
