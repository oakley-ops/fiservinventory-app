export interface Vendor {
  vendor_id: number;
  name: string;
  contact_name?: string;
  email?: string;
  phone?: string;
  address?: string;
  notes?: string;
  created_at?: string;
  updated_at?: string;
}

export interface Supplier {
  supplier_id: number;
  name: string;
  contact_name?: string;
  email?: string;
  phone?: string;
  address?: string;
  notes?: string;
  created_at?: string;
  updated_at?: string;
}

export interface PartSupplier {
  part_supplier_id?: number;
  part_id: number;
  supplier_id: number;
  supplier_name?: string;
  unit_cost: number;
  is_preferred?: boolean;
  lead_time_days?: number;
  minimum_order_quantity?: number;
  notes?: string;
  created_at?: string;
  updated_at?: string;
}

export interface PurchaseOrderItem {
  item_id?: number;
  po_id?: number;
  part_id: number;
  part_name?: string;
  manufacturer_part_number?: string;
  fiserv_part_number?: string;
  quantity: number;
  unit_price: number;
  total_price?: number;
  notes?: string;
  created_at?: string;
}

export interface PurchaseOrder {
  po_id?: number;
  po_number?: string;
  vendor_id?: number;
  vendor_name?: string;
  vendor_address?: string;
  vendor_email?: string;
  vendor_phone?: string;
  supplier_id?: number;
  supplier_name?: string;
  supplier_address?: string;
  supplier_email?: string;
  supplier_phone?: string;
  contact_name?: string;
  status?: 'pending' | 'submitted' | 'approved' | 'received' | 'canceled';
  total_amount?: number;
  shipping_cost?: number;
  tax_amount?: number;
  notes?: string;
  created_at?: string;
  updated_at?: string;
  items?: PurchaseOrderItem[];
  is_urgent?: boolean;
  next_day_air?: boolean;
  priority?: 'urgent' | 'normal';
}

export interface LowStockPart {
  part_id: number;
  name: string;
  description?: string;
  manufacturer_part_number?: string;
  fiserv_part_number?: string;
  quantity: number;
  minimum_quantity: number;
  vendor_id?: number;     // Legacy field
  vendor_name?: string;   // Legacy field
  supplier_id?: number;   // New field for primary supplier
  supplier_name?: string; // New field for primary supplier
  unit_cost?: number;     // Legacy field
  unit_price?: number;    // New field for unit price
  supplier_unit_cost?: number; // Add supplier-specific unit cost
  order_quantity?: number;
  location?: string;
  status?: 'active' | 'discontinued';
  notes?: string;
  image?: string;
  suppliers?: PartSupplier[]; // Multiple suppliers for the part
}

// Export LowStockPart as Part for more general usage
export type Part = LowStockPart;
