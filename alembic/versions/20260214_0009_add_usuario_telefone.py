"""add usuario telefone

Revision ID: 20260214_0009
Revises: 20260212_0008
Create Date: 2026-02-14

"""

from __future__ import annotations

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = "20260214_0009"
down_revision = "20260212_0008"
branch_labels = None
depends_on = None


def upgrade() -> None:
    with op.batch_alter_table("usuarios") as batch:
        batch.add_column(sa.Column("telefone", sa.String(length=20), nullable=True))


def downgrade() -> None:
    with op.batch_alter_table("usuarios") as batch:
        batch.drop_column("telefone")
