# EV Charging Network Management System — MVP Entity-Relationship Diagram

This is the finalized MVP schema (17 tables), derived from the original 26-entity
rough draft after a requirements discussion. See `SCHEMA.md` for the reasoning
behind every change.

```mermaid
erDiagram
    USERS ||--o{ VEHICLES : owns
    USERS ||--o{ BOOKINGS : places
    USERS ||--o{ CHARGING_SESSIONS : starts

    CHARGING_OPERATORS ||--o{ CHARGING_STATIONS : operates
    CHARGING_OPERATORS ||--o{ ADMINS : employs

    ADMINS ||--o{ STATION_ADMINS : manages
    CHARGING_STATIONS ||--o{ STATION_ADMINS : "managed by"

    VEHICLE_MODELS ||--o{ VEHICLES : "is a"
    VEHICLE_MODELS ||--o{ MODEL_CONNECTOR_TYPES : supports
    CONNECTOR_TYPES ||--o{ MODEL_CONNECTOR_TYPES : "compatible with"
    CONNECTOR_TYPES ||--o{ CONNECTORS : "standard for"

    LOCATIONS ||--o{ CHARGING_STATIONS : hosts
    CHARGING_STATIONS ||--o{ CHARGERS : contains
    CHARGING_STATIONS ||--o| TARIFFS : "priced by"
    CHARGERS ||--o{ CONNECTORS : has

    VEHICLES ||--o{ BOOKINGS : "reserved for"
    VEHICLES ||--o{ CHARGING_SESSIONS : charges
    CONNECTORS ||--o{ BOOKINGS : "reserved via"
    CONNECTORS ||--o{ CHARGING_SESSIONS : "used in"

    BOOKINGS ||--o| CHARGING_SESSIONS : fulfills
    CHARGING_SESSIONS ||--|| BILLS : generates
    BILLS ||--o| PAYMENTS : "paid by"

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
    BILLS {
        int id PK
        int session_id FK,UK
        decimal energy_charge
        decimal tax_amount
        decimal total_amount
        datetime generated_date
    }
    PAYMENTS {
        int id PK
        int bill_id FK,UK
        decimal amount
        datetime payment_date
        string payment_method
        string payment_status
        string transaction_reference
    }
```
