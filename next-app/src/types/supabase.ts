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
        PostgrestVersion: "14.1"
    }
    public: {
        Tables: {
            budget_items: {
                Row: {
                    budget_id: string | null
                    bv_pct: number | null
                    calculation_factor: number | null
                    client_transport_cost: number | null
                    created_at: string | null
                    customization_cost: number | null
                    customization_supplier_id: string | null
                    extra_expense: number | null
                    extra_supplier_id: string | null
                    id: string
                    is_approved: boolean | null
                    layout_cost: number | null
                    layout_supplier_id: string | null
                    product_name: string
                    quantity: number | null
                    supplier_id: string | null
                    supplier_transport_cost: number | null
                    total_item_value: number | null
                    transport_supplier_id: string | null
                    unit_price: number | null
                }
                Insert: {
                    budget_id?: string | null
                    bv_pct?: number | null
                    calculation_factor?: number | null
                    client_transport_cost?: number | null
                    created_at?: string | null
                    customization_cost?: number | null
                    customization_supplier_id?: string | null
                    extra_expense?: number | null
                    extra_supplier_id?: string | null
                    id?: string
                    is_approved?: boolean | null
                    layout_cost?: number | null
                    layout_supplier_id?: string | null
                    product_name: string
                    quantity?: number | null
                    supplier_id?: string | null
                    supplier_transport_cost?: number | null
                    total_item_value?: number | null
                    transport_supplier_id?: string | null
                    unit_price?: number | null
                }
                Update: {
                    budget_id?: string | null
                    bv_pct?: number | null
                    calculation_factor?: number | null
                    client_transport_cost?: number | null
                    created_at?: string | null
                    customization_cost?: number | null
                    customization_supplier_id?: string | null
                    extra_expense?: number | null
                    extra_supplier_id?: string | null
                    id?: string
                    is_approved?: boolean | null
                    layout_cost?: number | null
                    layout_supplier_id?: string | null
                    product_name?: string
                    quantity?: number | null
                    supplier_id?: string | null
                    supplier_transport_cost?: number | null
                    total_item_value?: number | null
                    transport_supplier_id?: string | null
                    unit_price?: number | null
                }
                Relationships: [
                    {
                        foreignKeyName: "budget_items_budget_id_fkey"
                        columns: ["budget_id"]
                        isOneToOne: false
                        referencedRelation: "budgets"
                        referencedColumns: ["id"]
                    },
                    {
                        foreignKeyName: "budget_items_customization_supplier_id_fkey"
                        columns: ["customization_supplier_id"]
                        isOneToOne: false
                        referencedRelation: "partners"
                        referencedColumns: ["id"]
                    },
                    {
                        foreignKeyName: "budget_items_extra_supplier_id_fkey"
                        columns: ["extra_supplier_id"]
                        isOneToOne: false
                        referencedRelation: "partners"
                        referencedColumns: ["id"]
                    },
                    {
                        foreignKeyName: "budget_items_layout_supplier_id_fkey"
                        columns: ["layout_supplier_id"]
                        isOneToOne: false
                        referencedRelation: "partners"
                        referencedColumns: ["id"]
                    },
                    {
                        foreignKeyName: "budget_items_supplier_id_fkey"
                        columns: ["supplier_id"]
                        isOneToOne: false
                        referencedRelation: "partners"
                        referencedColumns: ["id"]
                    },
                    {
                        foreignKeyName: "budget_items_transport_supplier_id_fkey"
                        columns: ["transport_supplier_id"]
                        isOneToOne: false
                        referencedRelation: "partners"
                        referencedColumns: ["id"]
                    },
                ]
            }
            budgets: {
                Row: {
                    budget_number: string
                    client_id: string | null
                    created_at: string | null
                    id: string
                    issuer: string | null
                    observation: string | null
                    salesperson: string
                    status: string | null
                    total_amount: number | null
                    updated_at: string | null
                }
                Insert: {
                    budget_number: string
                    client_id?: string | null
                    created_at?: string | null
                    id?: string
                    issuer?: string | null
                    observation?: string | null
                    salesperson: string
                    status?: string | null
                    total_amount?: number | null
                    updated_at?: string | null
                }
                Update: {
                    budget_number?: string
                    client_id?: string | null
                    created_at?: string | null
                    id?: string
                    issuer?: string | null
                    observation?: string | null
                    salesperson?: string
                    status?: string | null
                    total_amount?: number | null
                    updated_at?: string | null
                }
                Relationships: [
                    {
                        foreignKeyName: "budgets_client_id_fkey"
                        columns: ["client_id"]
                        isOneToOne: false
                        referencedRelation: "partners"
                        referencedColumns: ["id"]
                    },
                ]
            }
            calculation_factors: {
                Row: {
                    contingency_percent: number | null
                    created_at: string | null
                    description: string | null
                    id: string
                    margin_percent: number | null
                    name: string
                    tax_percent: number | null
                    updated_at: string | null
                }
                Insert: {
                    contingency_percent?: number | null
                    created_at?: string | null
                    description?: string | null
                    id?: string
                    margin_percent?: number | null
                    name: string
                    tax_percent?: number | null
                    updated_at?: string | null
                }
                Update: {
                    contingency_percent?: number | null
                    created_at?: string | null
                    description?: string | null
                    id?: string
                    margin_percent?: number | null
                    name?: string
                    tax_percent?: number | null
                    updated_at?: string | null
                }
                Relationships: []
            }
            commissions: {
                Row: {
                    amount: number
                    commission_percent: number | null
                    created_at: string | null
                    id: string
                    order_id: string | null
                    salesperson: string
                    status: string | null
                    type: string
                    updated_at: string | null
                }
                Insert: {
                    amount: number
                    commission_percent?: number | null
                    created_at?: string | null
                    id?: string
                    order_id?: string | null
                    salesperson: string
                    status?: string | null
                    type: string
                    updated_at?: string | null
                }
                Update: {
                    amount?: number
                    commission_percent?: number | null
                    created_at?: string | null
                    id?: string
                    order_id?: string | null
                    salesperson?: string
                    status?: string | null
                    type?: string
                    updated_at?: string | null
                }
                Relationships: [
                    {
                        foreignKeyName: "commissions_order_id_fkey"
                        columns: ["order_id"]
                        isOneToOne: false
                        referencedRelation: "orders"
                        referencedColumns: ["id"]
                    },
                ]
            }
            company_expenses: {
                Row: {
                    amount: number
                    amount_paid: number | null
                    category: string
                    created_at: string | null
                    description: string
                    due_date: string
                    id: string
                    issuer: string | null
                    observation: string | null
                    paid: boolean | null
                    paid_date: string | null
                    recurrence: string | null
                }
                Insert: {
                    amount?: number
                    amount_paid?: number | null
                    category: string
                    created_at?: string | null
                    description: string
                    due_date: string
                    id?: string
                    issuer?: string | null
                    observation?: string | null
                    paid?: boolean | null
                    paid_date?: string | null
                    recurrence?: string | null
                }
                Update: {
                    amount?: number
                    amount_paid?: number | null
                    category?: string
                    created_at?: string | null
                    description?: string
                    due_date?: string
                    id?: string
                    issuer?: string | null
                    observation?: string | null
                    paid?: boolean | null
                    paid_date?: string | null
                    recurrence?: string | null
                }
                Relationships: []
            }
            crm_leads: {
                Row: {
                    client_doc: string | null
                    client_email: string | null
                    client_name: string
                    client_phone: string | null
                    closing_metadata: Json | null
                    created_at: string
                    description: string | null
                    estimated_value: number | null
                    id: string
                    lost_category: string | null
                    lost_reason: string | null
                    next_action_date: string | null
                    notes: string | null
                    priority: string | null
                    salesperson: string | null
                    status: string | null
                    updated_at: string
                }
                Insert: {
                    client_doc?: string | null
                    client_email?: string | null
                    client_name: string
                    client_phone?: string | null
                    closing_metadata?: Json | null
                    created_at?: string
                    description?: string | null
                    estimated_value?: number | null
                    id?: string
                    lost_category?: string | null
                    lost_reason?: string | null
                    next_action_date?: string | null
                    notes?: string | null
                    priority?: string | null
                    salesperson?: string | null
                    status?: string | null
                    updated_at?: string
                }
                Update: {
                    client_doc?: string | null
                    client_email?: string | null
                    client_name?: string
                    client_phone?: string | null
                    closing_metadata?: Json | null
                    created_at?: string
                    description?: string | null
                    estimated_value?: number | null
                    id?: string
                    lost_category?: string | null
                    lost_reason?: string | null
                    next_action_date?: string | null
                    notes?: string | null
                    priority?: string | null
                    salesperson?: string | null
                    status?: string | null
                    updated_at?: string
                }
                Relationships: []
            }
            notifications: {
                Row: {
                    created_at: string | null
                    id: string
                    link: string | null
                    message: string
                    read: boolean | null
                    title: string
                    type: string | null
                    user_email: string
                }
                Insert: {
                    created_at?: string | null
                    id?: string
                    link?: string | null
                    message: string
                    read?: boolean | null
                    title: string
                    type?: string | null
                    user_email: string
                }
                Update: {
                    created_at?: string | null
                    id?: string
                    link?: string | null
                    message?: string
                    read?: boolean | null
                    title?: string
                    type?: string | null
                    user_email?: string
                }
                Relationships: []
            }
            order_change_logs: {
                Row: {
                    created_at: string | null
                    description: string | null
                    field_name: string
                    id: string
                    new_value: string | null
                    old_value: string | null
                    order_id: string | null
                    user_email: string
                }
                Insert: {
                    created_at?: string | null
                    description?: string | null
                    field_name: string
                    id?: string
                    new_value?: string | null
                    old_value?: string | null
                    order_id?: string | null
                    user_email: string
                }
                Update: {
                    created_at?: string | null
                    description?: string | null
                    field_name?: string
                    id?: string
                    new_value?: string | null
                    old_value?: string | null
                    order_id?: string | null
                    user_email?: string
                }
                Relationships: [
                    {
                        foreignKeyName: "order_change_logs_order_id_fkey"
                        columns: ["order_id"]
                        isOneToOne: false
                        referencedRelation: "orders"
                        referencedColumns: ["id"]
                    },
                ]
            }
            order_items: {
                Row: {
                    bv_pct: number | null
                    calculation_factor: number | null
                    client_transport_cost: number | null
                    client_transport_paid: boolean | null
                    created_at: string | null
                    customization_cost: number | null
                    customization_paid: boolean | null
                    customization_payment_date: string | null
                    customization_supplier_id: string | null
                    extra_expense: number | null
                    extra_expense_paid: boolean | null
                    extra_payment_date: string | null
                    extra_supplier_id: string | null
                    id: string
                    layout_cost: number | null
                    layout_paid: boolean | null
                    layout_payment_date: string | null
                    layout_supplier_id: string | null
                    margin_pct: number | null
                    order_id: string | null
                    product_name: string
                    quantity: number | null
                    real_client_transport_cost: number | null
                    real_customization_cost: number | null
                    real_extra_expense: number | null
                    real_layout_cost: number | null
                    real_supplier_transport_cost: number | null
                    real_unit_price: number | null
                    scheduled_payment_date: string | null
                    supplier_id: string | null
                    supplier_payment_date: string | null
                    supplier_transport_cost: number | null
                    supplier_transport_paid: boolean | null
                    tax_pct: number | null
                    total_item_value: number | null
                    transport_payment_date: string | null
                    transport_supplier_id: string | null
                    unforeseen_pct: number | null
                    unit_price: number | null
                    unit_price_paid: boolean | null
                }
                Insert: {
                    bv_pct?: number | null
                    calculation_factor?: number | null
                    client_transport_cost?: number | null
                    client_transport_paid?: boolean | null
                    created_at?: string | null
                    customization_cost?: number | null
                    customization_paid?: boolean | null
                    customization_payment_date?: string | null
                    customization_supplier_id?: string | null
                    extra_expense?: number | null
                    extra_expense_paid?: boolean | null
                    extra_payment_date?: string | null
                    extra_supplier_id?: string | null
                    id?: string
                    layout_cost?: number | null
                    layout_paid?: boolean | null
                    layout_payment_date?: string | null
                    layout_supplier_id?: string | null
                    margin_pct?: number | null
                    order_id?: string | null
                    product_name: string
                    quantity?: number | null
                    real_client_transport_cost?: number | null
                    real_customization_cost?: number | null
                    real_extra_expense?: number | null
                    real_layout_cost?: number | null
                    real_supplier_transport_cost?: number | null
                    real_unit_price?: number | null
                    scheduled_payment_date?: string | null
                    supplier_id?: string | null
                    supplier_payment_date?: string | null
                    supplier_transport_cost?: number | null
                    supplier_transport_paid?: boolean | null
                    tax_pct?: number | null
                    total_item_value?: number | null
                    transport_payment_date?: string | null
                    transport_supplier_id?: string | null
                    unforeseen_pct?: number | null
                    unit_price?: number | null
                    unit_price_paid?: boolean | null
                }
                Update: {
                    bv_pct?: number | null
                    calculation_factor?: number | null
                    client_transport_cost?: number | null
                    client_transport_paid?: boolean | null
                    created_at?: string | null
                    customization_cost?: number | null
                    customization_paid?: boolean | null
                    customization_payment_date?: string | null
                    customization_supplier_id?: string | null
                    extra_expense?: number | null
                    extra_expense_paid?: boolean | null
                    extra_payment_date?: string | null
                    extra_supplier_id?: string | null
                    id?: string
                    layout_cost?: number | null
                    layout_paid?: boolean | null
                    layout_payment_date?: string | null
                    layout_supplier_id?: string | null
                    margin_pct?: number | null
                    order_id?: string | null
                    product_name?: string
                    quantity?: number | null
                    real_client_transport_cost?: number | null
                    real_customization_cost?: number | null
                    real_extra_expense?: number | null
                    real_layout_cost?: number | null
                    real_supplier_transport_cost?: number | null
                    real_unit_price?: number | null
                    scheduled_payment_date?: string | null
                    supplier_id?: string | null
                    supplier_payment_date?: string | null
                    supplier_transport_cost?: number | null
                    supplier_transport_paid?: boolean | null
                    tax_pct?: number | null
                    total_item_value?: number | null
                    transport_payment_date?: string | null
                    transport_supplier_id?: string | null
                    unforeseen_pct?: number | null
                    unit_price?: number | null
                    unit_price_paid?: boolean | null
                }
                Relationships: [
                    {
                        foreignKeyName: "order_items_customization_supplier_id_fkey"
                        columns: ["customization_supplier_id"]
                        isOneToOne: false
                        referencedRelation: "partners"
                        referencedColumns: ["id"]
                    },
                    {
                        foreignKeyName: "order_items_extra_supplier_id_fkey"
                        columns: ["extra_supplier_id"]
                        isOneToOne: false
                        referencedRelation: "partners"
                        referencedColumns: ["id"]
                    },
                    {
                        foreignKeyName: "order_items_layout_supplier_id_fkey"
                        columns: ["layout_supplier_id"]
                        isOneToOne: false
                        referencedRelation: "partners"
                        referencedColumns: ["id"]
                    },
                    {
                        foreignKeyName: "order_items_order_id_fkey"
                        columns: ["order_id"]
                        isOneToOne: false
                        referencedRelation: "orders"
                        referencedColumns: ["id"]
                    },
                    {
                        foreignKeyName: "order_items_supplier_id_fkey"
                        columns: ["supplier_id"]
                        isOneToOne: false
                        referencedRelation: "partners"
                        referencedColumns: ["id"]
                    },
                    {
                        foreignKeyName: "order_items_transport_supplier_id_fkey"
                        columns: ["transport_supplier_id"]
                        isOneToOne: false
                        referencedRelation: "partners"
                        referencedColumns: ["id"]
                    },
                ]
            }
            order_logs: {
                Row: {
                    created_at: string | null
                    id: string
                    message: string
                    order_id: string | null
                    user_name: string
                }
                Insert: {
                    created_at?: string | null
                    id?: string
                    message: string
                    order_id?: string | null
                    user_name: string
                }
                Update: {
                    created_at?: string | null
                    id?: string
                    message?: string
                    order_id?: string | null
                    user_name?: string
                }
                Relationships: [
                    {
                        foreignKeyName: "order_logs_order_id_fkey"
                        columns: ["order_id"]
                        isOneToOne: false
                        referencedRelation: "orders"
                        referencedColumns: ["id"]
                    },
                ]
            }
            orders: {
                Row: {
                    billing_type: string | null
                    budget_date: string | null
                    client_id: string | null
                    created_at: string | null
                    entry_amount: number | null
                    entry_confirmed: boolean | null
                    entry_date: string | null
                    entry_forecast_date: string | null
                    id: string
                    invoice_number: string | null
                    issuer: string | null
                    layout_info: string | null
                    observations: string | null
                    order_date: string | null
                    order_number: string
                    payment_due_date: string | null
                    payment_method: string | null
                    purchase_order: string | null
                    remaining_amount: number | null
                    remaining_confirmed: boolean | null
                    remaining_date: string | null
                    remaining_forecast_date: string | null
                    salesperson: string
                    status: Database["public"]["Enums"]["order_status"] | null
                    supplier_departure_date: string | null
                    total_amount: number | null
                    updated_at: string | null
                }
                Insert: {
                    billing_type?: string | null
                    budget_date?: string | null
                    client_id?: string | null
                    created_at?: string | null
                    entry_amount?: number | null
                    entry_confirmed?: boolean | null
                    entry_date?: string | null
                    entry_forecast_date?: string | null
                    id?: string
                    invoice_number?: string | null
                    issuer?: string | null
                    layout_info?: string | null
                    observations?: string | null
                    order_date?: string | null
                    order_number: string
                    payment_due_date?: string | null
                    payment_method?: string | null
                    purchase_order?: string | null
                    remaining_amount?: number | null
                    remaining_confirmed?: boolean | null
                    remaining_date?: string | null
                    remaining_forecast_date?: string | null
                    salesperson: string
                    status?: Database["public"]["Enums"]["order_status"] | null
                    supplier_departure_date?: string | null
                    total_amount?: number | null
                    updated_at?: string | null
                }
                Update: {
                    billing_type?: string | null
                    budget_date?: string | null
                    client_id?: string | null
                    created_at?: string | null
                    entry_amount?: number | null
                    entry_confirmed?: boolean | null
                    entry_date?: string | null
                    entry_forecast_date?: string | null
                    id?: string
                    invoice_number?: string | null
                    issuer?: string | null
                    layout_info?: string | null
                    observations?: string | null
                    order_date?: string | null
                    order_number?: string
                    payment_due_date?: string | null
                    payment_method?: string | null
                    purchase_order?: string | null
                    remaining_amount?: number | null
                    remaining_confirmed?: boolean | null
                    remaining_date?: string | null
                    remaining_forecast_date?: string | null
                    salesperson?: string
                    status?: Database["public"]["Enums"]["order_status"] | null
                    supplier_departure_date?: string | null
                    total_amount?: number | null
                    updated_at?: string | null
                }
                Relationships: [
                    {
                        foreignKeyName: "orders_client_id_fkey"
                        columns: ["client_id"]
                        isOneToOne: false
                        referencedRelation: "partners"
                        referencedColumns: ["id"]
                    },
                ]
            }
            partners: {
                Row: {
                    created_at: string | null
                    doc: string | null
                    email: string | null
                    financial_email: string | null
                    id: string
                    name: string
                    phone: string | null
                    salesperson: string | null
                    type: Database["public"]["Enums"]["partner_type"]
                    updated_at: string | null
                }
                Insert: {
                    created_at?: string | null
                    doc?: string | null
                    email?: string | null
                    financial_email?: string | null
                    id?: string
                    name: string
                    phone?: string | null
                    salesperson?: string | null
                    type: Database["public"]["Enums"]["partner_type"]
                    updated_at?: string | null
                }
                Update: {
                    created_at?: string | null
                    doc?: string | null
                    email?: string | null
                    financial_email?: string | null
                    id?: string
                    name?: string
                    phone?: string | null
                    salesperson?: string | null
                    type?: Database["public"]["Enums"]["partner_type"]
                    updated_at?: string | null
                }
                Relationships: []
            }
            products: {
                Row: {
                    code: string | null
                    color: string | null
                    created_at: string | null
                    description: string | null
                    external_id: string | null
                    id: string
                    image_url: string | null
                    images: string[] | null
                    name: string
                    source: string | null
                    stock: number | null
                    unit_price: number | null
                    updated_at: string | null
                    variations: Json | null
                }
                Insert: {
                    code?: string | null
                    color?: string | null
                    created_at?: string | null
                    description?: string | null
                    external_id?: string | null
                    id?: string
                    image_url?: string | null
                    images?: string[] | null
                    name: string
                    source?: string | null
                    stock?: number | null
                    unit_price?: number | null
                    updated_at?: string | null
                    variations?: Json | null
                }
                Update: {
                    code?: string | null
                    color?: string | null
                    created_at?: string | null
                    description?: string | null
                    external_id?: string | null
                    id?: string
                    image_url?: string | null
                    images?: string[] | null
                    name?: string
                    source?: string | null
                    stock?: number | null
                    unit_price?: number | null
                    updated_at?: string | null
                    variations?: Json | null
                }
                Relationships: []
            }
        }
        Views: {
            [_ in never]: never
        }
        Functions: {
            get_dashboard_stats: {
                Args: never
                Returns: {
                    active_clients: number
                    pending_orders: number
                    total_orders: number
                    total_revenue: number
                }[]
            }
            get_next_budget_number: { Args: never; Returns: string }
            save_order: { Args: { p_items: Json; p_order: Json }; Returns: string }
        }
        Enums: {
            order_status:
            | "AGUARDANDO PAGAMENTO ENTRADA"
            | "EM PRODUÇÃO"
            | "EM TRANSPORTE"
            | "EM CONFERÊNCIA"
            | "AGUARDANDO PAGAMENTO 2 PARCELA"
            | "ENTREGUE"
            | "AGUARDANDO PAGAMENTO FATURAMENTO"
            | "FINALIZADO"
            partner_type: "CLIENTE" | "FORNECEDOR"
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
            order_status: [
                "AGUARDANDO PAGAMENTO ENTRADA",
                "EM PRODUÇÃO",
                "EM TRANSPORTE",
                "EM CONFERÊNCIA",
                "AGUARDANDO PAGAMENTO 2 PARCELA",
                "ENTREGUE",
                "AGUARDANDO PAGAMENTO FATURAMENTO",
                "FINALIZADO",
            ],
            partner_type: ["CLIENTE", "FORNECEDOR"],
        },
    },
} as const