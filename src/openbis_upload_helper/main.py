import argparse

from openbis_upload_helper.client.openbis import login


def main() -> None:
    parser = argparse.ArgumentParser()

    subparsers = parser.add_subparsers(
        dest="command",
        required=True,
    )

    subparsers.add_parser("hello")

    login_parser = subparsers.add_parser("login")

    login_parser.add_argument(
        "--url",
        required=True,
    )

    login_parser.add_argument(
        "--username",
        default="",
    )

    login_parser.add_argument(
        "--password",
        default="",
    )

    login_parser.add_argument(
        "--personal-access-token",
        default="",
    )

    args = parser.parse_args()

    if args.command == "hello":
        print('{"message":"Hello from Python"}')
        return

    if args.command == "login":
        result = login(
            url=args.url,
            username=args.username,
            password=args.password,
            personal_access_token=args.personal_access_token,
        )

        print(result.model_dump_json())
        return


if __name__ == "__main__":
    main()
