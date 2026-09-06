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
