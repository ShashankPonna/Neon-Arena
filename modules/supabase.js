import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js/+esm'

const SUPABASE_URL = 'https://dbuswpzjqqwheknuaadi.supabase.co'
const SUPABASE_ANON_KEY = 'sb_publishable_6pDKPBgDTGYM8cZFdI63-Q_u7N00YK8'

// Create a single supabase client for interacting with your database
export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY)
