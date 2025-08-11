import datetime
import os
import tarfile
import tempfile
import uuid
import zipfile

from app.utils import encrypt_password, get_openbis_from_cache
from bam_masterdata.cli.cli import run_parser
from bam_masterdata.logger import log_storage, logger
from django.conf import settings
from django.contrib.auth import logout
from django.core.cache import cache
from django.shortcuts import redirect, render
from django.views.decorators.http import require_POST
from pybis import Openbis

# from openbis_upload_helper.uploader.entry_points import get_entry_point_parser


def login(request):
    error = None

    if request.method == "POST":
        username = request.POST.get("username")
        password = request.POST.get("password")
        try:
            o = Openbis(settings.OPENBIS_URL)
            o.login(username, password, save_token=True)
            encrypted_password = encrypt_password(password)
            session_id = str(uuid.uuid4())
            request.session["openbis_username"] = username
            request.session["openbis_password"] = encrypted_password
            request.session["openbis_session_id"] = session_id
            cache.set(session_id, o, timeout=60 * 60)  # Cache for 1 hour (adjustable)
            return redirect("homepage")

        except Exception as e:
            logger.error(f"Login failed for user '{username}': {e}", exc_info=True)
            error = "Invalid username or password."

    return render(request, "login.html", {"error": error})


def logout_view(request):
    request.session.flush()  # Clear all session data
    logout(request)
    return redirect("login")


