import argparse
import sys

from openbis_upload_helper.client.openbis import (
    AuthRequest,
    LoginRequest,
    get_spaces,
    login,
)


def read_payload(input_file: str | None) -> str:
    if input_file:
        with open(input_file, encoding="utf-8") as file:
            return file.read()

    return sys.stdin.read()


def main() -> None:
    parser = argparse.ArgumentParser()

    parser.add_argument(
        "--input-file",
        default=None,
    )

    subparsers = parser.add_subparsers(
        dest="command",
        required=True,
    )

    subparsers.add_parser("hello")
    subparsers.add_parser("login")
    subparsers.add_parser("spaces")

    args = parser.parse_args()

    if args.command == "hello":
        print('{"message":"Hello from Python"}')
        return

    if args.command == "login":
        # input is a JSON payload with the login request, e.g.:
        # {
        #   "server_url": "https://local.openbis.ch/openbis",
        #   "username": "admin",
        #   "password": "test",
        #   "personal_access_token": ""
        # }
        payload = read_payload(args.input_file)

        # output is a JSON payload with the login result, e.g.:
        # {
        #   "success": true,
        #   "username": "admin",
        #   "error": null
        # }
        request = LoginRequest.model_validate_json(payload)
        result = login(request)

        print(result.model_dump_json())
        return

    if args.command == "spaces":
        payload = read_payload(args.input_file)

        request = AuthRequest.model_validate_json(payload)
        result = get_spaces(request)

        print(result.model_dump_json())
        return


if __name__ == "__main__":
    main()
