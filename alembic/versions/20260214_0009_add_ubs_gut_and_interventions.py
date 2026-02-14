"""Add GUT problems and interventions

Revision ID: 20260214_0009
Revises: 20260212_0008
Create Date: 2026-02-14

"""

from __future__ import annotations

from alembic import op
import sqlalchemy as sa
from sqlalchemy import inspect


# revision identifiers, used by Alembic.
revision = "20260214_0009"
down_revision = "20260212_0008"
branch_labels = None
depends_on = None


def upgrade() -> None:
    bind = op.get_bind()
    inspector = inspect(bind)
    existing_tables = set(inspector.get_table_names())

    if "ubs_problems" not in existing_tables:
        op.create_table(
            "ubs_problems",
            sa.Column("id", sa.Integer(), autoincrement=True, nullable=False),
            sa.Column("ubs_id", sa.Integer(), nullable=False),
            sa.Column("titulo", sa.String(length=255), nullable=False),
            sa.Column("descricao", sa.Text(), nullable=True),
            sa.Column("gut_gravidade", sa.Integer(), nullable=False, server_default=sa.text("1")),
            sa.Column("gut_urgencia", sa.Integer(), nullable=False, server_default=sa.text("1")),
            sa.Column("gut_tendencia", sa.Integer(), nullable=False, server_default=sa.text("1")),
            sa.Column("gut_score", sa.Integer(), nullable=False, server_default=sa.text("1")),
            sa.Column(
                "is_prioritario",
                sa.Boolean(),
                nullable=False,
                server_default=sa.text("0"),
            ),
            sa.Column(
                "created_at",
                sa.DateTime(timezone=True),
                server_default=sa.text("CURRENT_TIMESTAMP"),
                nullable=True,
            ),
            sa.Column("updated_at", sa.DateTime(timezone=True), nullable=True),
            sa.ForeignKeyConstraint(["ubs_id"], ["ubs.id"], ondelete="CASCADE"),
            sa.PrimaryKeyConstraint("id"),
        )
        op.create_index("ix_ubs_problems_ubs_id", "ubs_problems", ["ubs_id"])

    if "ubs_interventions" not in existing_tables:
        op.create_table(
            "ubs_interventions",
            sa.Column("id", sa.Integer(), autoincrement=True, nullable=False),
            sa.Column("problem_id", sa.Integer(), nullable=False),
            sa.Column("objetivo", sa.Text(), nullable=False),
            sa.Column("metas", sa.Text(), nullable=True),
            sa.Column("responsavel", sa.String(length=255), nullable=True),
            sa.Column(
                "status",
                sa.String(length=30),
                nullable=False,
                server_default=sa.text("'PLANEJADO'"),
            ),
            sa.Column(
                "created_at",
                sa.DateTime(timezone=True),
                server_default=sa.text("CURRENT_TIMESTAMP"),
                nullable=True,
            ),
            sa.Column("updated_at", sa.DateTime(timezone=True), nullable=True),
            sa.ForeignKeyConstraint(["problem_id"], ["ubs_problems.id"], ondelete="CASCADE"),
            sa.PrimaryKeyConstraint("id"),
        )
        op.create_index(
            "ix_ubs_interventions_problem_id",
            "ubs_interventions",
            ["problem_id"],
        )

    if "ubs_intervention_actions" not in existing_tables:
        op.create_table(
            "ubs_intervention_actions",
            sa.Column("id", sa.Integer(), autoincrement=True, nullable=False),
            sa.Column("intervention_id", sa.Integer(), nullable=False),
            sa.Column("acao", sa.Text(), nullable=False),
            sa.Column("prazo", sa.Date(), nullable=True),
            sa.Column(
                "status",
                sa.String(length=30),
                nullable=False,
                server_default=sa.text("'PLANEJADO'"),
            ),
            sa.Column("observacoes", sa.Text(), nullable=True),
            sa.Column(
                "created_at",
                sa.DateTime(timezone=True),
                server_default=sa.text("CURRENT_TIMESTAMP"),
                nullable=True,
            ),
            sa.Column("updated_at", sa.DateTime(timezone=True), nullable=True),
            sa.ForeignKeyConstraint(
                ["intervention_id"], ["ubs_interventions.id"], ondelete="CASCADE"
            ),
            sa.PrimaryKeyConstraint("id"),
        )
        op.create_index(
            "ix_ubs_intervention_actions_intervention_id",
            "ubs_intervention_actions",
            ["intervention_id"],
        )


def downgrade() -> None:
    bind = op.get_bind()
    inspector = inspect(bind)
    existing_tables = set(inspector.get_table_names())

    if "ubs_intervention_actions" in existing_tables:
        op.drop_index(
            "ix_ubs_intervention_actions_intervention_id",
            table_name="ubs_intervention_actions",
        )
        op.drop_table("ubs_intervention_actions")

    if "ubs_interventions" in existing_tables:
        op.drop_index(
            "ix_ubs_interventions_problem_id",
            table_name="ubs_interventions",
        )
        op.drop_table("ubs_interventions")

    if "ubs_problems" in existing_tables:
        op.drop_index("ix_ubs_problems_ubs_id", table_name="ubs_problems")
        op.drop_table("ubs_problems")
