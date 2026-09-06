# EV Charging Network Management System — Entity-Relationship Diagram

This is the complete schema (27 tables), derived from the original 26-entity
rough draft after a requirements discussion. See `SCHEMA.md` for the
reasoning behind every change, and which entities were added in which pass
(MVP first, then everything else).

```mermaid
erDiagram
    USERS ||--o{ VEHICLES : owns
    USERS ||--o{ BOOKINGS : places
    USERS ||--o{ CHARGING_SESSIONS : starts
    USERS ||--o{ SUBSCRIPTIONS : holds
    USERS ||--o{ NOTIFICATIONS : receives
    USERS ||--o{ STATION_REVIEWS : writes

    CHARGING_OPERATORS ||--o{ CHARGING_STATIONS : operates
    CHARGING_OPERATORS ||--o{ ADMINS : employs

    ADMINS ||--o{ STATION_ADMINS : manages
    ADMINS ||--o{ AUDIT_LOGS : performs
    CHARGING_STATIONS ||--o{ STATION_ADMINS : "managed by"

    VEHICLE_MODELS ||--o{ VEHICLES : "is a"
    VEHICLE_MODELS ||--o{ MODEL_CONNECTOR_TYPES : supports
    CONNECTOR_TYPES ||--o{ MODEL_CONNECTOR_TYPES : "compatible with"
    CONNECTOR_TYPES ||--o{ CONNECTORS : "standard for"

    LOCATIONS ||--o{ CHARGING_STATIONS : hosts
    CHARGING_STATIONS ||--o{ CHARGERS : contains
    CHARGING_STATIONS ||--o| TARIFFS : "priced by"
    CHARGING_STATIONS ||--o{ STATION_OPERATING_HOURS : defines
    CHARGING_STATIONS ||--o{ STATION_REVIEWS : receives
    CHARGING_STATIONS ||--o{ MAINTENANCE_TICKETS : "has issues at"
    CHARGERS ||--o{ CONNECTORS : has

    VEHICLES ||--o{ BOOKINGS : "reserved for"
    VEHICLES ||--o{ CHARGING_SESSIONS : charges
    CONNECTORS ||--o{ BOOKINGS : "reserved via"
    CONNECTORS ||--o{ CHARGING_SESSIONS : "used in"
    CONNECTORS ||--o{ MAINTENANCE_TICKETS : "worked on via"
    TECHNICIANS ||--o{ MAINTENANCE_TICKETS : performs

    BOOKINGS ||--o| CHARGING_SESSIONS : fulfills
    CHARGING_SESSIONS ||--o{ METER_READINGS : records
    CHARGING_SESSIONS ||--|| BILLS : generates

    CHARGING_PLANS ||--o{ SUBSCRIPTIONS : "subscribed as"
    BILLS ||--o| PAYMENTS : "paid by"
    SUBSCRIPTIONS ||--o| PAYMENTS : "paid by"
    PAYMENTS ||--o| REFUNDS : "refunded via"

    USERS {
        int id PK
        string name
        string email UK
        string password_hash
        string phone
        string address
        datetime registration_date
        string account_status
    }
    CHARGING_OPERATORS {
        int id PK
        string operator_name
        string contact_email UK
        string phone
        string status
    }
    ADMINS {
        int id PK
        int operator_id FK
        string name
        string email UK
        string password_hash
        string role
        string status
    }
    STATION_ADMINS {
        int station_id PK,FK
        int admin_id PK,FK
    }
    VEHICLE_MODELS {
        int id PK
        string make
        string model_name
        decimal battery_capacity_kwh
    }
    CONNECTOR_TYPES {
        int id PK
        string type_name UK
        decimal standard_max_power_kw
    }
    MODEL_CONNECTOR_TYPES {
        int model_id PK,FK
        int connector_type_id PK,FK
    }
    VEHICLES {
        int id PK
        int user_id FK
        int model_id FK
        string registration_number UK
        string vehicle_status
    }
    LOCATIONS {
        int id PK
        string address_line
        string city
        string state
        decimal latitude
        decimal longitude
    }
    CHARGING_STATIONS {
        int id PK
        int operator_id FK
        int location_id FK
        string station_name
        string status
    }
    CHARGERS {
        int id PK
        int station_id FK
        string charger_model
        decimal power_capacity_kw
        string status
    }
    CONNECTORS {
        int id PK
        int charger_id FK
        int connector_type_id FK
        decimal max_power_kw
        string status
    }
    TARIFFS {
        int id PK
        int station_id FK,UK
        decimal price_per_kwh
    }
    STATION_OPERATING_HOURS {
        int id PK
        int station_id FK
        string day_of_week
        time opening_time
        time closing_time
    }
    BOOKINGS {
        int id PK
        int user_id FK
        int vehicle_id FK
        int connector_id FK
        datetime booking_time
        datetime start_time
        datetime end_time
        string status
        string cancellation_reason
    }
    CHARGING_SESSIONS {
        int id PK
        int booking_id FK "nullable, walk-in support"
        int connector_id FK
        int user_id FK
        int vehicle_id FK
        datetime start_time
        datetime end_time
        string session_status
        decimal energy_delivered_kwh
    }
    METER_READINGS {
        int id PK
        int session_id FK
        datetime timestamp
        decimal energy_reading_kwh
        decimal power_output_kw
        decimal voltage
        decimal current
    }
    CHARGING_PLANS {
        int id PK
        string plan_name UK
        decimal subscription_fee
        int validity_days
        decimal discount_percentage
        bool priority_booking
        int max_sessions "nullable = unlimited"
        string status
    }
    SUBSCRIPTIONS {
        int id PK
        int user_id FK
        int plan_id FK
        date start_date
        date end_date
        string status
        bool auto_renew
    }
    BILLS {
        int id PK
        int session_id FK,UK
        decimal energy_charge
        decimal subscription_discount
        decimal tax_amount
        decimal total_amount
        datetime generated_date
    }
    PAYMENTS {
        int id PK
        int bill_id FK,UK "nullable, exclusive with subscription_id"
        int subscription_id FK,UK "nullable, exclusive with bill_id"
        decimal amount
        datetime payment_date
        string payment_method
        string payment_status
        string transaction_reference
    }
    REFUNDS {
        int id PK
        int payment_id FK,UK
        decimal amount
        string reason
        datetime refund_date
        string status
    }
    NOTIFICATIONS {
        int id PK
        int user_id FK
        string message
        string type
        datetime sent_date
        bool is_read
    }
    STATION_REVIEWS {
        int id PK
        int user_id FK
        int station_id FK
        int rating
        string comment
        datetime review_date
        bool is_verified
    }
    TECHNICIANS {
        int id PK
        string name
        string phone
        string specialization
    }
    MAINTENANCE_TICKETS {
        int id PK
        int station_id FK
        int connector_id FK
        int technician_id FK
        string issue_description
        string priority
        datetime scheduled_date
        datetime completed_date
        string status
    }
    AUDIT_LOGS {
        int id PK
        int admin_id FK
        string action
        string table_affected
        int record_id
        datetime timestamp
        string description
    }
```
