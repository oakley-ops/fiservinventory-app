export interface Part {
  part_id: number;
  name: string;
  quantity: number;
  minimum_quantity: number;
  unit_cost: number | null;
  supplier?: string;
  status: string;
  machine_name?: string;
  fiserv_part_number?: string;
  location: string;
  stock_status: 'in_stock' | 'low_stock' | 'out_of_stock';
}

export interface UsageHistory {
  date: string;
  part_name: string;
  machine_name: string | null;
  quantity: number;
  type: string;
}

export interface UsageTrend {
  date: string;
  part_name: string;
  usage_quantity: number;
  restock_quantity: number;
}

export interface TopUsedPart {
  part_name: string;
  current_quantity: number;
  minimum_quantity: number;
  total_usage: number;
  usage_frequency: number;
}

export interface DashboardData {
  totalParts: number;
  lowStockCount: number;
  outOfStockCount: number;
  totalMachines: number;
  allParts: Part[];
  lowStockParts: Part[];
  outOfStockParts: Part[];
  recentUsageHistory: {
    date: string;
    part_name: string;
    machine_name: string;
    quantity: number;
    type: string;
  }[];
  usageTrends: UsageTrend[];
  topUsedParts: TopUsedPart[];
}
