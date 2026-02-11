"""add nome_relatorio to ubs

Revision ID: 20260108_0001
Revises: 
Create Date: 2026-01-08

"""

from __future__ import annotations

from alembic import op
import sqlalchemy as sa
from sqlalchemy import inspect

# revision identifiers, used by Alembic.
revision = "20260108_0001"
down_revision = None
branch_labels = None
depends_on = None


def upgrade() -> None:
    bind = op.get_bind()
    inspector = inspect(bind)
    columns = [col["name"] for col in inspector.get_columns("ubs")]
    if "nome_relatorio" not in columns:
        with op.batch_alter_table("ubs") as batch_op:
            batch_op.add_column(sa.Column("nome_relatorio", sa.String(length=255), nullable=True))


def downgrade() -> None:
    bind = op.get_bind()
    inspector = inspect(bind)
    columns = [col["name"] for col in inspector.get_columns("ubs")]
    if "nome_relatorio" in columns:
        with op.batch_alter_table("ubs") as batch_op:
            batch_op.drop_column("nome_relatorio")
