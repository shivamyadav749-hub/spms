-- SPMS Seed Data
-- Demo data for development and testing
-- All data is clearly marked as DEMO

-- ============================================================
-- IMPORTANT: Set your actual Auth user UUIDs below
-- ============================================================
-- Get these from Supabase Dashboard > Authentication > Users
-- The owner and technician Auth users must exist BEFORE running this script.
-- DO NOT insert into auth.users -- it is a protected table.
-- Replace 0ad68548-4c13-4908-8a22-32101f18400b and 1863ce77-a759-40bc-805d-bc75b963be96 with your actual UUIDs.
-- ============================================================

-- Demo Owner Auth UUID
-- Replace 0ad68548-4c13-4908-8a22-32101f18400b with the actual id from auth.users for demo-owner@example.com

-- Demo Technician Auth UUID
-- Replace 1863ce77-a759-40bc-805d-bc75b963be96 with the actual id from auth.users for demo-tech@example.com

-- ============================================================
-- PROFILES (run after creating auth users)
-- ============================================================

-- Demo Owner Profile
INSERT INTO profiles (id, full_name, role, phone)
VALUES ('0ad68548-4c13-4908-8a22-32101f18400b', 'Demo Homeowner', 'owner', '+1-555-0100')
ON CONFLICT (id) DO UPDATE SET full_name = EXCLUDED.full_name, role = EXCLUDED.role;

-- Demo Technician Profile
INSERT INTO profiles (id, full_name, role, phone)
VALUES ('1863ce77-a759-40bc-805d-bc75b963be96', 'Demo Technician', 'technician', '+1-555-0200')
ON CONFLICT (id) DO UPDATE SET full_name = EXCLUDED.full_name, role = EXCLUDED.role;

-- Demo Technician Profile record
INSERT INTO technician_profiles (user_id, skills, service_area, city, postal_code, latitude, longitude, is_available, verification_status)
VALUES ('1863ce77-a759-40bc-805d-bc75b963be96', ARRAY['solar_panel', 'inverter', 'electrical'], 'Metro Area', 'Springfield', '62701', 39.7817, -89.6501, true, 'verified')
ON CONFLICT (user_id) DO UPDATE SET skills = EXCLUDED.skills, verification_status = EXCLUDED.verification_status;

-- Demo Technician Profile record
INSERT INTO technician_profiles (user_id, skills, service_area, city, postal_code, latitude, longitude, is_available, verification_status)
VALUES ('1863ce77-a759-40bc-805d-bc75b963be96', ARRAY['solar_panel', 'inverter', 'electrical'], 'Metro Area', 'Springfield', '62701', 39.7817, -89.6501, true, 'verified')
ON CONFLICT (user_id) DO UPDATE SET skills = EXCLUDED.skills, verification_status = EXCLUDED.verification_status;

-- ============================================================
-- INSTALLATIONS (uses auto-generated SPMS ID)
-- ============================================================

-- Demo Installation (owned by the owner auth user above)
INSERT INTO installations (owner_id, name, address, city, postal_code, latitude, longitude, capacity_kw, installed_at, monitoring_mode)
VALUES (
    '0ad68548-4c13-4908-8a22-32101f18400b',
    'Demo Home Solar',
    '123 Solar Lane',
    'Springfield',
    '62701',
    39.7817,
    -89.6501,
    5.0,
    '2024-01-15',
    'simulated'
) ON CONFLICT (spms_id) DO NOTHING;

-- ============================================================
-- COMPONENTS
-- ============================================================

-- Demo Panel Component (skip if already exists)
INSERT INTO components (installation_id, component_type, manufacturer, model, serial_number, warranty_start, warranty_end)
SELECT i.id, 'panel', 'SunPower', 'Maxeon 3', 'SP-DEMO-PANEL-001', '2024-01-15', '2049-01-15'
FROM installations i
WHERE i.spms_id LIKE 'SPMS-%' LIMIT 1
AND NOT EXISTS (
    SELECT 1 FROM components c
    WHERE c.installation_id = i.id AND c.serial_number = 'SP-DEMO-PANEL-001'
);

