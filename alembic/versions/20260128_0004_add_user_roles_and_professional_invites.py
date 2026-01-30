"""add user roles and professional invites

Revision ID: 20260128_0004
Revises: 20260108_0003
Create Date: 2026-01-28

"""

from __future__ import annotations

from alembic import op
import sqlalchemy as sa

# revision identifiers, used by Alembic.
revision = "20260128_0004"
down_revision = "20260108_0003"
branch_labels = None
depends_on = None


def upgrade() -> None:
    # Roles no usuário
    with op.batch_alter_table("usuarios") as batch:
        batch.add_column(sa.Column("role", sa.String(length=20), nullable=False, server_default="USER"))

    # Backfill: usuários que já possuem registro em profissionais viram PROFISSIONAL
    op.execute(
        "UPDATE usuarios SET role = 'PROFISSIONAL' WHERE id IN (SELECT usuario_id FROM profissionais)"
    )

    # Convites de profissional (uso único)
    op.create_table(
        "professional_invites",
        sa.Column("id", sa.Integer(), primary_key=True, autoincrement=True, nullable=False),
        sa.Column("code_hash", sa.String(length=128), nullable=False, unique=True),
        sa.Column("expires_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("used_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("used_by_user_id", sa.Integer(), sa.ForeignKey("usuarios.id"), nullable=True),
        sa.Column("created_by_user_id", sa.Integer(), sa.ForeignKey("usuarios.id"), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.text("CURRENT_TIMESTAMP")),
    )

    op.create_index(
        "ix_professional_invites_created_by",
        "professional_invites",
        ["created_by_user_id"],
        unique=False,
    )
    op.create_index(
        "ix_professional_invites_used_by",
        "professional_invites",
        ["used_by_user_id"],
        unique=False,
    )
    op.create_index(
        "ix_professional_invites_expires_at",
        "professional_invites",
        ["expires_at"],
        unique=False,
    )


def downgrade() -> None:
    op.drop_index("ix_professional_invites_expires_at", table_name="professional_invites")
    op.drop_index("ix_professional_invites_used_by", table_name="professional_invites")
    op.drop_index("ix_professional_invites_created_by", table_name="professional_invites")
    op.drop_table("professional_invites")

    with op.batch_alter_table("usuarios") as batch:
        batch.drop_column("role")
