# OpenBIS Upload Helper (Django Web App)

A web-based upload tool for [BAM Data Store](https://main.datastore.bam.de/) that parses metadata from selected files, creates a preview, and uploads files and metadata to the Data Store.

This version is implemented as a Django web application, with a modular structure for file upload, parsing, and user authentication.


The structure of the metadata and some upload settings are specific to the `OpenBIS` instance used at [BAM](https://www.bam.de) and the [BAM Data Store](https://www.bam.de/Content/DE/Projekte/laufend/BAM-Data-Store/bam-data-store.html).

![](Documentation/GUI.jpg)

## Folder Structure
- **Main Folder:** The Python, HTML and setting files for the Graphical User Interface, files specifying the requirements and license, and this readme file
- **Parser:** Classes for parsing metadata from different file types ([see implemented parsers](#parsers-currently-implemented)).
- **Documentation:** Additional resources and screenshots.
---

## Installation:
Clone (or download) the repository, set up and activate a virtual environment, and install the packages.

For Windows with venv:
```commandline
git clone https://github.com/BAMresearch/openbis-upload-helper
cd openbis-upload-helper
python -m venv .\.venv
venv\Scripts\activate
pip install .
```
For Windows with conda:
```commandline
git clone https://github.com/BAMresearch/openbis-upload-helper
cd openbis-upload-helper
conda create -n .venv python=3.11
conda activate .venv
pip install .

```
---
## Configuration

- Copy `settings.ini.example` to `.env` and adjust your OpenBIS credentials and Django settings as needed.
- Make sure your static files are collected and available.

---

## How to Run

Start the Django development server:

```bash
python openbis_upload_helper/manage.py migrate
python openbis_upload_helper/manage.py runserver
```

Then open [http://127.0.0.1:8000/](http://127.0.0.1:8000/) in your browser.

---

## How to Use

- **Login:** Enter your OpenBIS credentials on the login page.
- **Upload Files:** Select files via drag & drop or file picker. Supported formats include ZIP, TAR, CSV, TXT, DM3, EMD, TIF, etc.
- **Select Space, Project, and Collection:** Choose the OpenBIS space, project, and collection for your upload.
- **Assign Parsers:** After uploading, select the appropriate parser for each file from the available list.
- **Preview & Logs:** View parsing logs and error messages directly in the web interface.
- **Export:** Files and metadata are uploaded to OpenBIS, and preview images/metadata files are generated as needed.

---

## Parsers Currently Implemented

- **Infrared Spectroscopy Data:** CSV from ThermoFischer Scientific OMNIC Software
- **NMR Spectroscopy Data:** JCAMP-DX files from Oxford Instruments SpinFlow
- **SEM Image Data:** TIF files from Zeiss Supra 40 SEM
- **TEM Image Data:** TIF, EMD, DM3 files from ThermoFisher and JEOL instruments
- **Optical Spectroscopy Data:** TXT from SoftMax Pro (MolecularDevices)
- **Dynamic Light Scattering Data:** CSV from Malvern Zetasizer (Legacy)

For details and updates, see the [parsers list](https://github.com/BAMresearch/openbis-upload-helper).

---

## License

- The Upload Helper Tool and parsers are published under the [MIT license](https://opensource.org/license/mit).
- DM3 parsing code is adapted from [Pierre-Ivan Raynal's pyDM3reader](https://github.com/piraynal/pyDM3reader) (MIT license).
- Metadata schemata produced by the parsers are Copyright (C) by the authors.

---

## Contact

For questions or support, please contact the BAM Data Store team or open an issue on GitHub.
