from pybis import Openbis
from pydantic import BaseModel


class LoginResult(BaseModel):
    success: bool
    username: str | None = None
    error: str | None = None


def login(
    url: str, username: str = "", password: str = "", personal_access_token: str = ""
) -> LoginResult:
    try:
        openbis = Openbis(url)

        if personal_access_token:
            openbis.set_token(
                personal_access_token,
                save_token=False,
            )

            return LoginResult(
                success=True,
                username=username or None,
            )

        if not username or not password:
            return LoginResult(
                success=False,
                error="Username and password are required.",
            )

        openbis.login(
            username,
            password,
            save_token=False,
        )

        return LoginResult(
            success=True,
            username=username,
        )

    except Exception:
        return LoginResult(
            success=False,
            error="Invalid username/password or personal access token.",
        )
