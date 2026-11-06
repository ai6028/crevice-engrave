// lib/supabase.ts
import { createClient } from '@supabase/supabase-js';

// 填入你复制的那串 https://xxx.supabase.co
const supabaseUrl = 'https://ywjugzbdjxvqieokyfyh.supabase.co'; 
// 填入你复制的 sb_publishable_... 长串
const supabaseKey = 'sb_publishable_-LgvAUjvKnCvS75q0k9y2Q_Kta-VvmY'; 

export const supabase = createClient(supabaseUrl, supabaseKey);