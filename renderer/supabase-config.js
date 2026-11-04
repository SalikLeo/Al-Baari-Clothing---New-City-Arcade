// Supabase Online Configuration
// You can enter your credentials here directly, or enter them in the app's Settings -> Cloud Database page.
window.SUPABASE_CONFIG = {
  url: window.localStorage.getItem('supabase_url') || '',
  anonKey: window.localStorage.getItem('supabase_anon_key') || '',
  
  // Set to true to force Supabase Cloud mode even when running in desktop Electron
  forceCloudMode: window.localStorage.getItem('use_cloud_supabase') === 'true'
};
