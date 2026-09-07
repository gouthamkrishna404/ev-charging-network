"""add performance indexes for analytics and search paths

Revision ID: f1a2b3c4d5e6
Revises: be67ed08af42
Create Date: 2026-09-07 10:00:00.000000

"""
from typing import Sequence, Union

from alembic import op


# revision identifiers, used by Alembic.
revision: str = 'f1a2b3c4d5e6'
down_revision: Union[str, Sequence[str], None] = 'be67ed08af42'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    op.create_index('ix_bills_generated_date', 'bills', ['generated_date'])
    op.create_index('ix_sessions_start_time', 'charging_sessions', ['start_time'])
    op.create_index('ix_sessions_connector_id', 'charging_sessions', ['connector_id'])
    op.create_index('ix_bookings_start_time', 'bookings', ['start_time'])
    op.create_index('ix_locations_city', 'locations', ['city'])
    op.create_index('ix_stations_operator_id', 'charging_stations', ['operator_id'])
    op.create_index('ix_reviews_station_id', 'station_reviews', ['station_id'])


def downgrade() -> None:
    """Downgrade schema."""
    op.drop_index('ix_reviews_station_id', table_name='station_reviews')
    op.drop_index('ix_stations_operator_id', table_name='charging_stations')
    op.drop_index('ix_locations_city', table_name='locations')
    op.drop_index('ix_bookings_start_time', table_name='bookings')
    op.drop_index('ix_sessions_connector_id', table_name='charging_sessions')
    op.drop_index('ix_sessions_start_time', table_name='charging_sessions')
    op.drop_index('ix_bills_generated_date', table_name='bills')
