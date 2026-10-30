-- SPMS Row Level Security Policies
-- Migration 002: RLS policies for all tables

-- Enable RLS on all tables
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE installations ENABLE ROW LEVEL SECURITY;
ALTER TABLE components ENABLE ROW LEVEL SECURITY;
ALTER TABLE readings ENABLE ROW LEVEL SECURITY;
ALTER TABLE alerts ENABLE ROW LEVEL SECURITY;
ALTER TABLE technician_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE service_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE service_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE chat_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE chat_messages ENABLE ROW LEVEL SECURITY;

-- ============================================================
-- PROFILES POLICIES
-- ============================================================

-- Users can read their own profile
CREATE POLICY "Users can read own profile" ON profiles
    FOR SELECT USING (auth.uid() = id);

-- Users can update their own profile (but not role)
CREATE POLICY "Users can update own profile" ON profiles
    FOR UPDATE USING (auth.uid() = id)
    WITH CHECK (auth.uid() = id AND role = (SELECT role FROM profiles WHERE id = auth.uid()));

-- Service role can do everything (for backend operations)
CREATE POLICY "Service role full access profiles" ON profiles
    FOR ALL USING (auth.role() = 'service_role');

-- ============================================================
-- INSTALLATIONS POLICIES
-- ============================================================

-- Owners can read their own installations
CREATE POLICY "Owners read own installations" ON installations
    FOR SELECT USING (
        owner_id = auth.uid() AND
        (SELECT role FROM profiles WHERE id = auth.uid()) = 'owner'
    );

-- Owners can create installations
CREATE POLICY "Owners create installations" ON installations
    FOR INSERT WITH CHECK (
        owner_id = auth.uid() AND
        (SELECT role FROM profiles WHERE id = auth.uid()) = 'owner'
    );

-- Owners can update their own installations
CREATE POLICY "Owners update own installations" ON installations
    FOR UPDATE USING (
        owner_id = auth.uid() AND
        (SELECT role FROM profiles WHERE id = auth.uid()) = 'owner'
    );

-- Technicians can read installations for their assigned service requests
CREATE POLICY "Technicians read assigned installations" ON installations
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM service_requests sr
            WHERE sr.installation_id = installations.id
            AND sr.technician_id = auth.uid()
            AND sr.status IN ('assigned', 'in_progress')
        ) AND
        (SELECT role FROM profiles WHERE id = auth.uid()) = 'technician'
    );

-- Service role full access
CREATE POLICY "Service role full access installations" ON installations
    FOR ALL USING (auth.role() = 'service_role');

-- ============================================================
-- COMPONENTS POLICIES
-- ============================================================

-- Owners can read components of their installations
CREATE POLICY "Owners read components" ON components
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM installations i
            WHERE i.id = components.installation_id
            AND i.owner_id = auth.uid()
        )
    );

-- Owners can create components for their installations
CREATE POLICY "Owners create components" ON components
    FOR INSERT WITH CHECK (
        EXISTS (
            SELECT 1 FROM installations i
            WHERE i.id = components.installation_id
            AND i.owner_id = auth.uid()
        )
    );

-- Owners can update components of their installations
CREATE POLICY "Owners update components" ON components
    FOR UPDATE USING (
        EXISTS (
            SELECT 1 FROM installations i
            WHERE i.id = components.installation_id
            AND i.owner_id = auth.uid()
        )
    );

-- Technicians can read components for assigned installations
CREATE POLICY "Technicians read assigned components" ON components
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM installations i
            JOIN service_requests sr ON sr.installation_id = i.id
            WHERE i.id = components.installation_id
            AND sr.technician_id = auth.uid()
            AND sr.status IN ('assigned', 'in_progress')
        ) AND
        (SELECT role FROM profiles WHERE id = auth.uid()) = 'technician'
    );

-- Service role full access
CREATE POLICY "Service role full access components" ON components
    FOR ALL USING (auth.role() = 'service_role');

