export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
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
        Relationships: [
          {
            foreignKeyName: "customers_store_id_fkey"
            columns: ["store_id"]
            isOneToOne: false
            referencedRelation: "stores"
            referencedColumns: ["id"]
          },
        ]
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
          unit_id: string | null
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
          unit_id?: string | null
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
          unit_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "inventory_transactions_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "inventory_transactions_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "v_product_stock"
            referencedColumns: ["product_id"]
          },
          {
            foreignKeyName: "inventory_transactions_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "v_product_unit_stock"
            referencedColumns: ["product_id"]
          },
          {
            foreignKeyName: "inventory_transactions_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "v_product_with_stock"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "inventory_transactions_store_id_fkey"
            columns: ["store_id"]
            isOneToOne: false
            referencedRelation: "stores"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "inventory_transactions_unit_id_fkey"
            columns: ["unit_id"]
            isOneToOne: false
            referencedRelation: "product_units"
            referencedColumns: ["id"]
          },
        ]
      }
      payments: {
        Row: {
          amount: number
          created_at: string
          customer_id: string | null
          direction: Database["public"]["Enums"]["payment_direction"]
          id: string
          notes: string | null
          payment_date: string
          store_id: string
          supplier_id: string | null
          updated_at: string
        }
        Insert: {
          amount: number
          created_at?: string
          customer_id?: string | null
          direction: Database["public"]["Enums"]["payment_direction"]
          id?: string
          notes?: string | null
          payment_date?: string
          store_id: string
          supplier_id?: string | null
          updated_at?: string
        }
        Update: {
          amount?: number
          created_at?: string
          customer_id?: string | null
          direction?: Database["public"]["Enums"]["payment_direction"]
          id?: string
          notes?: string | null
          payment_date?: string
          store_id?: string
          supplier_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "payments_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payments_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "v_customer_balance"
            referencedColumns: ["customer_id"]
          },
          {
            foreignKeyName: "payments_store_id_fkey"
            columns: ["store_id"]
            isOneToOne: false
            referencedRelation: "stores"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payments_supplier_id_fkey"
            columns: ["supplier_id"]
            isOneToOne: false
            referencedRelation: "suppliers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payments_supplier_id_fkey"
            columns: ["supplier_id"]
            isOneToOne: false
            referencedRelation: "v_supplier_balance"
            referencedColumns: ["supplier_id"]
          },
        ]
      }
      product_units: {
        Row: {
          created_at: string
          id: string
          name: string
          product_id: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          name: string
          product_id: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          name?: string
          product_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "product_units_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "product_units_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "v_product_stock"
            referencedColumns: ["product_id"]
          },
          {
            foreignKeyName: "product_units_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "v_product_unit_stock"
            referencedColumns: ["product_id"]
          },
          {
            foreignKeyName: "product_units_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "v_product_with_stock"
            referencedColumns: ["id"]
          },
        ]
      }
      products: {
        Row: {
          barcode: string | null
          category: string | null
          created_at: string
          description: string | null
          id: string
          is_favorite: boolean
          minimum_stock: number
          name: string
          purchase_price: number
          recently_used_at: string | null
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
          is_favorite?: boolean
          minimum_stock?: number
          name: string
          purchase_price?: number
          recently_used_at?: string | null
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
          is_favorite?: boolean
          minimum_stock?: number
          name?: string
          purchase_price?: number
          recently_used_at?: string | null
          sale_price?: number
          search_blob?: string | null
          sku?: string | null
          store_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "products_store_id_fkey"
            columns: ["store_id"]
            isOneToOne: false
            referencedRelation: "stores"
            referencedColumns: ["id"]
          },
        ]
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
          unit_id: string | null
        }
        Insert: {
          discount?: number
          id?: string
          invoice_id: string
          line_total: number
          product_id: string
          quantity: number
          unit_cost: number
          unit_id?: string | null
        }
        Update: {
          discount?: number
          id?: string
          invoice_id?: string
          line_total?: number
          product_id?: string
          quantity?: number
          unit_cost?: number
          unit_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "purchase_invoice_items_invoice_id_fkey"
            columns: ["invoice_id"]
            isOneToOne: false
            referencedRelation: "purchase_invoices"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "purchase_invoice_items_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "purchase_invoice_items_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "v_product_stock"
            referencedColumns: ["product_id"]
          },
          {
            foreignKeyName: "purchase_invoice_items_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "v_product_unit_stock"
            referencedColumns: ["product_id"]
          },
          {
            foreignKeyName: "purchase_invoice_items_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "v_product_with_stock"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "purchase_invoice_items_unit_id_fkey"
            columns: ["unit_id"]
            isOneToOne: false
            referencedRelation: "product_units"
            referencedColumns: ["id"]
          },
        ]
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
        Relationships: [
          {
            foreignKeyName: "purchase_invoices_store_id_fkey"
            columns: ["store_id"]
            isOneToOne: false
            referencedRelation: "stores"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "purchase_invoices_supplier_id_fkey"
            columns: ["supplier_id"]
            isOneToOne: false
            referencedRelation: "suppliers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "purchase_invoices_supplier_id_fkey"
            columns: ["supplier_id"]
            isOneToOne: false
            referencedRelation: "v_supplier_balance"
            referencedColumns: ["supplier_id"]
          },
        ]
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
          unit_id: string | null
          unit_price: number
        }
        Insert: {
          discount?: number
          id?: string
          invoice_id: string
          line_total: number
          product_id: string
          quantity: number
          unit_cost?: number
          unit_id?: string | null
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
          unit_id?: string | null
          unit_price?: number
        }
        Relationships: [
          {
            foreignKeyName: "sales_invoice_items_invoice_id_fkey"
            columns: ["invoice_id"]
            isOneToOne: false
            referencedRelation: "sales_invoices"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sales_invoice_items_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sales_invoice_items_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "v_product_stock"
            referencedColumns: ["product_id"]
          },
          {
            foreignKeyName: "sales_invoice_items_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "v_product_unit_stock"
            referencedColumns: ["product_id"]
          },
          {
            foreignKeyName: "sales_invoice_items_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "v_product_with_stock"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sales_invoice_items_unit_id_fkey"
            columns: ["unit_id"]
            isOneToOne: false
            referencedRelation: "product_units"
            referencedColumns: ["id"]
          },
        ]
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
        Relationships: [
          {
            foreignKeyName: "sales_invoices_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sales_invoices_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "v_customer_balance"
            referencedColumns: ["customer_id"]
          },
          {
            foreignKeyName: "sales_invoices_store_id_fkey"
            columns: ["store_id"]
            isOneToOne: false
            referencedRelation: "stores"
            referencedColumns: ["id"]
          },
        ]
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
        Relationships: [
          {
            foreignKeyName: "suppliers_store_id_fkey"
            columns: ["store_id"]
            isOneToOne: false
            referencedRelation: "stores"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      v_customer_balance: {
        Row: {
          balance: number | null
          customer_id: string | null
          store_id: string | null
        }
        Insert: {
          balance?: never
          customer_id?: string | null
          store_id?: string | null
        }
        Update: {
          balance?: never
          customer_id?: string | null
          store_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "customers_store_id_fkey"
            columns: ["store_id"]
            isOneToOne: false
            referencedRelation: "stores"
            referencedColumns: ["id"]
          },
        ]
      }
      v_product_stock: {
        Row: {
          current_stock: number | null
          product_id: string | null
          store_id: string | null
        }
        Relationships: [
          {
            foreignKeyName: "products_store_id_fkey"
            columns: ["store_id"]
            isOneToOne: false
            referencedRelation: "stores"
            referencedColumns: ["id"]
          },
        ]
      }
      v_product_unit_stock: {
        Row: {
          current_stock: number | null
          product_id: string | null
          store_id: string | null
          unit_id: string | null
        }
        Relationships: [
          {
            foreignKeyName: "inventory_transactions_unit_id_fkey"
            columns: ["unit_id"]
            isOneToOne: false
            referencedRelation: "product_units"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "products_store_id_fkey"
            columns: ["store_id"]
            isOneToOne: false
            referencedRelation: "stores"
            referencedColumns: ["id"]
          },
        ]
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
        Relationships: [
          {
            foreignKeyName: "products_store_id_fkey"
            columns: ["store_id"]
            isOneToOne: false
            referencedRelation: "stores"
            referencedColumns: ["id"]
          },
        ]
      }
      v_supplier_balance: {
        Row: {
          balance: number | null
          store_id: string | null
          supplier_id: string | null
        }
        Insert: {
          balance?: never
          store_id?: string | null
          supplier_id?: string | null
        }
        Update: {
          balance?: never
          store_id?: string | null
          supplier_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "suppliers_store_id_fkey"
            columns: ["store_id"]
            isOneToOne: false
            referencedRelation: "stores"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Functions: {
      create_purchase_invoice: {
        Args: {
          p_discount: number
          p_invoice_number: string
          p_items: Json
          p_notes: string
          p_paid: number
          p_store_id: string
          p_supplier_id: string
        }
        Returns: string
      }
      create_sale_invoice: {
        Args: {
          p_customer_id: string
          p_discount: number
          p_invoice_number: string
          p_items: Json
          p_notes: string
          p_paid: number
          p_store_id: string
        }
        Returns: string
      }
      dashboard_summary: { Args: { p_store_id: string }; Returns: Json }
      fn_resync_purchase_totals: {
        Args: { p_invoice: string }
        Returns: undefined
      }
      fn_resync_sales_totals: {
        Args: { p_invoice: string }
        Returns: undefined
      }
      low_stock: {
        Args: { p_store_id: string }
        Returns: {
          current_stock: number
          id: string
          minimum_stock: number
          name: string
          sku: string
        }[]
      }
      merge_customers: {
        Args: { p_primary_id: string; p_secondary_id: string }
        Returns: undefined
      }
      merge_products: {
        Args: { p_primary_id: string; p_secondary_id: string }
        Returns: undefined
      }
      merge_suppliers: {
        Args: { p_primary_id: string; p_secondary_id: string }
        Returns: undefined
      }
      normalize_arabic: { Args: { input: string }; Returns: string }
      sales_by_period: {
        Args: { p_period: string; p_store_id: string }
        Returns: {
          key: string
          total: number
        }[]
      }
      search_customers: {
        Args: { p_limit?: number; p_query: string; p_store_id: string }
        Returns: {
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
        }[]
        SetofOptions: {
          from: "*"
          to: "customers"
          isOneToOne: false
          isSetofReturn: true
        }
      }
      search_products: {
        Args: {
          p_limit?: number
          p_query: string
          p_sort_by?: string
          p_store_id: string
        }
        Returns: {
          barcode: string
          category: string
          created_at: string
          current_stock: number
          description: string
          id: string
          is_favorite: boolean
          minimum_stock: number
          name: string
          purchase_price: number
          recently_used_at: string
          sale_price: number
          sku: string
          store_id: string
          updated_at: string
        }[]
      }
      search_suppliers: {
        Args: { p_limit?: number; p_query: string; p_store_id: string }
        Returns: {
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
        }[]
        SetofOptions: {
          from: "*"
          to: "suppliers"
          isOneToOne: false
          isSetofReturn: true
        }
      }
      seed_demo_store: { Args: never; Returns: string }
      top_customers: {
        Args: { p_limit?: number; p_store_id: string }
        Returns: {
          customer_id: string
          customer_name: string
          phone: string
          total: number
        }[]
      }
      update_purchase_invoice: {
        Args: {
          p_discount: number
          p_invoice_id: string
          p_invoice_number: string
          p_items: Json
          p_notes: string
          p_paid: number
          p_supplier_id: string
        }
        Returns: undefined
      }
      update_sale_invoice: {
        Args: {
          p_customer_id: string
          p_discount: number
          p_invoice_id: string
          p_invoice_number: string
          p_items: Json
          p_notes: string
          p_paid: number
        }
        Returns: undefined
      }
    }
    Enums: {
      inventory_tx_type: "IN" | "OUT" | "ADJUSTMENT"
      payment_direction: "IN" | "OUT"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {
      inventory_tx_type: ["IN", "OUT", "ADJUSTMENT"],
      payment_direction: ["IN", "OUT"],
    },
  },
} as const
