export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  __InternalSupabase: {
    PostgrestVersion: "14.5"
  }
  public: {
    Tables: {
      customers: {
        Row: {
          address: string | null
          created_at: string
          id: string
          name: string
          notes: string | null
          opening_balance: number
          phone: string | null
          search_blob: string | null
          store_id: string
          updated_at: string
        }
        Insert: {
          address?: string | null
          created_at?: string
          id?: string
          name: string
          notes?: string | null
          opening_balance?: number
          phone?: string | null
          search_blob?: string | null
          store_id: string
          updated_at?: string
        }
        Update: {
          address?: string | null
          created_at?: string
          id?: string
          name?: string
          notes?: string | null
          opening_balance?: number
          phone?: string | null
          search_blob?: string | null
          store_id?: string
          updated_at?: string
        }
        Relationships: []
      }
      inventory_transactions: {
        Row: {
          created_at: string
          id: string
          note: string | null
          product_id: string
          quantity: number
          reference_id: string | null
          reference_type: string | null
          store_id: string
          type: Database["public"]["Enums"]["inventory_tx_type"]
          unit_cost: number
        }
        Insert: {
          created_at?: string
          id?: string
          note?: string | null
          product_id: string
          quantity: number
          reference_id?: string | null
          reference_type?: string | null
          store_id: string
          type: Database["public"]["Enums"]["inventory_tx_type"]
          unit_cost?: number
        }
        Update: {
          created_at?: string
          id?: string
          note?: string | null
          product_id?: string
          quantity?: number
          reference_id?: string | null
          reference_type?: string | null
          store_id?: string
          type?: Database["public"]["Enums"]["inventory_tx_type"]
          unit_cost?: number
        }
        Relationships: []
      }
      products: {
        Row: {
          barcode: string | null
          category: string | null
          created_at: string
          description: string | null
          id: string
          minimum_stock: number
          name: string
          purchase_price: number
          sale_price: number
          search_blob: string | null
          sku: string | null
          store_id: string
          updated_at: string
        }
        Insert: {
          barcode?: string | null
          category?: string | null
          created_at?: string
          description?: string | null
          id?: string
          minimum_stock?: number
          name: string
          purchase_price?: number
          sale_price?: number
          search_blob?: string | null
          sku?: string | null
          store_id: string
          updated_at?: string
        }
        Update: {
          barcode?: string | null
          category?: string | null
          created_at?: string
          description?: string | null
          id?: string
          minimum_stock?: number
          name?: string
          purchase_price?: number
          sale_price?: number
          search_blob?: string | null
          sku?: string | null
          store_id?: string
          updated_at?: string
        }
        Relationships: []
      }
      purchase_invoice_items: {
        Row: {
          discount: number
          id: string
          invoice_id: string
          line_total: number
          product_id: string
          quantity: number
          unit_cost: number
        }
        Insert: {
          discount?: number
          id?: string
          invoice_id: string
          line_total?: number
          product_id: string
          quantity: number
          unit_cost: number
        }
        Update: {
          discount?: number
          id?: string
          invoice_id?: string
          line_total?: number
          product_id?: string
          quantity?: number
          unit_cost?: number
        }
        Relationships: []
      }
      purchase_invoices: {
        Row: {
          created_at: string
          discount: number
          id: string
          invoice_date: string
          invoice_number: string | null
          notes: string | null
          paid: number
          store_id: string
          subtotal: number
          supplier_id: string | null
          total: number
        }
        Insert: {
          created_at?: string
          discount?: number
          id?: string
          invoice_date?: string
          invoice_number?: string | null
          notes?: string | null
          paid?: number
          store_id: string
          subtotal?: number
          supplier_id?: string | null
          total?: number
        }
        Update: {
          created_at?: string
          discount?: number
          id?: string
          invoice_date?: string
          invoice_number?: string | null
          notes?: string | null
          paid?: number
          store_id?: string
          subtotal?: number
          supplier_id?: string | null
          total?: number
        }
        Relationships: []
      }
      sales_invoice_items: {
        Row: {
          discount: number
          id: string
          invoice_id: string
          line_total: number
          product_id: string
          quantity: number
          unit_cost: number
          unit_price: number
        }
        Insert: {
          discount?: number
          id?: string
          invoice_id: string
          line_total?: number
          product_id: string
          quantity: number
          unit_cost?: number
          unit_price: number
        }
        Update: {
          discount?: number
          id?: string
          invoice_id?: string
          line_total?: number
          product_id?: string
          quantity?: number
          unit_cost?: number
          unit_price?: number
        }
        Relationships: []
      }
      sales_invoices: {
        Row: {
          created_at: string
          customer_id: string | null
          discount: number
          id: string
          invoice_date: string
          invoice_number: string | null
          notes: string | null
          paid: number
          store_id: string
          subtotal: number
          total: number
        }
        Insert: {
          created_at?: string
          customer_id?: string | null
          discount?: number
          id?: string
          invoice_date?: string
          invoice_number?: string | null
          notes?: string | null
          paid?: number
          store_id: string
          subtotal?: number
          total?: number
        }
        Update: {
          created_at?: string
          customer_id?: string | null
          discount?: number
          id?: string
          invoice_date?: string
          invoice_number?: string | null
          notes?: string | null
          paid?: number
          store_id?: string
          subtotal?: number
          total?: number
        }
        Relationships: []
      }
      stores: {
        Row: {
          created_at: string
          currency: string
          id: string
          name: string
          owner_id: string
          store_type: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          currency?: string
          id?: string
          name: string
          owner_id: string
          store_type?: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          currency?: string
          id?: string
          name?: string
          owner_id?: string
          store_type?: string
          updated_at?: string
        }
        Relationships: []
      }
      suppliers: {
        Row: {
          address: string | null
          created_at: string
          id: string
          name: string
          notes: string | null
          opening_balance: number
          phone: string | null
          search_blob: string | null
          store_id: string
          updated_at: string
        }
        Insert: {
          address?: string | null
          created_at?: string
          id?: string
          name: string
          notes?: string | null
          opening_balance?: number
          phone?: string | null
          search_blob?: string | null
          store_id: string
          updated_at?: string
        }
        Update: {
          address?: string | null
          created_at?: string
          id?: string
          name?: string
          notes?: string | null
          opening_balance?: number
          phone?: string | null
          search_blob?: string | null
          store_id?: string
          updated_at?: string
        }
        Relationships: []
      }
    }
    Views: {
      v_customer_balance: {
        Row: { balance: number | null; customer_id: string | null; store_id: string | null }
        Relationships: []
      }
      v_product_stock: {
        Row: { current_stock: number | null; product_id: string | null; store_id: string | null }
        Relationships: []
      }
      v_product_with_stock: {
        Row: {
          barcode: string | null
          category: string | null
          created_at: string | null
          current_stock: number | null
          description: string | null
          id: string | null
          minimum_stock: number | null
          name: string | null
          purchase_price: number | null
          sale_price: number | null
          search_blob: string | null
          sku: string | null
          store_id: string | null
          updated_at: string | null
        }
        Relationships: []
      }
      v_supplier_balance: {
        Row: { balance: number | null; store_id: string | null; supplier_id: string | null }
        Relationships: []
      }
    }
    Functions: {
      create_purchase_invoice: {
        Args: {
          p_discount: number
          p_invoice_number: string | null
          p_items: Json
          p_notes: string | null
          p_paid: number
          p_store_id: string
          p_supplier_id: string | null
        }
        Returns: string
      }
      create_sale_invoice: {
        Args: {
          p_customer_id: string | null
          p_discount: number
          p_invoice_number: string | null
          p_items: Json
          p_notes: string | null
          p_paid: number
          p_store_id: string
        }
        Returns: string
      }
      dashboard_summary: { Args: { p_store_id: string }; Returns: Json }
      low_stock: {
        Args: { p_store_id: string }
        Returns: {
          current_stock: number
          id: string
          minimum_stock: number
          name: string
          sku: string | null
        }[]
      }
      normalize_arabic: { Args: { input: string }; Returns: string }
      sales_by_period: {
        Args: { p_period: string; p_store_id: string }
        Returns: { key: string; total: number }[]
      }
      search_customers: {
        Args: { p_limit?: number; p_query: string; p_store_id: string }
        Returns: Database["public"]["Tables"]["customers"]["Row"][]
      }
      search_products: {
        Args: { p_limit?: number; p_query: string; p_store_id: string }
        Returns: {
          barcode: string | null
          category: string | null
          created_at: string
          current_stock: number
          description: string | null
          id: string
          minimum_stock: number
          name: string
          purchase_price: number
          sale_price: number
          sku: string | null
          store_id: string
          updated_at: string
        }[]
      }
      search_suppliers: {
        Args: { p_limit?: number; p_query: string; p_store_id: string }
        Returns: Database["public"]["Tables"]["suppliers"]["Row"][]
      }
      seed_demo_store: { Args: Record<string, never>; Returns: string }
      top_customers: {
        Args: { p_limit?: number; p_store_id: string }
        Returns: {
          customer_id: string
          customer_name: string
          phone: string | null
          total: number
        }[]
      }
    }
    Enums: {
      inventory_tx_type: "IN" | "OUT" | "ADJUSTMENT"
    }
    CompositeTypes: { [_ in never]: never }
  }
}
