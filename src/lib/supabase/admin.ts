import "server-only";

import { createClient, type SupabaseClient } from "@supabase/supabase-js";

type ShortLinksTable = {
  Row: {
    id: string;
    code: string;
    original_url: string;
    click_count: number;
    created_at: string;
    last_accessed_at: string | null;
  };
  Insert: {
    id?: string;
    code: string;
    original_url: string;
    click_count?: number;
    created_at?: string;
    last_accessed_at?: string | null;
  };
  Update: {
    id?: string;
    code?: string;
    original_url?: string;
    click_count?: number;
    created_at?: string;
    last_accessed_at?: string | null;
  };
  Relationships: [];
};

type Database = {
  public: {
    Tables: {
      short_links: ShortLinksTable;
    };
    Views: Record<string, never>;
    Functions: {
      resolve_short_link: {
        Args: {
          short_code: string;
        };
        Returns: {
          original_url: string;
        }[];
      };
    };
    Enums: Record<string, never>;
    CompositeTypes: Record<string, never>;
  };
};

let cachedClient: SupabaseClient<Database> | undefined;

function getRequiredEnv(name: string): string {
  const value = process.env[name];

  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`);
  }

  return value;
}

export function getSupabaseAdminClient(): SupabaseClient<Database> {
  if (cachedClient) {
    return cachedClient;
  }

  const supabaseUrl = getRequiredEnv("NEXT_PUBLIC_SUPABASE_URL");
  const supabaseSecretKey = getRequiredEnv("SUPABASE_SECRET_KEY");

  cachedClient = createClient<Database>(supabaseUrl, supabaseSecretKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
      detectSessionInUrl: false,
    },
  });

  return cachedClient;
}
