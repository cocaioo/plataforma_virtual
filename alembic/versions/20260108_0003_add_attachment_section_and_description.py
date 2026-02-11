"""add attachment section and description

Revision ID: 20260108_0003
Revises: 20260108_0002
Create Date: 2026-01-08

"""

from __future__ import annotations

from alembic import op
import sqlalchemy as sa
from sqlalchemy import inspect

# revision identifiers, used by Alembic.
revision = "20260108_0003"
down_revision = "20260108_0002"
branch_labels = None
depends_on = None


def upgrade() -> None:
    bind = op.get_bind()
    inspector = inspect(bind)
    columns = [col["name"] for col in inspector.get_columns("ubs_attachments")]
    with op.batch_alter_table("ubs_attachments") as batch_op:
        if "section" not in columns:
            batch_op.add_column(sa.Column("section", sa.String(length=50), nullable=True))
        if "description" not in columns:
            batch_op.add_column(sa.Column("description", sa.Text(), nullable=True))


def downgrade() -> None:
    bind = op.get_bind()
    inspector = inspect(bind)
    columns = [col["name"] for col in inspector.get_columns("ubs_attachments")]
    with op.batch_alter_table("ubs_attachments") as batch_op:
        if "description" in columns:
            batch_op.drop_column("description")
        if "section" in columns:
            batch_op.drop_column("section")
