/**
 * Supabase database types — hand-authored until `supabase gen types typescript` is run.
 * After linking a Supabase project, regenerate with:
 *   npx supabase gen types typescript --project-id <id> > types/database.ts
 */

export type Json = string | number | boolean | null | { [key: string]: Json } | Json[]

export type ChannelType = 'whatsapp' | 'sms' | 'telegram'
export type UserRole = 'owner' | 'staff'
export type SubscriptionStatus = 'trialing' | 'active' | 'past_due' | 'canceled' | 'unpaid'
export type ConversationStatus = 'active' | 'resolved' | 'archived'
export type MessageRole = 'user' | 'assistant' | 'system'
export type OrderType = 'delivery' | 'pickup' | 'dine_in'
export type OrderStatus = 'pending' | 'confirmed' | 'preparing' | 'ready' | 'delivered' | 'canceled'
export type ReservationStatus = 'pending' | 'confirmed' | 'canceled' | 'no_show'

export interface Database {
  public: {
    Tables: {
      tenants: {
        Row: {
          id: string
          name: string
          slug: string
          owner_id: string
          logo_url: string | null
          primary_color: string
          timezone: string
          currency: string
          is_active: boolean
          created_at: string
          updated_at: string
        }
        Insert: Omit<Database['public']['Tables']['tenants']['Row'], 'id' | 'created_at' | 'updated_at'>
        Update: Partial<Database['public']['Tables']['tenants']['Insert']>
      }
      profiles: {
        Row: {
          id: string
          tenant_id: string | null
          full_name: string | null
          role: UserRole
          created_at: string
          updated_at: string
        }
        Insert: Omit<Database['public']['Tables']['profiles']['Row'], 'created_at' | 'updated_at'>
        Update: Partial<Database['public']['Tables']['profiles']['Insert']>
      }
      subscriptions: {
        Row: {
          id: string
          tenant_id: string
          stripe_customer_id: string | null
          stripe_subscription_id: string | null
          plan: string
          status: SubscriptionStatus
          trial_ends_at: string | null
          current_period_start: string | null
          current_period_end: string | null
          created_at: string
          updated_at: string
        }
        Insert: Omit<Database['public']['Tables']['subscriptions']['Row'], 'id' | 'created_at' | 'updated_at'>
        Update: Partial<Database['public']['Tables']['subscriptions']['Insert']>
      }
      channels: {
        Row: {
          id: string
          tenant_id: string
          type: ChannelType
          config: Json
          is_active: boolean
          created_at: string
          updated_at: string
        }
        Insert: Omit<Database['public']['Tables']['channels']['Row'], 'id' | 'created_at' | 'updated_at'>
        Update: Partial<Database['public']['Tables']['channels']['Insert']>
      }
      menu_categories: {
        Row: {
          id: string
          tenant_id: string
          name: string
          description: string | null
          sort_order: number
          is_active: boolean
          created_at: string
          updated_at: string
        }
        Insert: Omit<Database['public']['Tables']['menu_categories']['Row'], 'id' | 'created_at' | 'updated_at'>
        Update: Partial<Database['public']['Tables']['menu_categories']['Insert']>
      }
      menu_items: {
        Row: {
          id: string
          tenant_id: string
          category_id: string
          name: string
          description: string | null
          base_price: number
          image_url: string | null
          allergens: string[]
          is_vegetarian: boolean
          is_vegan: boolean
          is_gluten_free: boolean
          is_available: boolean
          sort_order: number
          created_at: string
          updated_at: string
        }
        Insert: Omit<Database['public']['Tables']['menu_items']['Row'], 'id' | 'created_at' | 'updated_at'>
        Update: Partial<Database['public']['Tables']['menu_items']['Insert']>
      }
      menu_option_groups: {
        Row: {
          id: string
          tenant_id: string
          menu_item_id: string
          name: string
          is_required: boolean
          max_selections: number | null
          sort_order: number
          created_at: string
          updated_at: string
        }
        Insert: Omit<Database['public']['Tables']['menu_option_groups']['Row'], 'id' | 'created_at' | 'updated_at'>
        Update: Partial<Database['public']['Tables']['menu_option_groups']['Insert']>
      }
      menu_options: {
        Row: {
          id: string
          tenant_id: string
          option_group_id: string
          name: string
          price_delta: number
          is_available: boolean
          sort_order: number
          created_at: string
          updated_at: string
        }
        Insert: Omit<Database['public']['Tables']['menu_options']['Row'], 'id' | 'created_at' | 'updated_at'>
        Update: Partial<Database['public']['Tables']['menu_options']['Insert']>
      }
      faqs: {
        Row: {
          id: string
          tenant_id: string
          question: string
          answer: string
          sort_order: number
          is_active: boolean
          created_at: string
          updated_at: string
        }
        Insert: Omit<Database['public']['Tables']['faqs']['Row'], 'id' | 'created_at' | 'updated_at'>
        Update: Partial<Database['public']['Tables']['faqs']['Insert']>
      }
      conversations: {
        Row: {
          id: string
          tenant_id: string
          channel_type: ChannelType
          external_id: string
          customer_name: string | null
          customer_phone: string | null
          status: ConversationStatus
          metadata: Json
          created_at: string
          updated_at: string
        }
        Insert: Omit<Database['public']['Tables']['conversations']['Row'], 'id' | 'created_at' | 'updated_at'>
        Update: Partial<Database['public']['Tables']['conversations']['Insert']>
      }
      messages: {
        Row: {
          id: string
          tenant_id: string
          conversation_id: string
          role: MessageRole
          content: string
          external_message_id: string | null
          metadata: Json
          created_at: string
        }
        Insert: Omit<Database['public']['Tables']['messages']['Row'], 'id' | 'created_at'>
        Update: never  // messages are immutable
      }
      orders: {
        Row: {
          id: string
          tenant_id: string
          conversation_id: string | null
          order_number: string
          customer_name: string | null
          customer_phone: string | null
          type: OrderType
          status: OrderStatus
          delivery_address: string | null
          notes: string | null
          subtotal: number
          total: number
          estimated_time_minutes: number | null
          created_at: string
          updated_at: string
        }
        Insert: Omit<Database['public']['Tables']['orders']['Row'], 'id' | 'created_at' | 'updated_at'>
        Update: Partial<Database['public']['Tables']['orders']['Insert']>
      }
      order_items: {
        Row: {
          id: string
          tenant_id: string
          order_id: string
          menu_item_id: string | null
          name: string
          unit_price: number
          quantity: number
          subtotal: number
          notes: string | null
          created_at: string
        }
        Insert: Omit<Database['public']['Tables']['order_items']['Row'], 'id' | 'created_at'>
        Update: never
      }
      order_item_options: {
        Row: {
          id: string
          tenant_id: string
          order_item_id: string
          menu_option_id: string | null
          name: string
          price_delta: number
          created_at: string
        }
        Insert: Omit<Database['public']['Tables']['order_item_options']['Row'], 'id' | 'created_at'>
        Update: never
      }
      reservations: {
        Row: {
          id: string
          tenant_id: string
          conversation_id: string | null
          customer_name: string
          customer_phone: string | null
          party_size: number
          reserved_at: string
          status: ReservationStatus
          notes: string | null
          created_at: string
          updated_at: string
        }
        Insert: Omit<Database['public']['Tables']['reservations']['Row'], 'id' | 'created_at' | 'updated_at'>
        Update: Partial<Database['public']['Tables']['reservations']['Insert']>
      }
    }
  }
}
