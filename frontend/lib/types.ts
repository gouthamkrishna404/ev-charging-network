export interface VehicleModel {
  id: number;
  make: string;
  model_name: string;
  battery_capacity_kwh: string;
}

export interface ConnectorTypeOut {
  id: number;
  type_name: string;
  standard_max_power_kw: string;
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
  connector_type_name: string;
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

export interface OperatingHours {
  id: number;
  day_of_week: string;
  opening_time: string;
  closing_time: string;
}

export interface Station {
  id: number;
  station_name: string;
  status: string;
  location: Location;
  chargers: ChargerInfo[];
  tariff: { price_per_kwh: string } | null;
  operating_hours: OperatingHours[];
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
  connector_power_kw: string;
  vehicle_id: number;
  start_time: string;
  end_time: string | null;
  session_status: string;
  energy_delivered_kwh: string | null;
}

export interface Refund {
  id: number;
  payment_id: number;
  amount: string;
  reason: string;
  refund_date: string;
  status: string;
}

export interface Payment {
  id: number;
  bill_id: number | null;
  subscription_id: number | null;
  amount: string;
  payment_status: string;
  transaction_reference: string | null;
  refund: Refund | null;
}

export interface Bill {
  id: number;
  session_id: number;
  energy_charge: string;
  subscription_discount: string;
  tax_amount: string;
  total_amount: string;
  generated_date: string;
  payment: Payment | null;
}

export interface ChargingPlan {
  id: number;
  operator_id: number;
  operator_name: string;
  plan_name: string;
  subscription_fee: string;
  validity_days: number;
  discount_percentage: string;
  priority_booking: boolean;
  max_sessions: number | null;
  status: string;
}

export interface Subscription {
  id: number;
  plan_id: number;
  start_date: string;
  end_date: string;
  status: string;
  auto_renew: boolean;
}

export interface AppNotification {
  id: number;
  message: string;
  type: string;
  sent_date: string;
  is_read: boolean;
}

export interface Review {
  id: number;
  user_id: number;
  station_id: number;
  rating: number;
  comment: string | null;
  review_date: string;
  is_verified: boolean;
}

export interface MeterReading {
  id: number;
  timestamp: string;
  energy_reading_kwh: string;
  power_output_kw: string | null;
  voltage: string | null;
  current: string | null;
}