def homepage(request):
    # Check if the user is logged in
    o = get_openbis_from_cache(request)
    if not o:
        logger.info("User not logged in, redirecting to login page.")
        return redirect("login")
    context = {}
    available_parsers = {"MyParser1": "", "MyParser2": ""}  # get_entry_point_parser()
    parser_choices = list(available_parsers.keys())
    request.session["parser_choices"] = parser_choices
    context["project_name"] = request.session.get("project_name", "")
    context["collection_name"] = request.session.get("collection_name", "")

    # Reset session if requested with button
    if request.method == "GET" and "reset" in request.GET:
        for key in ["uploaded_files", "checker_logs"]:
            request.session.pop(key, None)
        return redirect("homepage")

    # CARD 1: Select files
    if request.method == "POST" and "upload" in request.POST:
        project_name = request.POST.get("project_name")
        collection_name = request.POST.get("collection_name")
        uploaded_files = request.FILES.getlist("files[]")

        selected_files_raw = request.POST.get("selected_files", "[]")
        import json

        try:
            selected_file_names = (
                json.loads(selected_files_raw) if selected_files_raw else []
            )
        except json.JSONDecodeError:
            selected_file_names = []

        if not uploaded_files:
            context["error"] = "No files uploaded."
            return render(request, "homepage.html", context)
        try:
            saved_file_names = []
            for uploaded_file in uploaded_files:
                # save the uploaded file to a temporary location
                if uploaded_file.name.endswith(".zip"):
                    # save zip for unzip
                    with tempfile.NamedTemporaryFile(
                        delete=False, suffix=".zip"
                    ) as tmp_zip:
                        for chunk in uploaded_file.chunks():
                            tmp_zip.write(chunk)
                        tmp_zip_path = tmp_zip.name
                    with zipfile.ZipFile(tmp_zip_path, "r") as zip_ref:
                        for zip_info in zip_ref.infolist():
                            if not zip_info.is_dir():
                                # temp files for each file in the zip
                                suffix = os.path.splitext(zip_info.filename)[1]
                                with tempfile.NamedTemporaryFile(
                                    delete=False, suffix=suffix
                                ) as tmp_file:
                                    tmp_file.write(zip_ref.read(zip_info.filename))
                                    saved_file_names.append(
                                        (zip_info.filename, tmp_file.name)
                                    )
                    os.remove(tmp_zip_path)
                elif (
                    uploaded_file.name.endswith(".tar")
                    or uploaded_file.name.endswith(".tar.gz")
                    or uploaded_file.name.endswith(".tar.z")
                ):
                    # Temporäre Datei zum Speichern des Tar-Archivs
                    suffix = os.path.splitext(uploaded_file.name)[1]
                    with tempfile.NamedTemporaryFile(
                        delete=False, suffix=suffix
                    ) as tmp_tar:
                        for chunk in uploaded_file.chunks():
                            tmp_tar.write(chunk)
                        tmp_tar_path = tmp_tar.name

                    # Tar-Archiv öffnen und Dateien entpacken
                    with tarfile.open(
                        tmp_tar_path, "r:*"
                    ) as tar_ref:  # "r:*" öffnet beliebige komprimierte Tar-Formate
                        for member in tar_ref.getmembers():
                            if member.isfile():
                                # Datei aus dem Archiv lesen
                                extracted_file = tar_ref.extractfile(member)
                                if extracted_file:
                                    suffix = os.path.splitext(member.name)[1]
                                    with tempfile.NamedTemporaryFile(
                                        delete=False, suffix=suffix
                                    ) as tmp_file:
                                        tmp_file.write(extracted_file.read())
                                        saved_file_names.append(
                                            (member.name, tmp_file.name)
                                        )

                    os.remove(tmp_tar_path)
                else:
                    # save regular file
                    suffix = os.path.splitext(uploaded_file.name)[1]
                    with tempfile.NamedTemporaryFile(
                        delete=False, suffix=suffix
                    ) as tmp:
                        for chunk in uploaded_file.chunks():
                            tmp.write(chunk)
                        tmp_path = tmp.name
                    saved_file_names.append((uploaded_file.name, tmp_path))

            # Save for card 2
            context["selected_files"] = selected_file_names
            request.session["selected_files"] = selected_file_names
            context["project_name"] = project_name
            context["collection_name"] = collection_name
            request.session["project_name"] = project_name
            request.session["collection_name"] = collection_name
            request.session["uploaded_files"] = saved_file_names
            request.session["parsers_assigned"] = False
            request.session.pop("checker_logs", None)
            return redirect("homepage")

        except Exception as e:
            logger.exception("Error while uploading files")
            context["error"] = str(e)
            return render(request, "homepage.html", context)

    # CARD 2: Select parser
    elif request.method == "POST" and "assign_parsers" in request.POST:
        uploaded_files = request.session.get("uploaded_files", [])
        parser_choices = request.session.get("parser_choices", [])

        if not uploaded_files:
            context["error"] = "No files uploaded. Please upload files first."
            return render(request, "homepage.html", context)

        context["uploaded_files"] = [name for name, _ in uploaded_files]
        context["parser_choices"] = parser_choices
        try:
            files_parser = {}
            parsed_files = {}

            for idx, (file_name, file_path) in enumerate(uploaded_files):
                parser_name = request.POST.get(f"parser_type_{idx}")
                if not parser_name:
                    raise ValueError(f"No parser selected for file {file_name}")

                files_parser.setdefault(parser_name, []).append(file_path)
                parsed_files.setdefault(parser_name, []).append(file_name)

            # run run_parser for the files
            print(
                files_parser,
                request.session.get("project_name", ""),
                request.session.get("collection_name", ""),
            )
            """
            run_parser(

                openbis=o,

                files_parser=files_parser,

                project_name=request.session.get("project_name", ""),

                collection_name=request.session.get("collection_name", ""),

            )
            """
            # save Logs
            context_logs = logging(request, parsed_files, context)

            context["logs"] = context_logs
            request.session["parsers_assigned"] = True
            request.session["checker_logs"] = context_logs
            return redirect("homepage")

        except Exception as e:
            logger.exception("Error while assigning parsers")
            context["error"] = str(e)
            return render(request, "homepage.html", context)

    # GET request
    context["project_name"] = request.session.get("project_name", "")
    context["collection_name"] = request.session.get("collection_name", "")
    context["parser_assigned"] = request.session.get("parsers_assigned", False)
    uploaded_files = request.session.get("uploaded_files", [])
    context["uploaded_files"] = (
        [name for name, _ in uploaded_files] if uploaded_files else None
    )
    context["parser_choices"] = request.session.get("parser_choices", [])
    context["logs"] = request.session.get("checker_logs")
    return render(request, "homepage.html", context)


def logging(request, parsed_files={}, context={}):
    log_storage.clear()
    for parser, paths in parsed_files.items():
        for path in paths:
            log_storage.append(
                {
                    "event": f"[{parser}] Parsed: {os.path.basename(path)}",
                    "timestamp": datetime.datetime.now().isoformat(),
                    "level": "info",
                }
            )
    # format logs
    context_logs = []
    for log in log_storage:
        if log.get("level") == "debug":
            continue
        log["timestamp"] = datetime.datetime.fromisoformat(
            log["timestamp"].replace("Z", "+00:00")
        ).strftime("%H:%M:%S, %d.%m.%Y")
        context_logs.append(
            {
                "event": log["event"],
                "timestamp": log["timestamp"],
                "level": "danger" if log["level"] == "error" else log["level"],
            }
        )
    context["logs"] = context_logs
    request.session["checker_logs"] = context_logs
    return context_logs


@require_POST
def clear_state(request):
    request.session.pop("checker_logs", None)
    return redirect("homepage")
