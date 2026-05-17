# =========================
# ATENÇÃO: este arquivo existe apenas para compatibilidade retroativa.
# A lógica real de JWT está em utils/jwt.py (lê JWT_SECRET_KEY do ambiente).
# Não adicione lógica nova aqui.
# =========================
from utils.jwt import gerar_token, verificar_token as validar_token

__all__ = ["gerar_token", "validar_token"]