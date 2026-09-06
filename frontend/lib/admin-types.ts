export interface AdminBooking {
  id: number;
  vehicle_id: number;
  connector_id: number;
  start_time: string;
  end_time: string;
  status: string;
}

export interface Revenue {
  station_id: number;
  total_revenue: string;
  completed_sessions: number;
}

export interface Technician {
  id: number;
  name: string;
  phone: string | null;
  specialization: string | null;
}

export interface Maintenance {
  id: number;
  station_id: number;
  connector_id: number;
  technician_id: number;
  issue_description: string;
  priority: string;
  scheduled_date: string;
  completed_date: string | null;
  status: string;
}

export interface AuditLogEntry {
  id: number;
  admin_id: number;
  action: string;
  table_affected: string;
  record_id: number;
  timestamp: string;
  description: string | null;
}

export interface AdminRefund {
  id: number;
  payment_id: number;
  amount: string;
  reason: string;
  refund_date: string;
  status: string;
}
