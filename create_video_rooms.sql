-- Create video_rooms table
CREATE TABLE IF NOT EXISTS public.video_rooms (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    appointment_id UUID NOT NULL REFERENCES public.appointments(id) ON DELETE CASCADE,
    room_id TEXT NOT NULL,
    patient_token TEXT NOT NULL,
    doctor_token TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Add indexes for performance
CREATE INDEX IF NOT EXISTS idx_video_rooms_appointment_id ON public.video_rooms(appointment_id);
CREATE INDEX IF NOT EXISTS idx_video_rooms_room_id ON public.video_rooms(room_id);

-- Enable RLS
ALTER TABLE public.video_rooms ENABLE ROW LEVEL SECURITY;

-- Add RLS policies
-- Allow partial access based on tokens (logic handled in application level usually, but we allow read for now)
-- Simple policy: Authenticated users can read (since API uses service role often, but good to have)
CREATE POLICY "Users can view video rooms for their clinic" ON public.video_rooms
    FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM public.appointments a
            WHERE a.id = video_rooms.appointment_id
            AND a.clinic_id IN (
                SELECT clinic_id FROM public.users WHERE id = auth.uid()
            )
        )
    );

-- Allow service role full access
CREATE POLICY "Service role full access" ON public.video_rooms
    FOR ALL
    USING (auth.role() = 'service_role');
