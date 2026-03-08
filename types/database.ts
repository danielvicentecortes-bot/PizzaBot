/**
 * Supabase database types — hand-authored until `supabase gen types typescript` is run.
 * After linking a Supabase project, regenerate with:
 *   npx supabase gen types typescript --project-id <id> > types/database.ts
 *
 * The schema must satisfy @supabase/postgrest-js GenericSchema:
 *   { Tables: Record<string, GenericTable>; Views: {}; Functions: {} }
 * And each GenericTable must have: Row, Insert, Update, Relationships.
 */

export type Json = string | number | boolean | null | { [key: string]: Json } | Json[]

export type ChannelType        = 'whatsapp' | 'sms' | 'telegram'
export type UserRole           = 'owner' | 'staff'
export type SubscriptionStatus = 'trialing' | 'active' | 'past_due' | 'canceled' | 'unpaid'
export type ConversationStatus = 'active' | 'resolved' | 'archived'
export type MessageRole        = 'user' | 'assistant' | 'system'
export type OrderType          = 'delivery' | 'pickup' | 'dine_in'
export type OrderStatus        = 'pending' | 'confirmed' | 'preparing' | 'ready' | 'delivered' | 'canceled'
export type ReservationStatus  = 'pending' | 'confirmed' | 'canceled' | 'no_show'

