import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.REACT_APP_SUPABASE_URL
const supabaseKey = process.env.REACT_APP_SUPABASE_ANON_KEY

export const supabase = createClient(supabaseUrl, supabaseKey)

export const setUserContext = async (username) => {
  if (!username || username.trim() === '') {
    throw new Error('Username is required');
  }
  //console.log('Setting context for username:', username);
  try {
    const { data, error } = await supabase.rpc('set_config', {
      setting_name: 'myapp.username',
      setting_value: username.trim(),
      is_local: true
    });
    
    if (error) {
      throw error;
    }
    
    return true;
    
  } catch (error) {
    throw error;
  }
};