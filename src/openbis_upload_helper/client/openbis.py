from pybis import Openbis
from pydantic import BaseModel


class LoginRequest(BaseModel):
    server_url: str
    username: str = ""
    password: str = ""
    personal_access_token: str = ""


class LoginResult(BaseModel):
    success: bool
    username: str | None = None
    error: str | None = None


def login(request: LoginRequest) -> LoginResult:
    try:
        openbis = Openbis(request.server_url)

        # PAT takes precedence, matching the old Django application.
        if request.personal_access_token:
            openbis.set_token(
                request.personal_access_token,
                save_token=False,
            )

            return LoginResult(
                success=True,
                username=request.username or None,
            )

        if not request.username or not request.password:
            return LoginResult(
                success=False,
                error="Username and password are required.",
            )

        openbis.login(
            request.username,
            request.password,
            save_token=False,
        )

        return LoginResult(
            success=True,
            username=request.username,
        )

    except Exception:
        return LoginResult(
            success=False,
            error="Invalid username/password or personal access token.",
        )
