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
  lowStockParts: {
    id: number;
    name: string;
    quantity: number;
    minimum_quantity: number;
    location: string;
    status: string;
  }[];
  recentUsage: {
    id: number;
    date: string;
    partName: string;
    machine: string;
    quantity: number;
    type: string;
  }[];
  recentUsageHistory: UsageHistory[];
  usageTrends: UsageTrend[];
  topUsedParts: TopUsedPart[];
}
