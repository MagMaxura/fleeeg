// All type definitions are consolidated into this single file to prevent
// module resolution issues that can lead to an untyped Supabase client.

// FIX: Removed unused 'react' type import to eliminate a potential module resolution conflict point.
// This file should have zero dependencies to ensure it can be safely imported by the Supabase service.


// --- DATABASE SCHEMA TYPE ---
// This is the single source of truth for the database schema.
export type Database = {
  public: {
    Tables: {
      trips: {
        Row: {
          id: number;
          customer_id: string;
          driver_id: string | null;
          origin: string;
          destination: string;
          origin_city: string | null;
          origin_province: string | null;
          destination_city: string | null;
          destination_province: string | null;
          cargo_details: string;
          estimated_weight_kg: number;
          estimated_volume_m3: number;
          distance_km: number | null;
          estimated_drive_time_min: number | null;
          estimated_load_time_min: number | null;
          estimated_unload_time_min: number | null;
          driver_arrival_time_min: number | null;
          price: number | null;
          status: "requested" | "accepted" | "in_transit" | "completed" | "paid";
          start_time: string | null;
          final_duration_min: number | null;
          final_price: number | null;
          created_at: string | null;
        };
        Insert: {
          customer_id: string;
          driver_id?: string | null;
          origin: string;
          destination: string;
          origin_city?: string | null;
          origin_province?: string | null;
          destination_city?: string | null;
          destination_province?: string | null;
          cargo_details: string;
          estimated_weight_kg: number;
          estimated_volume_m3: number;
          distance_km?: number | null;
          estimated_drive_time_min?: number | null;
          estimated_load_time_min?: number | null;
          estimated_unload_time_min?: number | null;
          price?: number | null;
          status: "requested" | "accepted" | "in_transit" | "completed" | "paid";
        };
        Update: {
          customer_id?: string;
          driver_id?: string | null;
          origin?: string;
          destination?: string;
          origin_city?: string | null;
          origin_province?: string | null;
          destination_city?: string | null;
          destination_province?: string | null;
          cargo_details?: string;
          estimated_weight_kg?: number;
          estimated_volume_m3?: number;
          distance_km?: number | null;
          estimated_drive_time_min?: number | null;
          estimated_load_time_min?: number | null;
          estimated_unload_time_min?: number | null;
          driver_arrival_time_min?: number | null;
          price?: number | null;
          status?: "requested" | "accepted" | "in_transit" | "completed" | "paid";
          start_time?: string | null;
          final_duration_min?: number | null;
          final_price?: number | null;
        };
      };
      profiles: {
        Row: {
          id: string;
          email: string;
          full_name: string;
          dni: string;
          phone: string;
          address: string;
          city: string | null;
          province: string | null;
          role: "customer" | "driver";
          vehicle: string | null;
          vehicle_type: "Furgoneta" | "Furgón" | "Pick UP" | "Camión ligero" | "Camión pesado" | null;
          capacity_kg: number | null;
          capacity_m3: number | null;
          service_radius_km: number | null;
          photo_url: string | null;
          vehicle_photo_url: string | null;
          vehicle_photo_path: string | null;
          payment_info: string | null;
          filter_preferences: {
            cities?: string[];
            max_weight_kg?: number;
            max_volume_m3?: number;
          } | null;
        };
        Insert: {
            id: string;
            email: string;
            full_name: string;
            dni: string;
            phone: string;
            address: string;
            city?: string | null;
            province?: string | null;
            role: "customer" | "driver";
            vehicle?: string | null;
            vehicle_type?: "Furgoneta" | "Furgón" | "Pick UP" | "Camión ligero" | "Camión pesado" | null;
            capacity_kg?: number | null;
            capacity_m3?: number | null;
            service_radius_km?: number | null;
            photo_url?: string | null;
            vehicle_photo_url?: string | null;
            vehicle_photo_path?: string | null;
            payment_info?: string | null;
            filter_preferences?: {
              cities?: string[];
              max_weight_kg?: number;
              max_volume_m3?: number;
            } | null;
        };
        Update: {
          email?: string;
          full_name?: string;
          dni?: string;
          phone?: string;
          address?: string;
          city?: string | null;
          province?: string | null;
          role?: "customer" | "driver";
          vehicle?: string | null;
          vehicle_type?: "Furgoneta" | "Furgón" | "Pick UP" | "Camión ligero" | "Camión pesado" | null;
          capacity_kg?: number | null;
          capacity_m3?: number | null;
          service_radius_km?: number | null;
          photo_url?: string | null;
          vehicle_photo_url?: string | null;
          vehicle_photo_path?: string | null;
          payment_info?: string | null;
          filter_preferences?: {
            cities?: string[];
            max_weight_kg?: number;
            max_volume_m3?: number;
          } | null;
        };
      };
      chat_messages: {
        Row: {
          id: number;
          trip_id: number;
          sender_id: string;
          content: string;
          created_at: string;
        };
        Insert: {
          trip_id: number;
          sender_id: string;
          content: string;
        };
        Update: {
          content?: string;
        };
      };
      reviews: {
        Row: {
          id: number;
          trip_id: number;
          reviewer_id: string; // customer's id
          driver_id: string;
          rating: number; // 1 to 5
          comment: string;
          created_at: string;
        };
        Insert: {
          trip_id: number;
          reviewer_id: string;
          driver_id: string;
          rating: number;
          comment: string;
        };
        Update: {
          rating?: number;
          comment?: string;
        };
      };
      offers: {
        Row: {
          id: number;
          trip_id: number;
          driver_id: string;
          price: number;
          notes: string | null;
          status: "pending" | "accepted" | "rejected" | "cancelled";
          created_at: string;
        };
        Insert: {
          trip_id: number;
          driver_id: string;
          price: number;
          notes?: string | null;
          status?: "pending" | "accepted" | "rejected" | "cancelled";
        };
        Update: {
          price?: number;
          notes?: string | null;
          status?: "pending" | "accepted" | "rejected" | "cancelled";
        };
      };
    };
    Views: {
      [_ in never]: never;
    };
    Functions: {
      [_ in never]: never;
    };
    Enums: {
      trip_status: "requested" | "accepted" | "in_transit" | "completed" | "paid";
      user_role: "customer" | "driver";
      vehicle_type: "Furgoneta" | "Furgón" | "Pick UP" | "Camión ligero" | "Camión pesado";
    };
    CompositeTypes: {
      [_ in never]: never;
    };
  };
};

