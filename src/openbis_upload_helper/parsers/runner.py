from bam_masterdata.cli.run_parser import RunParsers
from bam_masterdata.parsing import AbstractParser
from pybis import Openbis

from openbis_upload_helper.parsers.registry import (
    get_parser,
)


def build_files_parser(
    parser_paths: dict[str, list[str]],
) -> dict[AbstractParser, list[str]]:
    """
    Convert parser IDs and filesystem paths into the structure expected
    by bam-masterdata's RunParsers.
    """
    files_parser: dict[
        AbstractParser,
        list[str],
    ] = {}

    for parser_id, paths in parser_paths.items():
        plugin = get_parser(parser_id)

        parser = plugin.parser_class()

        files_parser[parser] = list(paths)

    return files_parser


def run_parsers(
    openbis: Openbis,
    space: str,
    project: str,
    collection: str,
    parser_paths: dict[str, list[str]],
) -> None:
    """
    Execute a resolved parser plan using bam-masterdata RunParsers.

    This is not exposed to Tauri yet. Execution will later happen
    inside an isolated Python process.
    """
    files_parser = build_files_parser(parser_paths)

    runner = RunParsers(
        openbis=openbis,
        space_name=space,
        project_name=project,
        collection_name=collection,
        files_parser=files_parser,
    )

    runner.run()
