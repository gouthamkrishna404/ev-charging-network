export interface VehicleModel {
  id: number;
  make: string;
  model_name: string;
  battery_capacity_kwh: string;
}

export interface Vehicle {
  id: number;
  model_id: number;
  registration_number: string;
  vehicle_status: string;
}

export interface Location {
  id: number;
  address_line: string;
  city: string;
  state: string;
  latitude: string | null;
  longitude: string | null;
}

export interface ConnectorInfo {
  id: number;
  connector_type_id: number;
  max_power_kw: string;
  status: string;
}

export interface ChargerInfo {
  id: number;
  charger_model: string | null;
  power_capacity_kw: string;
  status: string;
  connectors: ConnectorInfo[];
}

export interface Station {
  id: number;
  station_name: string;
  status: string;
  location: Location;
  chargers: ChargerInfo[];
  tariff: { price_per_kwh: string } | null;
}

export interface Booking {
  id: number;
  vehicle_id: number;
  connector_id: number;
  booking_time: string;
  start_time: string;
  end_time: string;
  status: string;
  cancellation_reason: string | null;
}

export interface Session {
  id: number;
  booking_id: number | null;
  connector_id: number;
  vehicle_id: number;
  start_time: string;
  end_time: string | null;
  session_status: string;
  energy_delivered_kwh: string | null;
}

export interface Payment {
  id: number;
  bill_id: number;
  payment_status: string;
  transaction_reference: string | null;
}

export interface Bill {
  id: number;
  session_id: number;
  energy_charge: string;
  tax_amount: string;
  total_amount: string;
  generated_date: string;
  payment: Payment | null;
}
