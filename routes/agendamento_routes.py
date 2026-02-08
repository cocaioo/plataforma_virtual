from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, and_, or_
from typing import List, Optional
from datetime import datetime, timedelta, timezone

from database import get_db
from models.auth_models import Usuario, ProfissionalUbs
from models.agendamento_models import Agendamento, BloqueioAgenda, StatusAgendamento
from schemas.agendamento_schemas import (
    AgendamentoCreate, 
    AgendamentoUpdate, 
    AgendamentoResponse,
    BloqueioAgendaCreate,
    BloqueioAgendaResponse
)
from utils.deps import get_current_user

agendamento_router = APIRouter(tags=["Agendamentos"])

# --- Auxiliares ---
async def check_availability(
    db: AsyncSession, 
    profissional_id: int, 
    data_hora: datetime, 
    exclude_agendamento_id: int = None
):
    # Verifica se já existe agendamento ativo no horário (exceto o próprio se for reagendamento)
    query = select(Agendamento).where(
        Agendamento.profissional_id == profissional_id,
        Agendamento.data_hora == data_hora,
        Agendamento.status == StatusAgendamento.AGENDADO
    )
    if exclude_agendamento_id:
        query = query.where(Agendamento.id != exclude_agendamento_id)
        
    result = await db.execute(query)
    if result.scalars().first():
        return False

    # Verifica bloqueios
    query_bloqueio = select(BloqueioAgenda).where(
        BloqueioAgenda.profissional_id == profissional_id,
        and_(BloqueioAgenda.data_inicio <= data_hora, BloqueioAgenda.data_fim >= data_hora)
    )
    result_bloqueio = await db.execute(query_bloqueio)
    if result_bloqueio.scalars().first():
        return False
        
    return True

# --- Rotas de Agendamento ---

