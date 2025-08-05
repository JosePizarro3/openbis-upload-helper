import importlib.metadata


def get_entry_point_parsers() -> dict[str, dict]:
    """
    Get all parsers by loading their entry points as defined in the `bam.parsers` group of each individual parser package.

    Returns:
        dict[str, dict]: A dictionary where keys are parser names and values are the loaded parser functions.
    """
    parsers = {}
    for entry_point in importlib.metadata.entry_points(group="bam.parsers"):
        parsers[entry_point.name] = entry_point.load()
    return parsers
