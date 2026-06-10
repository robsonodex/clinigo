-- ============================================
-- Single Session System (Sessão Única)
-- Garante que cada usuário tenha apenas UMA sessão ativa por vez
-- Quando login é feito em novo dispositivo, sessão anterior é invalidada
-- ============================================

-- Tabela de sessões ativas
CREATE TABLE IF NOT EXISTS public.active_sessions (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    session_token TEXT NOT NULL UNIQUE,
    device_info TEXT,
    ip_address TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    is_active BOOLEAN DEFAULT TRUE
);

-- Índices para performance
CREATE INDEX IF NOT EXISTS idx_active_sessions_user_id ON public.active_sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_active_sessions_token ON public.active_sessions(session_token);
CREATE INDEX IF NOT EXISTS idx_active_sessions_active ON public.active_sessions(user_id, is_active) WHERE is_active = TRUE;

-- RLS: Habilitar
ALTER TABLE public.active_sessions ENABLE ROW LEVEL SECURITY;

-- Policy: Service role pode tudo (usado pelo backend)
CREATE POLICY "Service role full access on active_sessions"
    ON public.active_sessions
    FOR ALL
    USING (true)
    WITH CHECK (true);

-- Policy: Usuário pode ver apenas suas próprias sessões
CREATE POLICY "Users can view own sessions"
    ON public.active_sessions
    FOR SELECT
    USING (auth.uid() = user_id);

-- Cleanup automático de sessões antigas (mais de 30 dias)
-- Pode ser rodado via pg_cron
CREATE OR REPLACE FUNCTION public.cleanup_old_sessions()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    DELETE FROM public.active_sessions
    WHERE created_at < NOW() - INTERVAL '30 days'
    OR (is_active = FALSE AND created_at < NOW() - INTERVAL '7 days');
END;
$$;
