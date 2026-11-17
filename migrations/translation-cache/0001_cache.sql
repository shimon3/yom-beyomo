CREATE TABLE IF NOT EXISTS translations (
  cache_key TEXT PRIMARY KEY,
  translation TEXT,
  lease_until INTEGER NOT NULL,
  lease_owner TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS translation_daily_usage (
  day TEXT PRIMARY KEY,
  characters INTEGER NOT NULL
    CONSTRAINT daily_translation_character_limit CHECK (characters BETWEEN 0 AND 12000)
);