-- Demo Inverter Component (skip if already exists)
INSERT INTO components (installation_id, component_type, manufacturer, model, serial_number, warranty_start, warranty_end)
SELECT i.id, 'inverter', 'Enphase', 'IQ7+', 'SP-DEMO-INV-001', '2024-01-15', '2034-01-15'
FROM installations i
WHERE i.spms_id LIKE 'SPMS-%' LIMIT 1
AND NOT EXISTS (
    SELECT 1 FROM components c
    WHERE c.installation_id = i.id AND c.serial_number = 'SP-DEMO-INV-001'
);

-- ============================================================
-- READINGS (simulated data for the last 30 days)
-- ============================================================

-- Generate simulated readings for demo installation
-- This uses a deterministic seed for reproducible demo data
DO $$
DECLARE
    demo_installation_id UUID;
    reading_date DATE;
    hour_int INT;
    base_power NUMERIC;
    cloud_factor NUMERIC;
    temp_c NUMERIC;
    voltage_v NUMERIC;
    current_a NUMERIC;
    irradiance NUMERIC;
    interval_energy NUMERIC;
    reading_ts TIMESTAMPTZ;
BEGIN
    SELECT id INTO demo_installation_id FROM installations WHERE spms_id LIKE 'SPMS-%' LIMIT 1;

    IF demo_installation_id IS NULL THEN
        RAISE NOTICE 'No demo installation found, skipping readings seed';
        RETURN;
    END IF;

    -- Generate hourly readings for last 7 days (168 readings)
    FOR reading_date IN SELECT generate_series(CURRENT_DATE - INTERVAL '7 days', CURRENT_DATE, INTERVAL '1 day')::DATE
    LOOP
        FOR hour_int IN 0..23
        LOOP
            reading_ts := (reading_date + (hour_int || ' hours')::INTERVAL) AT TIME ZONE 'UTC';

            -- Simulate solar generation curve (peak at noon)
            IF hour_int BETWEEN 6 AND 18 THEN
                -- Daytime: bell curve around solar noon
                base_power := 5.0 * GREATEST(0, 1 - POW((hour_int - 12) / 6.0, 2)) * 1000; -- watts
                cloud_factor := 0.7 + 0.3 * (ABS(SIN(reading_ts::DOUBLE PRECISION / 3600)) * 0.5 + 0.5); -- 0.7-1.0
                base_power := base_power * cloud_factor;

                -- Add some realistic variation
                base_power := base_power * (0.95 + 0.1 * RANDOM());

                -- Temperature: higher at midday
                temp_c := 25 + 15 * GREATEST(0, 1 - POW((hour_int - 14) / 4.0, 2)) + 5 * (RANDOM() - 0.5);

                -- Irradiance follows similar curve
                irradiance := 1000 * GREATEST(0, 1 - POW((hour_int - 12) / 6.0, 2)) * cloud_factor;

                -- Voltage/Current simulation (typical residential string)
                voltage_v := 350 + 20 * (RANDOM() - 0.5);
                current_a := base_power / voltage_v;

                -- Energy for this 1-hour interval
                interval_energy := base_power / 1000.0; -- kWh
            ELSE
                -- Nighttime: minimal/no generation
                base_power := 0;
                cloud_factor := 1.0;
                temp_c := 15 + 5 * (RANDOM() - 0.5);
                irradiance := 0;
                voltage_v := 0;
                current_a := 0;
                interval_energy := 0;
            END IF;

            INSERT INTO readings (installation_id, timestamp, voltage_v, current_a, power_w, temperature_c, irradiance_w_m2, interval_energy_kwh, data_source)
            VALUES (demo_installation_id, reading_ts,
                ROUND(voltage_v, 2), ROUND(current_a, 2), ROUND(base_power, 2),
                ROUND(temp_c, 2), ROUND(irradiance, 2), ROUND(interval_energy, 4), 'simulated')
            ON CONFLICT (installation_id, timestamp) DO NOTHING;
        END LOOP;
    END LOOP;

    -- Add a few anomaly readings for demo alerts
    -- High temperature anomaly (yesterday at 2 PM)
    INSERT INTO readings (installation_id, timestamp, voltage_v, current_a, power_w, temperature_c, irradiance_w_m2, interval_energy_kwh, data_source)
    VALUES (demo_installation_id,
        (CURRENT_DATE - INTERVAL '1 day' + INTERVAL '14 hours') AT TIME ZONE 'UTC',
        340, 4.5, 1530, 75.0, 850, 1.53, 'simulated')
    ON CONFLICT (installation_id, timestamp) DO NOTHING;

    -- Low generation anomaly (2 days ago at noon - cloudy day)
    INSERT INTO readings (installation_id, timestamp, voltage_v, current_a, power_w, temperature_c, irradiance_w_m2, interval_energy_kwh, data_source)
    VALUES (demo_installation_id,
        (CURRENT_DATE - INTERVAL '2 days' + INTERVAL '12 hours') AT TIME ZONE 'UTC',
        320, 1.2, 384, 35.0, 200, 0.38, 'simulated')
    ON CONFLICT (installation_id, timestamp) DO NOTHING;

    -- Missing data simulation (gap 3 days ago 10-11 AM) - just don't insert

    RAISE NOTICE 'Seeded demo readings for installation %', demo_installation_id;
