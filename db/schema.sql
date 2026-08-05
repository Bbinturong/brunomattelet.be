-- brn • std — skill-word counter database (SQLite)
--
-- Every word in the about-page skill lists is a clickable counter.
-- `skill_counters` holds the current count per word; `skill_increments`
-- is an append-only audit log so progress can be tracked over time.

CREATE TABLE IF NOT EXISTS skill_counters (
    id          INTEGER PRIMARY KEY AUTOINCREMENT,
    name        TEXT    NOT NULL UNIQUE,
    category    TEXT    NOT NULL,
    count       INTEGER NOT NULL DEFAULT 0,
    updated_at  TEXT    NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS skill_increments (
    id          INTEGER PRIMARY KEY AUTOINCREMENT,
    skill_id    INTEGER NOT NULL REFERENCES skill_counters(id),
    created_at  TEXT    NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_increments_skill
    ON skill_increments(skill_id, created_at);

-- Seed: the full skill list from about.html.
-- "Wireframe" starts at 12 to match its historical on-page count.
INSERT OR IGNORE INTO skill_counters (name, category, count) VALUES
    ('Wireframe',                'Research',       12),
    ('Personas',                 'Research',        0),
    ('Wireframe sketching',      'Research',        0),
    ('Speedy prototyping',       'Research',        0),
    ('Usability testing',        'Research',        0),
    ('Facilitating workshop',    'Research',        0),
    ('Information architecture', 'Research',        0),
    ('High fidelity mockups',    'Product design',  0),
    ('Copywriting',              'Product design',  0),
    ('Micro-interaction',        'Product design',  0),
    ('Front-end development',    'Product design',  0),
    ('Responsive web design',    'Product design',  0),
    ('Storytelling',             'Product design',  0),
    ('Design systems',           'Graphic design',  0),
    ('Iconography',              'Graphic design',  0),
    ('Logotypes',                'Graphic design',  0),
    ('Typography',               'Graphic design',  0),
    ('Color theory',             'Graphic design',  0),
    ('Lacrosse',                 'Superpowers',     0),
    ('Carbonara',                'Superpowers',     0),
    ('Losing at video games',    'Superpowers',     0),
    ('Skateboarding',            'Superpowers',     0);

-- ---------------------------------------------------------------------------
-- Reference queries (used by server.py, kept here as documentation)
-- ---------------------------------------------------------------------------

-- Increment one word (two statements, run in a transaction):
--   UPDATE skill_counters
--      SET count = count + 1, updated_at = datetime('now')
--    WHERE name = :name;
--   INSERT INTO skill_increments (skill_id)
--   SELECT id FROM skill_counters WHERE name = :name;

-- Current state of every word:
--   SELECT name, category, count, updated_at
--     FROM skill_counters
--    ORDER BY category, id;

-- Improvement over time (increments per day, per word):
--   SELECT c.name, date(i.created_at) AS day, COUNT(*) AS increments
--     FROM skill_increments i
--     JOIN skill_counters  c ON c.id = i.skill_id
--    GROUP BY c.name, day
--    ORDER BY day DESC, increments DESC;

-- Most-clicked words all time:
--   SELECT name, count FROM skill_counters ORDER BY count DESC LIMIT 10;
