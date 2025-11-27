import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || 'https://nbtqeatnzyuvjftiltnm.supabase.co';
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5idHFlYXRuenl1dmpmdGlsdG5tIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjQyNjMxODAsImV4cCI6MjA3OTgzOTE4MH0.3U3ayWzwZmsLi_HbX3cdww4fkM718h73CQO8HTrSuTE';

export const supabase = createClient(supabaseUrl, supabaseAnonKey);