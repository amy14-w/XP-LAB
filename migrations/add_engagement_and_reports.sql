-- Persist per-checkpoint engagement points and lecture reports

CREATE TABLE IF NOT EXISTS lecture_engagement_points (
    point_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    lecture_id UUID NOT NULL REFERENCES lectures(lecture_id) ON DELETE CASCADE,
    ts TIMESTAMP WITH TIME ZONE NOT NULL,
    sentiment_score DOUBLE PRECISION,
    confidence DOUBLE PRECISION,
    delivery_clarity DOUBLE PRECISION,
    delivery_pace DOUBLE PRECISION,
    delivery_pitch DOUBLE PRECISION,
    engagement DOUBLE PRECISION,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_engagement_points_lecture ON lecture_engagement_points(lecture_id, ts);

CREATE TABLE IF NOT EXISTS lecture_reports (
    lecture_id UUID PRIMARY KEY REFERENCES lectures(lecture_id) ON DELETE CASCADE,
    professor_id UUID NOT NULL REFERENCES users(user_id),
    topic TEXT,
    date TIMESTAMP WITH TIME ZONE,
    duration_minutes INTEGER,
    headline_engagement INTEGER,
    talk_time_professor INTEGER,
    talk_time_students INTEGER,
    participation_rate DOUBLE PRECISION,
    timeline JSONB,
    summary JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_lecture_reports_professor ON lecture_reports(professor_id, date);


