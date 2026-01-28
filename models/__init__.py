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