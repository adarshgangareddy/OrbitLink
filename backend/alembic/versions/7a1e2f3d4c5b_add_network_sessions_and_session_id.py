"""add network_sessions and session_id column to network_measurements

Revision ID: 7a1e2f3d4c5b
Revises: 050e515e057c
Create Date: 2026-10-12 18:40:00.000000

"""
from typing import Sequence, Union
from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '7a1e2f3d4c5b'
down_revision: Union[str, Sequence[str], None] = '050e515e057c'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # 1. Create network_sessions table
    op.create_table(
        'network_sessions',
        sa.Column('id', sa.Integer(), autoincrement=True, nullable=False),
        sa.Column('session_id', sa.String(length=64), nullable=False),
        sa.Column('device_id', sa.String(length=100), nullable=False),
        sa.Column('interface_name', sa.String(length=50), nullable=False),
        sa.Column('start_time', sa.DateTime(timezone=True), server_default=sa.text('(CURRENT_TIMESTAMP)'), nullable=False),
        sa.Column('end_time', sa.DateTime(timezone=True), nullable=True),
        sa.Column('is_active', sa.Boolean(), server_default=sa.text('1'), nullable=False),
        sa.Column('start_bytes_sent', sa.BigInteger(), server_default='0', nullable=False),
        sa.Column('start_bytes_recv', sa.BigInteger(), server_default='0', nullable=False),
        sa.Column('total_bytes_sent', sa.BigInteger(), server_default='0', nullable=False),
        sa.Column('total_bytes_recv', sa.BigInteger(), server_default='0', nullable=False),
        sa.Column('sample_count', sa.Integer(), server_default='0', nullable=False),
        sa.Column('avg_latency_ms', sa.Float(), nullable=True),
        sa.Column('min_latency_ms', sa.Float(), nullable=True),
        sa.Column('peak_latency_ms', sa.Float(), nullable=True),
        sa.Column('packet_loss_pct', sa.Float(), server_default='0', nullable=True),
        sa.Column('avg_download_speed_mbps', sa.Float(), nullable=True),
        sa.Column('wifi_ssid', sa.String(length=100), nullable=True),
        sa.Column('status', sa.String(length=30), server_default='active', nullable=False),
        sa.Column('notes', sa.Text(), nullable=True),
        sa.PrimaryKeyConstraint('id'),
    )
    op.create_index(op.f('ix_network_sessions_session_id'), 'network_sessions', ['session_id'], unique=True)
    op.create_index(op.f('ix_network_sessions_device_id'), 'network_sessions', ['device_id'], unique=False)
    op.create_index(op.f('ix_network_sessions_interface_name'), 'network_sessions', ['interface_name'], unique=False)
    op.create_index(op.f('ix_network_sessions_start_time'), 'network_sessions', ['start_time'], unique=False)
    op.create_index(op.f('ix_network_sessions_is_active'), 'network_sessions', ['is_active'], unique=False)

    # 2. Add session_id column to network_measurements using batch mode for SQLite compatibility
    with op.batch_alter_table('network_measurements') as batch_op:
        batch_op.add_column(sa.Column('session_id', sa.String(length=64), nullable=True))
        batch_op.create_index('ix_network_measurements_session_id', ['session_id'], unique=False)


def downgrade() -> None:
    with op.batch_alter_table('network_measurements') as batch_op:
        batch_op.drop_index('ix_network_measurements_session_id')
        batch_op.drop_column('session_id')

    op.drop_index(op.f('ix_network_sessions_is_active'), table_name='network_sessions')
    op.drop_index(op.f('ix_network_sessions_start_time'), table_name='network_sessions')
    op.drop_index(op.f('ix_network_sessions_interface_name'), table_name='network_sessions')
    op.drop_index(op.f('ix_network_sessions_device_id'), table_name='network_sessions')
    op.drop_index(op.f('ix_network_sessions_session_id'), table_name='network_sessions')
    op.drop_table('network_sessions')
