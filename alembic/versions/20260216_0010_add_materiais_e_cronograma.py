"""add materials and cronograma tables

Revision ID: 20260216_0010
Revises: 20260214_0009
Create Date: 2026-02-16

"""

from __future__ import annotations

from alembic import op
import sqlalchemy as sa
from sqlalchemy import inspect


# revision identifiers, used by Alembic.
revision = "20260216_0010"
down_revision = "20260214_0009"
branch_labels = None
depends_on = None


def upgrade() -> None:
    bind = op.get_bind()
    inspector = inspect(bind)
    existing_tables = set(inspector.get_table_names())

    if "educational_materials" not in existing_tables:
        op.create_table(
            "educational_materials",
            sa.Column("id", sa.Integer(), autoincrement=True, nullable=False),
            sa.Column("ubs_id", sa.Integer(), nullable=False),
            sa.Column("titulo", sa.String(length=255), nullable=False),
            sa.Column("descricao", sa.Text(), nullable=True),
            sa.Column("categoria", sa.String(length=80), nullable=True),
            sa.Column("publico_alvo", sa.String(length=80), nullable=True),
            sa.Column("ativo", sa.Boolean(), nullable=False, server_default=sa.text("1")),
            sa.Column("created_by", sa.Integer(), nullable=True),
            sa.Column("updated_by", sa.Integer(), nullable=True),
            sa.Column(
                "created_at",
                sa.DateTime(timezone=True),
                server_default=sa.text("CURRENT_TIMESTAMP"),
                nullable=True,
            ),
            sa.Column("updated_at", sa.DateTime(timezone=True), nullable=True),
            sa.ForeignKeyConstraint(["ubs_id"], ["ubs.id"], ondelete="CASCADE"),
            sa.ForeignKeyConstraint(["created_by"], ["usuarios.id"]),
            sa.ForeignKeyConstraint(["updated_by"], ["usuarios.id"]),
            sa.PrimaryKeyConstraint("id"),
        )
        op.create_index(
            "ix_educational_materials_ubs_id",
            "educational_materials",
            ["ubs_id"],
        )

    if "educational_material_files" not in existing_tables:
        op.create_table(
            "educational_material_files",
            sa.Column("id", sa.Integer(), autoincrement=True, nullable=False),
            sa.Column("material_id", sa.Integer(), nullable=False),
            sa.Column("original_filename", sa.String(length=255), nullable=False),
            sa.Column("content_type", sa.String(length=100), nullable=True),
            sa.Column("size_bytes", sa.Integer(), nullable=False, server_default=sa.text("0")),
            sa.Column("storage_path", sa.Text(), nullable=False),
            sa.Column(
                "created_at",
                sa.DateTime(timezone=True),
                server_default=sa.text("CURRENT_TIMESTAMP"),
                nullable=True,
            ),
            sa.ForeignKeyConstraint(
                ["material_id"], ["educational_materials.id"], ondelete="CASCADE"
            ),
            sa.PrimaryKeyConstraint("id"),
        )
        op.create_index(
            "ix_educational_material_files_material_id",
            "educational_material_files",
            ["material_id"],
        )

    if "cronograma_events" not in existing_tables:
        op.create_table(
            "cronograma_events",
            sa.Column("id", sa.Integer(), autoincrement=True, nullable=False),
            sa.Column("ubs_id", sa.Integer(), nullable=False),
            sa.Column("titulo", sa.String(length=255), nullable=False),
            sa.Column(
                "tipo",
                sa.String(length=30),
                nullable=False,
                server_default=sa.text("'OUTRO'"),
            ),
            sa.Column("local", sa.String(length=255), nullable=True),
            sa.Column("inicio", sa.DateTime(timezone=True), nullable=False),
            sa.Column("fim", sa.DateTime(timezone=True), nullable=True),
            sa.Column("dia_inteiro", sa.Boolean(), nullable=False, server_default=sa.text("0")),
            sa.Column("observacoes", sa.Text(), nullable=True),
            sa.Column(
                "recorrencia",
                sa.String(length=20),
                nullable=False,
                server_default=sa.text("'NONE'"),
            ),
            sa.Column(
                "recorrencia_intervalo",
                sa.Integer(),
                nullable=False,
                server_default=sa.text("1"),
            ),
            sa.Column("recorrencia_fim", sa.Date(), nullable=True),
            sa.Column("created_by", sa.Integer(), nullable=True),
            sa.Column("updated_by", sa.Integer(), nullable=True),
            sa.Column(
                "created_at",
                sa.DateTime(timezone=True),
                server_default=sa.text("CURRENT_TIMESTAMP"),
                nullable=True,
            ),
            sa.Column("updated_at", sa.DateTime(timezone=True), nullable=True),
            sa.ForeignKeyConstraint(["ubs_id"], ["ubs.id"], ondelete="CASCADE"),
            sa.ForeignKeyConstraint(["created_by"], ["usuarios.id"]),
            sa.ForeignKeyConstraint(["updated_by"], ["usuarios.id"]),
            sa.PrimaryKeyConstraint("id"),
        )
        op.create_index(
            "ix_cronograma_events_ubs_id",
            "cronograma_events",
            ["ubs_id"],
        )


def downgrade() -> None:
    bind = op.get_bind()
    inspector = inspect(bind)
    existing_tables = set(inspector.get_table_names())

    if "cronograma_events" in existing_tables:
        op.drop_index("ix_cronograma_events_ubs_id", table_name="cronograma_events")
        op.drop_table("cronograma_events")

    if "educational_material_files" in existing_tables:
        op.drop_index(
            "ix_educational_material_files_material_id",
            table_name="educational_material_files",
        )
        op.drop_table("educational_material_files")

    if "educational_materials" in existing_tables:
        op.drop_index(
            "ix_educational_materials_ubs_id",
            table_name="educational_materials",
        )
        op.drop_table("educational_materials")
