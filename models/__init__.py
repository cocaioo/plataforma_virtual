# Torna `models` um pacote para que imports com efeitos colaterais (metadata) funcionem.

from .auth_models import Usuario, ProfissionalUbs, LoginAttempt, ProfessionalRequest  # noqa: F401
from .diagnostico_models import (  # noqa: F401
    UBS,
    Service,
    UBSService,
    Indicator,
    ProfessionalGroup,
    TerritoryProfile,
    UBSNeeds,
)
from .agendamento_models import Agendamento, BloqueioAgenda # noqa: F401
from .materiais_models import EducationalMaterial, EducationalMaterialFile  # noqa: F401
from .cronograma_models import CronogramaEvent  # noqa: F401