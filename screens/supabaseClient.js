import { createClient } from "@supabase/supabase-js";

const supabaseUrl = "https://gsmfnesxmyprmnylkzhc.supabase.co";
const supabaseKey =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImdzbWZuZXN4bXlwcm1ueWxremhjIiwicm9sZSI6ImFub24iLCJpYXQiOjE3MzI5MzA5ODksImV4cCI6MjA0ODUwNjk4OX0.unjhvQLpznFu98q_BDdPLz1XzqJdOU_VBR1u3fBhdcI";
const supabase = createClient(supabaseUrl, supabaseKey);
export default supabase;