-- ============================================================
-- READINGS POLICIES
-- ============================================================

-- Owners can read readings for their installations
CREATE POLICY "Owners read readings" ON readings
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM installations i
            WHERE i.id = readings.installation_id
            AND i.owner_id = auth.uid()
        )
    );

-- Backend (service role) can insert readings
CREATE POLICY "Service role insert readings" ON readings
    FOR INSERT WITH CHECK (auth.role() = 'service_role');

-- Service role full access
CREATE POLICY "Service role full access readings" ON readings
    FOR ALL USING (auth.role() = 'service_role');

-- ============================================================
-- ALERTS POLICIES
-- ============================================================

-- Owners can read alerts for their installations
CREATE POLICY "Owners read alerts" ON alerts
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM installations i
            WHERE i.id = alerts.installation_id
            AND i.owner_id = auth.uid()
        )
    );

-- Owners can acknowledge/resolve alerts for their installations
CREATE POLICY "Owners update alerts" ON alerts
    FOR UPDATE USING (
        EXISTS (
            SELECT 1 FROM installations i
            WHERE i.id = alerts.installation_id
            AND i.owner_id = auth.uid()
        )
    );

-- Service role full access (for backend alert creation)
CREATE POLICY "Service role full access alerts" ON alerts
    FOR ALL USING (auth.role() = 'service_role');

-- ============================================================
-- TECHNICIAN_PROFILES POLICIES
-- ============================================================

-- Technicians can read their own profile
CREATE POLICY "Technicians read own profile" ON technician_profiles
    FOR SELECT USING (user_id = auth.uid());

-- Technicians can update their own profile
CREATE POLICY "Technicians update own profile" ON technician_profiles
    FOR UPDATE USING (user_id = auth.uid())
    WITH CHECK (user_id = auth.uid());

-- Anyone can read verified, available technicians (for directory search)
CREATE POLICY "Public read verified technicians" ON technician_profiles
    FOR SELECT USING (
        verification_status = 'verified' AND is_available = true
    );

-- Service role full access
CREATE POLICY "Service role full access technician_profiles" ON technician_profiles
    FOR ALL USING (auth.role() = 'service_role');

-- ============================================================
-- SERVICE_REQUESTS POLICIES
-- ============================================================

-- Owners can read their own service requests
CREATE POLICY "Owners read service requests" ON service_requests
    FOR SELECT USING (
        requested_by = auth.uid() AND
        (SELECT role FROM profiles WHERE id = auth.uid()) = 'owner'
    );

-- Owners can create service requests for their installations
CREATE POLICY "Owners create service requests" ON service_requests
    FOR INSERT WITH CHECK (
        requested_by = auth.uid() AND
        (SELECT role FROM profiles WHERE id = auth.uid()) = 'owner' AND
        EXISTS (
            SELECT 1 FROM installations i
            WHERE i.id = service_requests.installation_id
            AND i.owner_id = auth.uid()
        )
    );

-- Owners can cancel their own requests (if not yet assigned)
CREATE POLICY "Owners cancel service requests" ON service_requests
    FOR UPDATE USING (
        requested_by = auth.uid() AND
        status = 'requested'
    ) WITH CHECK (
        requested_by = auth.uid() AND
        status IN ('requested', 'cancelled')
    );

-- Technicians can read assigned service requests
CREATE POLICY "Technicians read assigned requests" ON service_requests
    FOR SELECT USING (
        technician_id = auth.uid() AND
        (SELECT role FROM profiles WHERE id = auth.uid()) = 'technician'
    );

-- Technicians can update status of assigned requests
CREATE POLICY "Technicians update assigned requests" ON service_requests
    FOR UPDATE USING (
        technician_id = auth.uid() AND
        (SELECT role FROM profiles WHERE id = auth.uid()) = 'technician'
    ) WITH CHECK (
        technician_id = auth.uid() AND
        status IN ('assigned', 'in_progress', 'completed')
    );

