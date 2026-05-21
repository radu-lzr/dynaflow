CREATE EXTENSION IF NOT EXISTS timescaledb;

CREATE TABLE bench_sessions (
    id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    intervention_id     UUID NOT NULL,
    type                VARCHAR(10) NOT NULL CHECK (type IN ('before', 'after')),
    bench_id            UUID,
    peak_hp             DECIMAL,
    peak_torque         DECIMAL,
    notes               TEXT,
    started_at          TIMESTAMPTZ NOT NULL,
    ended_at            TIMESTAMPTZ,
    created_at          TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE dyno_datapoints (
    session_id      UUID NOT NULL REFERENCES bench_sessions(id) ON DELETE CASCADE,
    timestamp       TIMESTAMPTZ NOT NULL,
    rpm             INTEGER,
    horsepower      DECIMAL,
    torque          DECIMAL,
    boost_pressure  DECIMAL,
    intake_temp     DECIMAL,
    exhaust_temp    DECIMAL,
    afr             DECIMAL,
    knock_count     INTEGER,
    oil_temp        DECIMAL,
    coolant_temp    DECIMAL
);

SELECT create_hypertable('dyno_datapoints', 'timestamp');

CREATE TABLE obd_logs (
    session_id      UUID NOT NULL REFERENCES bench_sessions(id) ON DELETE CASCADE,
    timestamp       TIMESTAMPTZ NOT NULL,
    pid             VARCHAR(10) NOT NULL,
    value           DECIMAL NOT NULL,
    unit            VARCHAR(20)
);

SELECT create_hypertable('obd_logs', 'timestamp');

CREATE INDEX idx_bench_sessions_intervention ON bench_sessions(intervention_id);
CREATE INDEX idx_bench_sessions_type ON bench_sessions(type);
CREATE INDEX idx_dyno_session ON dyno_datapoints(session_id, timestamp DESC);
CREATE INDEX idx_obd_session ON obd_logs(session_id, timestamp DESC);
CREATE INDEX idx_obd_pid ON obd_logs(session_id, pid);
