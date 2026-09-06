import json
import sys


def main() -> None:
    command = sys.argv[1]

    if command == "hello":
        print(json.dumps({"message": "Hello from Python"}))
        return

    raise ValueError(f"Unknown command: {command}")


if __name__ == "__main__":
    main()