@agendamento_router.get("/agendamentos/meus", response_model=List[AgendamentoResponse])
async def get_meus_agendamentos(
    current_user: Usuario = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Retorna o histórico de agendamentos do usuário logado."""
    query = select(Agendamento).where(Agendamento.paciente_id == current_user.id).order_by(Agendamento.data_hora.desc())
    result = await db.execute(query)
    agendamentos = result.scalars().all()
    
    # Preencher nomes (poderia ser feito com join, mas fazendo simples por enquanto)
    response = []
    for a in agendamentos:
        prof = await db.get(ProfissionalUbs, a.profissional_id)
        prof_user = await db.get(Usuario, prof.usuario_id) if prof else None
        
        a_resp = AgendamentoResponse.from_orm(a)
        a_resp.nome_paciente = current_user.nome
        if prof_user:
            a_resp.nome_profissional = prof_user.nome
            a_resp.cargo_profissional = prof.cargo
        response.append(a_resp)
        
    return response

@agendamento_router.post("/agendamentos", response_model=AgendamentoResponse)
async def criar_agendamento(
    agendamento_in: AgendamentoCreate,
    current_user: Usuario = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """
    Agendar consulta.
    Regra: Até duas semanas. Verificar disponibilidade.
    """
    # Usar UTC para comparar com datas que vêm com timezone (do frontend/Pydantic)
    now_utc = datetime.now(timezone.utc)
    
    if agendamento_in.data_hora < now_utc:
        raise HTTPException(status_code=400, detail="Data inválida (passado).")

    # Verificar disponibilidade
    disponivel = await check_availability(db, agendamento_in.profissional_id, agendamento_in.data_hora)
    if not disponivel:
        raise HTTPException(status_code=409, detail="Horário indisponível.")

    novo_agendamento = Agendamento(
        paciente_id=current_user.id,
        profissional_id=agendamento_in.profissional_id,
        data_hora=agendamento_in.data_hora,
        observacoes=agendamento_in.observacoes,
        status=StatusAgendamento.AGENDADO
    )
    
    db.add(novo_agendamento)
    await db.commit()
    await db.refresh(novo_agendamento)
    
    return AgendamentoResponse.from_orm(novo_agendamento)

@agendamento_router.patch("/agendamentos/{agendamento_id}", response_model=AgendamentoResponse)
async def atualizar_agendamento(
    agendamento_id: int,
    agendamento_update: AgendamentoUpdate,
    current_user: Usuario = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Cancelar ou Reagendar."""
    agendamento = await db.get(Agendamento, agendamento_id)
    if not agendamento:
        raise HTTPException(status_code=404, detail="Agendamento não encontrado")

    # Permissão: Paciente dono ou Profissional/Gestor
    # Nota: Simplificando. Se o usuário for profissional, assume que pode gerenciar.
    # Idealmente checar se ele é O profissional da consulta ou admin.
    is_owner = agendamento.paciente_id == current_user.id
    is_staff = current_user.role in ["PROFISSIONAL", "GESTOR", "RECEPCAO"]
    
    if not (is_owner or is_staff):
        raise HTTPException(status_code=403, detail="Sem permissão")

    # Reagendamento (mudança de data)
    if agendamento_update.data_hora:
        now_utc = datetime.now(timezone.utc)
        if agendamento_update.data_hora < now_utc:
             raise HTTPException(status_code=400, detail="Data inválida (passado).")
             
        disponivel = await check_availability(
            db, agendamento.profissional_id, agendamento_update.data_hora, exclude_agendamento_id=agendamento.id
        )
        if not disponivel:
            raise HTTPException(status_code=409, detail="Novo horário indisponível.")
        agendamento.data_hora = agendamento_update.data_hora
        if not agendamento_update.status:
            # Se apenas mudou data, garante status AGENDADO (caso estivesse cancelado)
            agendamento.status = StatusAgendamento.AGENDADO

    if agendamento_update.status:
        agendamento.status = agendamento_update.status
        
    if agendamento_update.observacoes:
        agendamento.observacoes = agendamento_update.observacoes

    await db.commit()
    await db.refresh(agendamento)
    return AgendamentoResponse.from_orm(agendamento)

@agendamento_router.post("/agendamentos/{agendamento_id}/confirmar", response_model=AgendamentoResponse)
async def confirmar_consulta(
    agendamento_id: int,
    current_user: Usuario = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """
    Recepcionista envia confirmação (simulação).
    """
    if current_user.role not in ["PROFISSIONAL", "GESTOR", "RECEPCAO"]: 
        raise HTTPException(status_code=403, detail="Apenas funcionários podem enviar confirmações.")
        
    agendamento = await db.get(Agendamento, agendamento_id)
    if not agendamento:
        raise HTTPException(status_code=404, detail="Agendamento não encontrado")
        
    agendamento.confirmacao_enviada = datetime.now(timezone.utc)
    await db.commit()
    await db.refresh(agendamento)
    return AgendamentoResponse.from_orm(agendamento)

# --- Rotas de Agenda (Visão Staff) ---

@agendamento_router.get("/agenda/profissional/{profissional_id}", response_model=List[AgendamentoResponse])
async def get_agenda_profissional(
    profissional_id: int,
    start_date: datetime,
    end_date: datetime,
    current_user: Usuario = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """
    Ver agenda semanal de um profissional.
    Acessível por: Recepcionista, ACS, Profissional (para ver a própria).
    """
    # TODO: Refinar permissões se necessário. Por enquanto, logado pode ver disponibilidade?
    # Req: "A recepcionista, o profissional da saude e o agente comunitário de saúde podem ver..."
    if current_user.role not in ["PROFISSIONAL", "GESTOR", "RECEPCAO"]:
         raise HTTPException(status_code=403, detail="Acesso restrito a profissionais.")

    query = select(Agendamento).where(
        Agendamento.profissional_id == profissional_id,
        Agendamento.data_hora >= start_date,
        Agendamento.data_hora <= end_date
    ).order_by(Agendamento.data_hora)
    
    result = await db.execute(query)
    agendamentos = result.scalars().all()
    
    # Enriquecer resposta
    response = []
    prof = await db.get(ProfissionalUbs, profissional_id)
    prof_user = await db.get(Usuario, prof.usuario_id) if prof else None

    for a in agendamentos:
        paciente = await db.get(Usuario, a.paciente_id)
        
        a_resp = AgendamentoResponse.from_orm(a)
        if paciente:
            a_resp.nome_paciente = paciente.nome
        if prof_user:
            a_resp.nome_profissional = prof_user.nome
            a_resp.cargo_profissional = prof.cargo
        response.append(a_resp)
        
    return response

# --- Bloqueios de Agenda ---

@agendamento_router.post("/agenda/bloqueios", response_model=BloqueioAgendaResponse)
async def criar_bloqueio(
    bloqueio_in: BloqueioAgendaCreate,
    current_user: Usuario = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """
    Bloqueia dias na agenda.
    Se profissional_id for fornecido, tenta bloquear para aquele profissional (requer permissão).
    Caso contrário, bloqueia para o próprio usuário logado.
    """
    target_prof_id = bloqueio_in.profissional_id
    
    # Se não foi passado ID, assume o próprio usuário
    if not target_prof_id:
        query_prof = select(ProfissionalUbs).where(ProfissionalUbs.usuario_id == current_user.id)
        result = await db.execute(query_prof)
        me_profissional = result.scalars().first()
        
        if not me_profissional:
            raise HTTPException(status_code=403, detail="Usuário não é um profissional de saúde e nenhum ID foi fornecido.")
        target_prof_id = me_profissional.id
    else:
        # Se foi passado ID, validar se existe
        prof = await db.get(ProfissionalUbs, target_prof_id)
        if not prof:
             raise HTTPException(status_code=404, detail="Profissional não encontrado.")
        # TODO: Adicionar verificação de permissão aqui (ex: apenas GESTOR ou o próprio pode bloquear outro)
    
    novo_bloqueio = BloqueioAgenda(
        profissional_id=target_prof_id,
        data_inicio=bloqueio_in.data_inicio,
        data_fim=bloqueio_in.data_fim,
        motivo=bloqueio_in.motivo
    )
    
    db.add(novo_bloqueio)
    await db.commit()
    await db.refresh(novo_bloqueio)
    return BloqueioAgendaResponse.from_orm(novo_bloqueio)

@agendamento_router.get("/agenda/bloqueios", response_model=List[BloqueioAgendaResponse])
async def listar_meus_bloqueios(
    profissional_id: Optional[int] = None,
    current_user: Usuario = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """
    Lista bloqueios.
    Se profissional_id for passado, lista daquele profissional.
    Senão, lista do usuário logado.
    """
    target_id = profissional_id
    
    if not target_id:
        query_prof = select(ProfissionalUbs).where(ProfissionalUbs.usuario_id == current_user.id)
        result = await db.execute(query_prof)
        me_profissional = result.scalars().first()
        
        if not me_profissional:
             # Se não é profissional e não passou ID, retorna lista vazia ou erro?
             # Vamos retornar vazio para evitar 403 em dashboards gerais
             return []
        target_id = me_profissional.id

    query = select(BloqueioAgenda).where(
        BloqueioAgenda.profissional_id == target_id
    ).order_by(BloqueioAgenda.data_inicio.desc())
    
    result = await db.execute(query)
    return result.scalars().all()

@agendamento_router.delete("/agenda/bloqueios/{bloqueio_id}", status_code=status.HTTP_204_NO_CONTENT)
async def deletar_bloqueio(
    bloqueio_id: int,
    current_user: Usuario = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Remove um bloqueio de agenda."""
    bloqueio = await db.get(BloqueioAgenda, bloqueio_id)
    if not bloqueio:
        raise HTTPException(status_code=404, detail="Bloqueio não encontrado.")

    # Se for Gestor, permite excluir qualquer bloqueio
    if current_user.role == "GESTOR":
        await db.delete(bloqueio)
        await db.commit()
        return None

    # Se não for Gestor, verifica se é o dono do bloqueio (Profissional)
    query_prof = select(ProfissionalUbs).where(ProfissionalUbs.usuario_id == current_user.id)
    result = await db.execute(query_prof)
    me_profissional = result.scalars().first()
    
    if not me_profissional:
         raise HTTPException(status_code=403, detail="Acesso restrito a profissionais ou gestores.")

    if bloqueio.profissional_id != me_profissional.id:
        raise HTTPException(status_code=403, detail="Você não pode excluir este bloqueio.")
        
    await db.delete(bloqueio)
    await db.commit()
    return None

@agendamento_router.get("/agendamentos/profissionais", response_model=List[dict])
async def list_profissionais_ativos(
    db: AsyncSession = Depends(get_db),
    current_user: Usuario = Depends(get_current_user)
):
    """Lista profissionais para agendamento."""
    query = select(ProfissionalUbs, Usuario).join(Usuario, ProfissionalUbs.usuario_id == Usuario.id).where(ProfissionalUbs.ativo == True)
    result = await db.execute(query)
    profissionais = []
    for prof, user in result.all():
        profissionais.append({
            "id": prof.id,
            "nome": user.nome,
            "cargo": prof.cargo
        })
    return profissionais

