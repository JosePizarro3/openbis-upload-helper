import argparse
import sys

from openbis_upload_helper.client.openbis import LoginRequest, login


def main() -> None:
    parser = argparse.ArgumentParser()

    subparsers = parser.add_subparsers(
        dest="command",
        required=True,
    )

    subparsers.add_parser("hello")
    subparsers.add_parser("login")

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
        payload = sys.stdin.read()

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


if __name__ == "__main__":
    main()