export type TripStatusEnum = "requested" | "accepted" | "in_transit" | "completed" | "paid";
export type UserRoleEnum = "customer" | "driver";
export type VehicleTypeEnum = "Furgoneta" | "Furgón" | "Pick UP" | "Camión ligero" | "Camión pesado";

export type UserRole = UserRoleEnum;
export type TripStatus = TripStatusEnum;
export type VehicleType = VehicleTypeEnum;

// --- Main Data Types (from Supabase schema) ---
export type Profile = Database['public']['Tables']['profiles']['Row'];
export type Trip = Database['public']['Tables']['trips']['Row'];
export type ChatMessage = Database['public']['Tables']['chat_messages']['Row'];
export type Review = Database['public']['Tables']['reviews']['Row'];
export type Offer = Database['public']['Tables']['offers']['Row'];

// --- Granular Insert/Update Types for better type safety and dependency management ---
export type ProfileInsert = Database['public']['Tables']['profiles']['Insert'];
export type ProfileUpdate = Database['public']['Tables']['profiles']['Update'];
export type TripInsert = Database['public']['Tables']['trips']['Insert'];
export type TripUpdate = Database['public']['Tables']['trips']['Update'];
export type ChatMessageInsert = Database['public']['Tables']['chat_messages']['Insert'];
export type ReviewInsert = Database['public']['Tables']['reviews']['Insert'];
export type OfferInsert = Database['public']['Tables']['offers']['Insert'];
export type OfferUpdate = Database['public']['Tables']['offers']['Update'];

// For creating new trips, before system-generated fields are added.
export type NewTrip = Omit<Database['public']['Tables']['trips']['Insert'], 'customer_id' | 'driver_id' | 'status' | 'estimated_load_time_min' | 'estimated_unload_time_min'>;


// --- Role-specific Types for clarity and type narrowing ---
// These are subsets of Profile, mainly for asserting roles.
// The properties will have the same nullability as in the database 'Row' type.
export interface Customer extends Profile {
  role: 'customer';
}

export interface Driver extends Profile {
  role: 'driver';
}

// --- App-specific Enums and Types ---
// NOTE: App-level types like `View` and `SortKey` have been moved to `AppContext.ts`
// to break a circular dependency that was causing Supabase client typing issues.


// --- App Context Specific Types ---
// NOTE: AppContextType and related types have been moved to AppContext.ts
// to break a circular dependency that was causing Supabase client typing issues.
