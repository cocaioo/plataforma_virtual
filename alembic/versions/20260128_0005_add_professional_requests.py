"""add professional requests

Revision ID: 20260128_0005
Revises: 20260128_0004
Create Date: 2026-01-28

"""

from __future__ import annotations

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = "20260128_0005"
down_revision = "20260128_0004"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        "professional_requests",
        sa.Column("id", sa.Integer(), primary_key=True, autoincrement=True, nullable=False),
        sa.Column("user_id", sa.Integer(), sa.ForeignKey("usuarios.id"), nullable=False),
        sa.Column("cargo", sa.String(length=100), nullable=False),
        sa.Column("registro_profissional", sa.String(length=50), nullable=False),
        sa.Column("status", sa.String(length=20), nullable=False, server_default="PENDING"),
        sa.Column("rejection_reason", sa.String(length=255), nullable=True),
        sa.Column("submitted_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.text("CURRENT_TIMESTAMP")),
        sa.Column("reviewed_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("reviewed_by_user_id", sa.Integer(), sa.ForeignKey("usuarios.id"), nullable=True),
    )

    op.create_index(
        "ix_professional_requests_user_id",
        "professional_requests",
        ["user_id"],
        unique=False,
    )
    op.create_index(
        "ix_professional_requests_status",
        "professional_requests",
        ["status"],
        unique=False,
    )

    # Evita duplicidade de registro_profissional em solicitações aprovadas/pendentes.
    # Em SQLite, partial index nem sempre é suportado; mantemos único global como MVP.
    op.create_unique_constraint(
        "uq_professional_requests_registro_profissional",
        "professional_requests",
        ["registro_profissional"],
    )

    # MVP: uma solicitação por usuário (permite reenvio via atualização da mesma linha)
    op.create_unique_constraint(
        "uq_professional_requests_user_id",
        "professional_requests",
        ["user_id"],
    )


def downgrade() -> None:
    op.drop_constraint("uq_professional_requests_user_id", "professional_requests", type_="unique")
    op.drop_constraint("uq_professional_requests_registro_profissional", "professional_requests", type_="unique")
    op.drop_index("ix_professional_requests_status", table_name="professional_requests")
    op.drop_index("ix_professional_requests_user_id", table_name="professional_requests")
    op.drop_table("professional_requests")
