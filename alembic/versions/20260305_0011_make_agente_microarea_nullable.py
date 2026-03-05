"""make agente microarea nullable

Revision ID: 20260305_0011
Revises: 20260216_0010
Create Date: 2026-03-05

"""
from __future__ import annotations

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = "20260305_0011"
down_revision = "20260216_0010"
branch_labels = None
depends_on = None


def _get_fk_name(inspector, table_name, referred_table):
    for fk in inspector.get_foreign_keys(table_name):
        if fk.get("referred_table") == referred_table:
            return fk.get("name")
    return None


def upgrade() -> None:
    bind = op.get_bind()
    inspector = sa.inspect(bind)

    if "agentes_saude" not in inspector.get_table_names():
        return

    fk_name = _get_fk_name(inspector, "agentes_saude", "microareas")

    with op.batch_alter_table("agentes_saude") as batch_op:
        if fk_name:
            batch_op.drop_constraint(fk_name, type_="foreignkey")
        batch_op.alter_column("microarea_id", existing_type=sa.Integer(), nullable=True)
        batch_op.create_foreign_key(
            "fk_agentes_saude_microarea_id",
            "microareas",
            ["microarea_id"],
            ["id"],
            ondelete="SET NULL",
        )


def downgrade() -> None:
    bind = op.get_bind()
    inspector = sa.inspect(bind)

    if "agentes_saude" not in inspector.get_table_names():
        return

    fk_name = _get_fk_name(inspector, "agentes_saude", "microareas")

    with op.batch_alter_table("agentes_saude") as batch_op:
        if fk_name:
            batch_op.drop_constraint(fk_name, type_="foreignkey")
        batch_op.alter_column("microarea_id", existing_type=sa.Integer(), nullable=False)
        batch_op.create_foreign_key(
            "fk_agentes_saude_microarea_id",
            "microareas",
            ["microarea_id"],
            ["id"],
            ondelete="CASCADE",
        )
