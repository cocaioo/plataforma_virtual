"""Add ubs_needs table

Revision ID: 62c7a9704dab
Revises: 20260108_0003
Create Date: 2026-01-21 14:22:46.189045

"""

from __future__ import annotations

from alembic import op
import sqlalchemy as sa
from sqlalchemy import inspect


# revision identifiers, used by Alembic.
revision = '62c7a9704dab'
down_revision = '20260108_0003'
branch_labels = None
depends_on = None


def upgrade() -> None:
    bind = op.get_bind()
    inspector = inspect(bind)
    if 'ubs_needs' not in inspector.get_table_names():
        op.create_table('ubs_needs',
        sa.Column('id', sa.Integer(), autoincrement=True, nullable=False),
        sa.Column('ubs_id', sa.Integer(), nullable=False),
        sa.Column('problemas_identificados', sa.Text(), nullable=False),
        sa.Column('necessidades_equipamentos_insumos', sa.Text(), nullable=True),
        sa.Column('necessidades_especificas_acs', sa.Text(), nullable=True),
        sa.Column('necessidades_infraestrutura_manutencao', sa.Text(), nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=True),
        sa.Column('updated_at', sa.DateTime(timezone=True), nullable=True),
        sa.Column('created_by', sa.Integer(), nullable=True),
        sa.Column('updated_by', sa.Integer(), nullable=True),
        sa.ForeignKeyConstraint(['created_by'], ['usuarios.id'], ),
        sa.ForeignKeyConstraint(['ubs_id'], ['ubs.id'], ondelete='CASCADE'),
        sa.ForeignKeyConstraint(['updated_by'], ['usuarios.id'], ),
        sa.PrimaryKeyConstraint('id'),
        sa.UniqueConstraint('ubs_id')
        )


def downgrade() -> None:
    bind = op.get_bind()
    inspector = inspect(bind)
    if 'ubs_needs' in inspector.get_table_names():
        op.drop_table('ubs_needs')