END $$;

-- ============================================================
-- ALERTS
-- ============================================================

-- Demo alerts (will be generated by performance engine in real usage)
INSERT INTO alerts (installation_id, category, severity, title, message, status)
SELECT id, 'temperature', 'warning', 'High Panel Temperature',
    'Panel temperature reached 75°C at 2:00 PM yesterday. This is above the recommended operating threshold of 65°C. Consider checking for proper ventilation or cleaning.', 'active'
FROM installations i
WHERE i.spms_id LIKE 'SPMS-%' LIMIT 1
AND NOT EXISTS (
    SELECT 1 FROM alerts a
    WHERE a.installation_id = i.id AND a.category = 'temperature' AND a.title = 'High Panel Temperature'
);

INSERT INTO alerts (installation_id, category, severity, title, message, status)
SELECT id, 'performance', 'info', 'Reduced Generation Detected',
    'Generation on ' || TO_CHAR(CURRENT_DATE - INTERVAL '2 days', 'Month DD') || ' was 68% below expected. This was likely due to heavy cloud cover. No action needed unless this persists.', 'acknowledged'
FROM installations i
WHERE i.spms_id LIKE 'SPMS-%' LIMIT 1
AND NOT EXISTS (
    SELECT 1 FROM alerts a
    WHERE a.installation_id = i.id AND a.category = 'performance' AND a.title = 'Reduced Generation Detected'
);

INSERT INTO alerts (installation_id, category, severity, title, message, status, acknowledged_at, resolved_at)
SELECT id, 'maintenance', 'info', 'Scheduled Maintenance Reminder',
    'Annual system inspection recommended. Your system has been operating for over 12 months.', 'resolved',
    NOW() - INTERVAL '1 day', NOW()
FROM installations i
WHERE i.spms_id LIKE 'SPMS-%' LIMIT 1
AND NOT EXISTS (
    SELECT 1 FROM alerts a
    WHERE a.installation_id = i.id AND a.category = 'maintenance' AND a.title = 'Scheduled Maintenance Reminder'
);

-- ============================================================
-- SERVICE REQUESTS
-- ============================================================

-- Demo service request (requested by owner)
INSERT INTO service_requests (installation_id, requested_by, technician_id, issue_category, description, status)
SELECT i.id, i.owner_id, tp.user_id, 'inspection',
    'Annual inspection requested. Please check panel cleaning and inverter connections.',
    'assigned'