-- Service role full access
CREATE POLICY "Service role full access service_requests" ON service_requests
    FOR ALL USING (auth.role() = 'service_role');

-- ============================================================
-- SERVICE_RECORDS POLICIES
-- ============================================================

-- Owners can read service records for their installations
CREATE POLICY "Owners read service records" ON service_records
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM installations i
            WHERE i.id = service_records.installation_id
            AND i.owner_id = auth.uid()
        )
    );

-- Technicians can create service records for their assigned requests
CREATE POLICY "Technicians create service records" ON service_records
    FOR INSERT WITH CHECK (
        technician_id = auth.uid() AND
        (SELECT role FROM profiles WHERE id = auth.uid()) = 'technician' AND
        EXISTS (
            SELECT 1 FROM service_requests sr
            WHERE sr.id = service_records.service_request_id
            AND sr.technician_id = auth.uid()
            AND sr.status IN ('assigned', 'in_progress')
        )
    );

-- Technicians can read service records they created
CREATE POLICY "Technicians read own service records" ON service_records
    FOR SELECT USING (technician_id = auth.uid());

-- Service role full access
CREATE POLICY "Service role full access service_records" ON service_records
    FOR ALL USING (auth.role() = 'service_role');

-- ============================================================
-- CHAT_SESSIONS POLICIES
-- ============================================================

-- Users can read their own chat sessions
CREATE POLICY "Users read own chat sessions" ON chat_sessions
    FOR SELECT USING (user_id = auth.uid());

-- Users can create their own chat sessions
CREATE POLICY "Users create chat sessions" ON chat_sessions
    FOR INSERT WITH CHECK (user_id = auth.uid());

-- Users can update their own chat sessions
CREATE POLICY "Users update own chat sessions" ON chat_sessions
    FOR UPDATE USING (user_id = auth.uid());

-- Service role full access
CREATE POLICY "Service role full access chat_sessions" ON chat_sessions
    FOR ALL USING (auth.role() = 'service_role');

-- ============================================================
-- CHAT_MESSAGES POLICIES
-- ============================================================

-- Users can read messages in their own sessions
CREATE POLICY "Users read own chat messages" ON chat_messages
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM chat_sessions cs
            WHERE cs.id = chat_messages.session_id
            AND cs.user_id = auth.uid()
        )
    );

-- Users can insert messages in their own sessions
CREATE POLICY "Users insert chat messages" ON chat_messages
    FOR INSERT WITH CHECK (
        EXISTS (
            SELECT 1 FROM chat_sessions cs
            WHERE cs.id = chat_messages.session_id
            AND cs.user_id = auth.uid()
        )
    );

-- Service role full access
CREATE POLICY "Service role full access chat_messages" ON chat_messages
    FOR ALL USING (auth.role() = 'service_role');

-- ============================================================
-- HELPER FUNCTIONS FOR BACKEND AUTHORIZATION
-- ============================================================

-- Function to check if user is owner of installation
CREATE OR REPLACE FUNCTION is_installation_owner(installation_uuid UUID, user_uuid UUID)
RETURNS BOOLEAN AS $$
BEGIN
    RETURN EXISTS (
        SELECT 1 FROM installations
        WHERE id = installation_uuid AND owner_id = user_uuid
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to check if user is technician assigned to request
CREATE OR REPLACE FUNCTION is_request_technician(request_uuid UUID, user_uuid UUID)
RETURNS BOOLEAN AS $$
BEGIN
    RETURN EXISTS (
        SELECT 1 FROM service_requests
        WHERE id = request_uuid AND technician_id = user_uuid
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to check if technician has access to installation via assigned request
CREATE OR REPLACE FUNCTION technician_has_installation_access(installation_uuid UUID, user_uuid UUID)
RETURNS BOOLEAN AS $$
BEGIN
    RETURN EXISTS (
        SELECT 1 FROM service_requests sr
        WHERE sr.installation_id = installation_uuid
        AND sr.technician_id = user_uuid
        AND sr.status IN ('assigned', 'in_progress')
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;