import { createClient } from '@supabase/supabase-js'
import dotenv from 'dotenv'
import path from 'path'
import { fileURLToPath } from 'url'
import { dirname, resolve } from 'path'
const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)
dotenv.config({ path: path.resolve(__dirname, '../../backend.env') })


const supabaseUrl = process.env.SUPABASE_URL
const supabaseKey = process.env.SUPABASE_ANON_KEY

export const supabase = createClient(supabaseUrl, supabaseKey)

export const setUserContext = async (username) => {
  const { error } = await supabase.rpc('set_config', {
    setting_name: 'myapp.username',
    setting_value: username,
    is_local: true
  })
  if (error) console.error('Error setting user context:', error)
}
