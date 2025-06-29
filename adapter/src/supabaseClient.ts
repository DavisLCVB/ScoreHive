import { config } from "dotenv";
config();
import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseAnonKey = process.env.SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  console.error("Missing Supabase environment variables:");
  console.error("SUPABASE_URL:", supabaseUrl ? "✓ Set" : "✗ Missing");
  console.error("SUPABASE_ANON_KEY:", supabaseAnonKey ? "✓ Set" : "✗ Missing");
  throw new Error("Missing Supabase URL or Anon Key environment variables.");
}

console.log("Supabase client initialized successfully");
console.log("URL:", supabaseUrl);

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
