from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from typing import List

from database import get_db
from models.auth_models import Usuario
from models.suporte_feedback_models import SuporteFeedback, StatusFeedback
from schemas.suporte_feedback_schemas import (
    SuporteFeedbackCreate,
    SuporteFeedbackUpdateStatus,
    SuporteFeedbackResponse,
)
from utils.deps import get_current_user

suporte_feedback_router = APIRouter(tags=["Suporte e Feedback"])


@suporte_feedback_router.post(
    "/suporte-feedback",
    response_model=SuporteFeedbackResponse,
    status_code=status.HTTP_201_CREATED,
)
async def criar_feedback(
    payload: SuporteFeedbackCreate,
    current_user: Usuario = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Cria uma nova mensagem de suporte/feedback (qualquer usuário autenticado)."""
    if payload.assunto not in ("duvida", "sugestao", "problema"):
        raise HTTPException(status_code=400, detail="Assunto inválido.")

    if not payload.mensagem or not payload.mensagem.strip():
        raise HTTPException(status_code=400, detail="Mensagem não pode ser vazia.")

    novo = SuporteFeedback(
        usuario_id=current_user.id,
        assunto=payload.assunto,
        mensagem=payload.mensagem.strip(),
        status=StatusFeedback.PENDENTE,
    )

    db.add(novo)
    await db.commit()
    await db.refresh(novo)

    resp = SuporteFeedbackResponse.model_validate(novo)
    resp.nome_usuario = current_user.nome
    resp.email_usuario = current_user.email
    return resp


@suporte_feedback_router.get(
    "/suporte-feedback",
    response_model=List[SuporteFeedbackResponse],
)
async def listar_feedbacks(
    current_user: Usuario = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Lista todas as mensagens de feedback (apenas RECEPCAO)."""
    if (current_user.role or "USER").upper() != "RECEPCAO":
        raise HTTPException(status_code=403, detail="Acesso restrito à recepção.")

    query = (
        select(SuporteFeedback)
        .order_by(SuporteFeedback.created_at.desc())
    )
    result = await db.execute(query)
    feedbacks = result.scalars().all()

    response = []
    for fb in feedbacks:
        usuario = await db.get(Usuario, fb.usuario_id)
        fb_resp = SuporteFeedbackResponse.model_validate(fb)
        if usuario:
            fb_resp.nome_usuario = usuario.nome
            fb_resp.email_usuario = usuario.email
        response.append(fb_resp)

    return response


@suporte_feedback_router.patch(
    "/suporte-feedback/{feedback_id}",
    response_model=SuporteFeedbackResponse,
)
async def atualizar_status_feedback(
    feedback_id: int,
    payload: SuporteFeedbackUpdateStatus,
    current_user: Usuario = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Atualiza o status de uma mensagem (apenas RECEPCAO)."""
    if (current_user.role or "USER").upper() != "RECEPCAO":
        raise HTTPException(status_code=403, detail="Acesso restrito à recepção.")

    feedback = await db.get(SuporteFeedback, feedback_id)
    if not feedback:
        raise HTTPException(status_code=404, detail="Mensagem não encontrada.")

    if payload.status not in (StatusFeedback.PENDENTE, StatusFeedback.LIDA):
        raise HTTPException(status_code=400, detail="Status inválido.")

    feedback.status = payload.status
    await db.commit()
    await db.refresh(feedback)

    usuario = await db.get(Usuario, feedback.usuario_id)
    resp = SuporteFeedbackResponse.model_validate(feedback)
    if usuario:
        resp.nome_usuario = usuario.nome
        resp.email_usuario = usuario.email
    return resp