FROM installations i
JOIN technician_profiles tp ON tp.verification_status = 'verified'
WHERE i.spms_id LIKE 'SPMS-%' LIMIT 1
AND NOT EXISTS (
    SELECT 1 FROM service_requests sr
    WHERE sr.installation_id = i.id AND sr.issue_category = 'inspection'
);

-- Second demo request (pending)
INSERT INTO service_requests (installation_id, requested_by, issue_category, description, status)
SELECT i.id, i.owner_id, 'performance_drop',
    'Noticed lower generation last week. Please investigate.',
    'requested'
FROM installations i
WHERE i.spms_id LIKE 'SPMS-%' LIMIT 1
AND NOT EXISTS (
    SELECT 1 FROM service_requests sr
    WHERE sr.installation_id = i.id AND sr.issue_category = 'performance_drop'
);

-- ============================================================
-- SERVICE RECORDS
-- ============================================================

-- Demo service record for completed request
INSERT INTO service_records (service_request_id, installation_id, technician_id, description, findings, repair_notes, performed_at)
SELECT sr.id, sr.installation_id, sr.technician_id,
    'Annual inspection and panel cleaning',
    'Panels had moderate dust accumulation. Inverter connections secure. No damage found.',
    'Cleaned all panels with deionized water. Verified inverter output. System performing at 98% of expected.',
    NOW() - INTERVAL '5 days'
FROM service_requests sr
WHERE sr.status = 'assigned' LIMIT 1
AND NOT EXISTS (
    SELECT 1 FROM service_records r
    WHERE r.service_request_id = sr.id
);

-- ============================================================
-- CHAT SESSIONS & MESSAGES
-- ============================================================

-- Demo chat session
INSERT INTO chat_sessions (user_id, installation_id, title)
SELECT i.owner_id, i.id, 'Demo Chat - Performance Questions'
FROM installations i
WHERE i.spms_id LIKE 'SPMS-%' LIMIT 1
AND NOT EXISTS (
    SELECT 1 FROM chat_sessions cs
    WHERE cs.user_id = i.owner_id AND cs.title = 'Demo Chat - Performance Questions'
);

-- Demo messages
INSERT INTO chat_messages (session_id, role, content)
SELECT cs.id, 'user', 'How much electricity did I generate yesterday?'
FROM chat_sessions cs
WHERE cs.title = 'Demo Chat - Performance Questions'
AND NOT EXISTS (
    SELECT 1 FROM chat_messages cm
    WHERE cm.session_id = cs.id AND cm.role = 'user' AND cm.content = 'How much electricity did I generate yesterday?'
);

INSERT INTO chat_messages (session_id, role, content)
SELECT cs.id, 'assistant', 'Based on your simulated data, you generated approximately 12.4 kWh yesterday. This is 92% of your expected 13.5 kWh for a clear day in this season. The slight reduction was likely due to partial cloud cover in the afternoon.'
FROM chat_sessions cs
WHERE cs.title = 'Demo Chat - Performance Questions'
AND NOT EXISTS (
    SELECT 1 FROM chat_messages cm
    WHERE cm.session_id = cs.id AND cm.role = 'assistant' AND cm.content LIKE 'Based on your simulated data%'
);

-- ============================================================
-- VERIFICATION QUERIES
-- ============================================================

-- Run these to verify seed data:
-- SELECT * FROM installations WHERE spms_id LIKE 'SPMS-%';
-- SELECT * FROM components WHERE installation_id IN (SELECT id FROM installations WHERE spms_id LIKE 'SPMS-%');
-- SELECT COUNT(*) FROM readings WHERE installation_id IN (SELECT id FROM installations WHERE spms_id LIKE 'SPMS-%');
-- SELECT * FROM alerts WHERE installation_id IN (SELECT id FROM installations WHERE spms_id LIKE 'SPMS-%');
-- SELECT * FROM service_requests WHERE installation_id IN (SELECT id FROM installations WHERE spms_id LIKE 'SPMS-%');
-- SELECT * FROM technician_profiles WHERE verification_status = 'verified';
