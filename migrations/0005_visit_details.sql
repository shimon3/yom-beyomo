-- Additional anonymous first-visit metadata. No IP or precise timestamp.
CREATE TABLE IF NOT EXISTS visit_details (
 day TEXT NOT NULL,
 uid TEXT NOT NULL,
 hour INTEGER NOT NULL CHECK(hour BETWEEN 0 AND 23),
 page TEXT NOT NULL,
 PRIMARY KEY(day,uid)
);
CREATE INDEX IF NOT EXISTS idx_visit_details_day ON visit_details(day);