export interface Database {
  public: {
    Tables: {

      tenants: {
        Row: { id: string; name: string; slug: string; owner_id: string; logo_url: string | null; primary_color: string; timezone: string; currency: string; is_active: boolean; created_at: string; updated_at: string }
        Insert: { id?: string; name: string; slug: string; owner_id: string; logo_url?: string | null; primary_color?: string; timezone?: string; currency?: string; is_active?: boolean; created_at?: string; updated_at?: string }
        Update: { id?: string; name?: string; slug?: string; owner_id?: string; logo_url?: string | null; primary_color?: string; timezone?: string; currency?: string; is_active?: boolean; created_at?: string; updated_at?: string }
        Relationships: []
      }

      profiles: {
        Row: { id: string; tenant_id: string | null; full_name: string | null; role: UserRole; created_at: string; updated_at: string }
        Insert: { id: string; tenant_id?: string | null; full_name?: string | null; role?: UserRole; created_at?: string; updated_at?: string }
        Update: { id?: string; tenant_id?: string | null; full_name?: string | null; role?: UserRole; created_at?: string; updated_at?: string }
        Relationships: [{ foreignKeyName: "profiles_tenant_id_fkey"; columns: ["tenant_id"]; isOneToOne: false; referencedRelation: "tenants"; referencedColumns: ["id"] }]
      }

      subscriptions: {
        Row: { id: string; tenant_id: string; stripe_customer_id: string | null; stripe_subscription_id: string | null; plan: string; status: SubscriptionStatus; trial_ends_at: string | null; current_period_start: string | null; current_period_end: string | null; created_at: string; updated_at: string }
        Insert: { id?: string; tenant_id: string; stripe_customer_id?: string | null; stripe_subscription_id?: string | null; plan?: string; status?: SubscriptionStatus; trial_ends_at?: string | null; current_period_start?: string | null; current_period_end?: string | null; created_at?: string; updated_at?: string }
        Update: { id?: string; tenant_id?: string; stripe_customer_id?: string | null; stripe_subscription_id?: string | null; plan?: string; status?: SubscriptionStatus; trial_ends_at?: string | null; current_period_start?: string | null; current_period_end?: string | null; created_at?: string; updated_at?: string }
        Relationships: [{ foreignKeyName: "subscriptions_tenant_id_fkey"; columns: ["tenant_id"]; isOneToOne: true; referencedRelation: "tenants"; referencedColumns: ["id"] }]
      }

      channels: {
        Row: { id: string; tenant_id: string; type: ChannelType; config: Json; is_active: boolean; created_at: string; updated_at: string }
        Insert: { id?: string; tenant_id: string; type: ChannelType; config?: Json; is_active?: boolean; created_at?: string; updated_at?: string }
        Update: { id?: string; tenant_id?: string; type?: ChannelType; config?: Json; is_active?: boolean; created_at?: string; updated_at?: string }
        Relationships: [{ foreignKeyName: "channels_tenant_id_fkey"; columns: ["tenant_id"]; isOneToOne: false; referencedRelation: "tenants"; referencedColumns: ["id"] }]
      }

      menu_categories: {
        Row: { id: string; tenant_id: string; name: string; description: string | null; sort_order: number; is_active: boolean; created_at: string; updated_at: string }
        Insert: { id?: string; tenant_id: string; name: string; description?: string | null; sort_order?: number; is_active?: boolean; created_at?: string; updated_at?: string }
        Update: { id?: string; tenant_id?: string; name?: string; description?: string | null; sort_order?: number; is_active?: boolean; created_at?: string; updated_at?: string }
        Relationships: [{ foreignKeyName: "menu_categories_tenant_id_fkey"; columns: ["tenant_id"]; isOneToOne: false; referencedRelation: "tenants"; referencedColumns: ["id"] }]
      }

      menu_items: {
        Row: { id: string; tenant_id: string; category_id: string; name: string; description: string | null; base_price: number; image_url: string | null; allergens: string[]; is_vegetarian: boolean; is_vegan: boolean; is_gluten_free: boolean; is_available: boolean; sort_order: number; created_at: string; updated_at: string }
        Insert: { id?: string; tenant_id: string; category_id: string; name: string; description?: string | null; base_price: number; image_url?: string | null; allergens?: string[]; is_vegetarian?: boolean; is_vegan?: boolean; is_gluten_free?: boolean; is_available?: boolean; sort_order?: number; created_at?: string; updated_at?: string }
        Update: { id?: string; tenant_id?: string; category_id?: string; name?: string; description?: string | null; base_price?: number; image_url?: string | null; allergens?: string[]; is_vegetarian?: boolean; is_vegan?: boolean; is_gluten_free?: boolean; is_available?: boolean; sort_order?: number; created_at?: string; updated_at?: string }
        Relationships: [{ foreignKeyName: "menu_items_category_id_fkey"; columns: ["category_id"]; isOneToOne: false; referencedRelation: "menu_categories"; referencedColumns: ["id"] }, { foreignKeyName: "menu_items_tenant_id_fkey"; columns: ["tenant_id"]; isOneToOne: false; referencedRelation: "tenants"; referencedColumns: ["id"] }]
      }

      menu_option_groups: {
        Row: { id: string; tenant_id: string; menu_item_id: string; name: string; is_required: boolean; max_selections: number | null; sort_order: number; created_at: string; updated_at: string }
        Insert: { id?: string; tenant_id: string; menu_item_id: string; name: string; is_required?: boolean; max_selections?: number | null; sort_order?: number; created_at?: string; updated_at?: string }
        Update: { id?: string; tenant_id?: string; menu_item_id?: string; name?: string; is_required?: boolean; max_selections?: number | null; sort_order?: number; created_at?: string; updated_at?: string }
        Relationships: [{ foreignKeyName: "menu_option_groups_menu_item_id_fkey"; columns: ["menu_item_id"]; isOneToOne: false; referencedRelation: "menu_items"; referencedColumns: ["id"] }]
      }

      menu_options: {
        Row: { id: string; tenant_id: string; option_group_id: string; name: string; price_delta: number; is_available: boolean; sort_order: number; created_at: string; updated_at: string }
        Insert: { id?: string; tenant_id: string; option_group_id: string; name: string; price_delta?: number; is_available?: boolean; sort_order?: number; created_at?: string; updated_at?: string }
        Update: { id?: string; tenant_id?: string; option_group_id?: string; name?: string; price_delta?: number; is_available?: boolean; sort_order?: number; created_at?: string; updated_at?: string }
        Relationships: [{ foreignKeyName: "menu_options_option_group_id_fkey"; columns: ["option_group_id"]; isOneToOne: false; referencedRelation: "menu_option_groups"; referencedColumns: ["id"] }]
      }

      faqs: {
        Row: { id: string; tenant_id: string; question: string; answer: string; sort_order: number; is_active: boolean; created_at: string; updated_at: string }
        Insert: { id?: string; tenant_id: string; question: string; answer: string; sort_order?: number; is_active?: boolean; created_at?: string; updated_at?: string }
        Update: { id?: string; tenant_id?: string; question?: string; answer?: string; sort_order?: number; is_active?: boolean; created_at?: string; updated_at?: string }
        Relationships: [{ foreignKeyName: "faqs_tenant_id_fkey"; columns: ["tenant_id"]; isOneToOne: false; referencedRelation: "tenants"; referencedColumns: ["id"] }]
      }

      conversations: {
        Row: { id: string; tenant_id: string; channel_type: ChannelType; external_id: string; customer_name: string | null; customer_phone: string | null; status: ConversationStatus; metadata: Json; created_at: string; updated_at: string }
        Insert: { id?: string; tenant_id: string; channel_type: ChannelType; external_id: string; customer_name?: string | null; customer_phone?: string | null; status?: ConversationStatus; metadata?: Json; created_at?: string; updated_at?: string }
        Update: { id?: string; tenant_id?: string; channel_type?: ChannelType; external_id?: string; customer_name?: string | null; customer_phone?: string | null; status?: ConversationStatus; metadata?: Json; created_at?: string; updated_at?: string }
        Relationships: [{ foreignKeyName: "conversations_tenant_id_fkey"; columns: ["tenant_id"]; isOneToOne: false; referencedRelation: "tenants"; referencedColumns: ["id"] }]
      }

      messages: {
        Row: { id: string; tenant_id: string; conversation_id: string; role: MessageRole; content: string; external_message_id: string | null; metadata: Json; created_at: string }
        Insert: { id?: string; tenant_id: string; conversation_id: string; role: MessageRole; content: string; external_message_id?: string | null; metadata?: Json; created_at?: string }
        Update: Record<string, never>
        Relationships: [{ foreignKeyName: "messages_conversation_id_fkey"; columns: ["conversation_id"]; isOneToOne: false; referencedRelation: "conversations"; referencedColumns: ["id"] }]
      }

      orders: {
        Row: { id: string; tenant_id: string; conversation_id: string | null; order_number: string; customer_name: string | null; customer_phone: string | null; type: OrderType; status: OrderStatus; delivery_address: string | null; notes: string | null; subtotal: number; total: number; estimated_time_minutes: number | null; created_at: string; updated_at: string }
        Insert: { id?: string; tenant_id: string; conversation_id?: string | null; order_number: string; customer_name?: string | null; customer_phone?: string | null; type?: OrderType; status?: OrderStatus; delivery_address?: string | null; notes?: string | null; subtotal?: number; total?: number; estimated_time_minutes?: number | null; created_at?: string; updated_at?: string }
        Update: { id?: string; tenant_id?: string; conversation_id?: string | null; order_number?: string; customer_name?: string | null; customer_phone?: string | null; type?: OrderType; status?: OrderStatus; delivery_address?: string | null; notes?: string | null; subtotal?: number; total?: number; estimated_time_minutes?: number | null; created_at?: string; updated_at?: string }
        Relationships: [{ foreignKeyName: "orders_tenant_id_fkey"; columns: ["tenant_id"]; isOneToOne: false; referencedRelation: "tenants"; referencedColumns: ["id"] }]
      }

      order_items: {
        Row: { id: string; tenant_id: string; order_id: string; menu_item_id: string | null; name: string; unit_price: number; quantity: number; subtotal: number; notes: string | null; created_at: string }
        Insert: { id?: string; tenant_id: string; order_id: string; menu_item_id?: string | null; name: string; unit_price: number; quantity?: number; subtotal: number; notes?: string | null; created_at?: string }
        Update: Record<string, never>
        Relationships: [{ foreignKeyName: "order_items_order_id_fkey"; columns: ["order_id"]; isOneToOne: false; referencedRelation: "orders"; referencedColumns: ["id"] }]
      }

      order_item_options: {
        Row: { id: string; tenant_id: string; order_item_id: string; menu_option_id: string | null; name: string; price_delta: number; created_at: string }
        Insert: { id?: string; tenant_id: string; order_item_id: string; menu_option_id?: string | null; name: string; price_delta?: number; created_at?: string }
        Update: Record<string, never>
        Relationships: [{ foreignKeyName: "order_item_options_order_item_id_fkey"; columns: ["order_item_id"]; isOneToOne: false; referencedRelation: "order_items"; referencedColumns: ["id"] }]
      }

      reservations: {
        Row: { id: string; tenant_id: string; conversation_id: string | null; customer_name: string; customer_phone: string | null; party_size: number; reserved_at: string; status: ReservationStatus; notes: string | null; created_at: string; updated_at: string }
        Insert: { id?: string; tenant_id: string; conversation_id?: string | null; customer_name: string; customer_phone?: string | null; party_size: number; reserved_at: string; status?: ReservationStatus; notes?: string | null; created_at?: string; updated_at?: string }
        Update: { id?: string; tenant_id?: string; conversation_id?: string | null; customer_name?: string; customer_phone?: string | null; party_size?: number; reserved_at?: string; status?: ReservationStatus; notes?: string | null; created_at?: string; updated_at?: string }
        Relationships: [{ foreignKeyName: "reservations_tenant_id_fkey"; columns: ["tenant_id"]; isOneToOne: false; referencedRelation: "tenants"; referencedColumns: ["id"] }]
      }

    }
    Views: Record<string, never>
    Functions: Record<string, never>
    Enums: Record<string, never>
    CompositeTypes: Record<string, never>
  }
}
