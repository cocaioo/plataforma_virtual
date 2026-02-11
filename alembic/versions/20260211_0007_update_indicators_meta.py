"""Update indicators: remove type/precision, add meta

Revision ID: 20260211_0007
Revises: 20260205_merge_heads
Create Date: 2026-02-11

"""
from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = "20260211_0007"
down_revision = "20260205_merge_heads"
branch_labels = None
depends_on = None


def upgrade() -> None:
    with op.batch_alter_table("indicators") as batch_op:
        batch_op.add_column(sa.Column("meta", sa.Numeric(18, 4), nullable=True))
        batch_op.drop_column("tipo_dado")
        batch_op.drop_column("grau_precisao_valor")


def downgrade() -> None:
    with op.batch_alter_table("indicators") as batch_op:
        batch_op.add_column(
            sa.Column(
                "tipo_dado",
                sa.String(40),
                nullable=False,
                server_default="TAXA_PERCENTUAL",
            )
        )
        batch_op.add_column(
            sa.Column(
                "grau_precisao_valor",
                sa.String(40),
                nullable=False,
                server_default="UNIDADE",
            )
        )
        batch_op.drop_column("meta")
        batch_op.alter_column("tipo_dado", server_default=None)
        batch_op.alter_column("grau_precisao_valor", server_default=None)
