-- Create tables for tracking how NFL defenses perform against specific positions
-- Data from Pro Football Reference

-- Defense vs RB
CREATE TABLE defense_vs_rb (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    team_name TEXT NOT NULL,
    team_abbr TEXT,
    season INTEGER NOT NULL DEFAULT 2025,
    games_played INTEGER,
    
    -- Rushing stats allowed
    rush_att INTEGER,
    rush_yds INTEGER,
    rush_td INTEGER,
    
    -- Receiving stats allowed
    targets INTEGER,
    receptions INTEGER,
    rec_yds INTEGER,
    rec_td INTEGER,
    
    -- Fantasy points allowed
    fantasy_points NUMERIC(6,2),
    dk_points NUMERIC(6,2),
    fd_points NUMERIC(6,2),
    fantasy_ppg NUMERIC(5,2),
    dk_ppg NUMERIC(5,2),
    fd_ppg NUMERIC(5,2),
    
    last_updated TIMESTAMPTZ DEFAULT NOW(),
    
    UNIQUE(team_name, season)
);

-- Defense vs TE
CREATE TABLE defense_vs_te (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    team_name TEXT NOT NULL,
    team_abbr TEXT,
    season INTEGER NOT NULL DEFAULT 2025,
    games_played INTEGER,
    
    -- Receiving stats allowed
    targets INTEGER,
    receptions INTEGER,
    rec_yds INTEGER,
    rec_td INTEGER,
    
    -- Fantasy points allowed
    fantasy_points NUMERIC(6,2),
    dk_points NUMERIC(6,2),
    fd_points NUMERIC(6,2),
    fantasy_ppg NUMERIC(5,2),
    dk_ppg NUMERIC(5,2),
    fd_ppg NUMERIC(5,2),
    
    last_updated TIMESTAMPTZ DEFAULT NOW(),
    
    UNIQUE(team_name, season)
);

-- Defense vs WR
CREATE TABLE defense_vs_wr (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    team_name TEXT NOT NULL,
    team_abbr TEXT,
    season INTEGER NOT NULL DEFAULT 2025,
    games_played INTEGER,
    
    -- Receiving stats allowed
    targets INTEGER,
    receptions INTEGER,
    rec_yds INTEGER,
    rec_td INTEGER,
    
    -- Fantasy points allowed
    fantasy_points NUMERIC(6,2),
    dk_points NUMERIC(6,2),
    fd_points NUMERIC(6,2),
    fantasy_ppg NUMERIC(5,2),
    dk_ppg NUMERIC(5,2),
    fd_ppg NUMERIC(5,2),
    
    last_updated TIMESTAMPTZ DEFAULT NOW(),
    
    UNIQUE(team_name, season)
);

-- Defense vs QB
CREATE TABLE defense_vs_qb (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    team_name TEXT NOT NULL,
    team_abbr TEXT,
    season INTEGER NOT NULL DEFAULT 2025,
    games_played INTEGER,
    
    -- Passing stats allowed
    pass_cmp INTEGER,
    pass_att INTEGER,
    pass_yds INTEGER,
    pass_td INTEGER,
    interceptions INTEGER,
    
    -- Rushing stats allowed (QB runs)
    rush_att INTEGER,
    rush_yds INTEGER,
    rush_td INTEGER,
    
    -- Sacks
    sacks INTEGER,
    
    -- Fantasy points allowed
    fantasy_points NUMERIC(6,2),
    dk_points NUMERIC(6,2),
    fd_points NUMERIC(6,2),
    fantasy_ppg NUMERIC(5,2),
    dk_ppg NUMERIC(5,2),
    fd_ppg NUMERIC(5,2),
    
    last_updated TIMESTAMPTZ DEFAULT NOW(),
    
    UNIQUE(team_name, season)
);

-- Create indexes
CREATE INDEX idx_defense_vs_rb_team ON defense_vs_rb(team_name);
CREATE INDEX idx_defense_vs_rb_fantasy_ppg ON defense_vs_rb(fantasy_ppg DESC);

CREATE INDEX idx_defense_vs_te_team ON defense_vs_te(team_name);
CREATE INDEX idx_defense_vs_te_fantasy_ppg ON defense_vs_te(fantasy_ppg DESC);

CREATE INDEX idx_defense_vs_wr_team ON defense_vs_wr(team_name);
CREATE INDEX idx_defense_vs_wr_fantasy_ppg ON defense_vs_wr(fantasy_ppg DESC);

CREATE INDEX idx_defense_vs_qb_team ON defense_vs_qb(team_name);
CREATE INDEX idx_defense_vs_qb_fantasy_ppg ON defense_vs_qb(fantasy_ppg DESC);

-- Add comments
COMMENT ON TABLE defense_vs_rb IS 'Defense performance vs Running Backs - Pro Football Reference data';
COMMENT ON TABLE defense_vs_te IS 'Defense performance vs Tight Ends - Pro Football Reference data';
COMMENT ON TABLE defense_vs_wr IS 'Defense performance vs Wide Receivers - Pro Football Reference data';
COMMENT ON TABLE defense_vs_qb IS 'Defense performance vs Quarterbacks - Pro Football Reference data';

