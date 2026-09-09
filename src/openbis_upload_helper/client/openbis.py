from pybis import Openbis
from pydantic import BaseModel, Field


class LoginRequest(BaseModel):
    server_url: str
    username: str = ""
    password: str = ""
    personal_access_token: str = ""


class LoginResult(BaseModel):
    success: bool
    username: str | None = None
    token: str | None = None
    error: str | None = None


class AuthRequest(BaseModel):
    server_url: str
    token: str


class SpacesResult(BaseModel):
    success: bool
    spaces: list[str] = Field(default_factory=list)
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

            # set_token() assigns the token locally. Make an authenticated
            # request to verify that the provided PAT is actually valid.
            openbis.get_spaces()

            return LoginResult(
                success=True,
                username=request.username or None,
                token=openbis.token,
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
            token=openbis.token,
        )

    except Exception:
        return LoginResult(
            success=False,
            error="Invalid username/password or personal access token.",
        )


def get_spaces(request: AuthRequest) -> SpacesResult:
    try:
        openbis = Openbis(request.server_url)

        openbis.set_token(
            request.token,
            save_token=False,
        )

        spaces = [space.code for space in openbis.get_spaces()]

        return SpacesResult(
            success=True,
            spaces=spaces,
        )

    except Exception as exc:
        return SpacesResult(
            success=False,
            error=f"Could not retrieve spaces from openBIS: {exc}",
        )
