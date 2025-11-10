-- Create the sports table
create table sports (
  id serial primary key,
  name text not null
);

-- Create the games table
create table games (
  id serial primary key,
  sport_id int references sports(id),
  week int not null,
  home_team text not null,
  away_team text not null,
  game_date timestamptz
);

-- Create the bets table
create table bets (
  id serial primary key,
  game_id int references games(id),
  player_name text not null,
  bet_type text not null,
  line numeric not null,
  odds text,
  sportsbook text,
  result text
);

-- Create indexes for performance
CREATE INDEX idx_games_sport_id ON games(sport_id);
CREATE INDEX idx_games_date ON games(date);
CREATE INDEX idx_bets_game_id ON bets(game_id);
CREATE INDEX idx_bets_bet_type ON bets(bet_type);