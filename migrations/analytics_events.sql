-- Aggregated telemetry only. No IP address, cookies, device ID, or user agent stored.
CREATE TABLE IF NOT EXISTS analytics_events (
  day TEXT NOT NULL,
  category TEXT NOT NULL CHECK (category IN ('section','load_error','device')),
  label TEXT NOT NULL,
  device TEXT NOT NULL CHECK (device IN ('mobile','desktop','tablet','unknown')),
  count INTEGER NOT NULL DEFAULT 0,
  PRIMARY KEY(day,category,label,device)
);
CREATE INDEX IF NOT EXISTS analytics_events_day_idx ON analytics_events(day);
