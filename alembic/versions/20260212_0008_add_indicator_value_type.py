"""add indicator value type

Revision ID: 20260212_0008
Revises: 20260211_0007
Create Date: 2026-02-12

"""

from __future__ import annotations

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = "20260212_0008"
down_revision = "20260211_0007"
branch_labels = None
depends_on = None


def upgrade() -> None:
    with op.batch_alter_table("indicators") as batch_op:
        batch_op.add_column(
            sa.Column(
                "tipo_valor",
                sa.String(40),
                nullable=True,
                server_default=sa.text("'PERCENTUAL'"),
            )
        )
    op.execute("UPDATE indicators SET tipo_valor = 'PERCENTUAL' WHERE tipo_valor IS NULL")


def downgrade() -> None:
    with op.batch_alter_table("indicators") as batch_op:
        batch_op.drop_column("tipo_valor")
