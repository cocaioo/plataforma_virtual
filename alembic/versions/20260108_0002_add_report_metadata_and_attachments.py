"""add report metadata fields and attachments

Revision ID: 20260108_0002
Revises: 20260108_0001
Create Date: 2026-01-08

"""

from __future__ import annotations

from alembic import op
import sqlalchemy as sa
from sqlalchemy import inspect

# revision identifiers, used by Alembic.
revision = "20260108_0002"
down_revision = "20260108_0001"
branch_labels = None
depends_on = None


def upgrade() -> None:
    bind = op.get_bind()
    inspector = inspect(bind)

    columns = [col["name"] for col in inspector.get_columns("ubs")]
    with op.batch_alter_table("ubs") as batch_op:
        if "periodo_referencia" not in columns:
            batch_op.add_column(sa.Column("periodo_referencia", sa.String(length=50), nullable=True))
        if "identificacao_equipe" not in columns:
            batch_op.add_column(sa.Column("identificacao_equipe", sa.String(length=100), nullable=True))
        if "responsavel_nome" not in columns:
            batch_op.add_column(sa.Column("responsavel_nome", sa.String(length=255), nullable=True))
        if "responsavel_cargo" not in columns:
            batch_op.add_column(sa.Column("responsavel_cargo", sa.String(length=255), nullable=True))
        if "responsavel_contato" not in columns:
            batch_op.add_column(sa.Column("responsavel_contato", sa.String(length=255), nullable=True))
        if "fluxo_agenda_acesso" not in columns:
            batch_op.add_column(sa.Column("fluxo_agenda_acesso", sa.Text(), nullable=True))

    if "ubs_attachments" not in inspector.get_table_names():
        op.create_table(
            "ubs_attachments",
            sa.Column("id", sa.Integer(), primary_key=True, autoincrement=True),
            sa.Column("ubs_id", sa.Integer(), nullable=False),
            sa.Column("original_filename", sa.String(length=255), nullable=False),
            sa.Column("content_type", sa.String(length=100), nullable=True),
            sa.Column("size_bytes", sa.Integer(), nullable=False, server_default="0"),
            sa.Column("storage_path", sa.Text(), nullable=False),
            sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("CURRENT_TIMESTAMP")),
            sa.ForeignKeyConstraint(["ubs_id"], ["ubs.id"], ondelete="CASCADE"),
        )
        op.create_index("ix_ubs_attachments_ubs_id", "ubs_attachments", ["ubs_id"], unique=False)


def downgrade() -> None:
    bind = op.get_bind()
    inspector = inspect(bind)

    if "ubs_attachments" in inspector.get_table_names():
        op.drop_index("ix_ubs_attachments_ubs_id", table_name="ubs_attachments")
        op.drop_table("ubs_attachments")

    columns = [col["name"] for col in inspector.get_columns("ubs")]
    with op.batch_alter_table("ubs") as batch_op:
        if "fluxo_agenda_acesso" in columns:
            batch_op.drop_column("fluxo_agenda_acesso")
        if "responsavel_contato" in columns:
            batch_op.drop_column("responsavel_contato")
        if "responsavel_cargo" in columns:
            batch_op.drop_column("responsavel_cargo")
        if "responsavel_nome" in columns:
            batch_op.drop_column("responsavel_nome")
        if "identificacao_equipe" in columns:
            batch_op.drop_column("identificacao_equipe")
        if "periodo_referencia" in columns:
            batch_op.drop_column("periodo_referencia")
