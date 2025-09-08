# OpenBIS Upload Helper (Django Web App)

The openBIS Upload Helper is a tool to parse files and extract their relevant metadata into objects and vocabularies in openBIS.

This tool works using the package [`bam-masterdata`](https://github.com/BAMresearch/bam-masterdata) to grep the object types definitions. Each parser is loaded via entry points from individual GitHub repositories (see e.g., [`masterdata-parser-example`](https://github.dev/BAMresearch/masterdata-parser-example)).


## Usage

If you want to use this tool for your own openBIS instance, we recommend:
1. Fork the `bam-masterdata` repository.
2. Fork this `openbis-upload-helper` repository.
3. Adapt both forks to your specific openBIS instance.
4. Create your own GitHub repositories for your parsers.
5. Deploy the app at your convenience.

## Development

If you want to develop locally this package, clone the project and enter in the workspace folder:

```sh
git clone https://github.com/BAMresearch/openbis-upload-helper.git
cd openbis-upload-helper
```

Create a virtual environment (you can use Python>3.10) in your workspace:

```sh
python3 -m venv .venv
source .venv/bin/activate
```

Run the following commands to pip install the dependencies:
```sh
pip install --upgrade pip
pip install uv
uv pip install -e '.[dev,parsers]'
```

**Note**: The parsers are loaded as entry points via the optional dependencies in the `pyproject.toml` of this repository.

### Run the app

You can locally deploy the app for development by running:
```sh
python openbis_upload_helper/manage.py runserver
```

This will run the Django app server:
```sh
Performing system checks...

System check identified no issues (0 silenced).
June 05, 2025 - 06:24:20
Django version 5.2.1, using settings 'uploader.settings'
Starting development server at http://127.0.0.1:8000/
Quit the server with CONTROL-C.
```

Simply click on the localhost address, `http://127.0.0.1:8000/`, to launch the app locally.
