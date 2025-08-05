import datetime
import os
import tempfile
import uuid

from app.utils import encrypt_password, get_openbis_from_cache

# from bam_masterdata import get_all_parsers
from bam_masterdata.cli.cli import run_parser
from bam_masterdata.logger import log_storage, logger
from django.conf import settings
from django.contrib.auth import logout
from django.core.cache import cache
from django.shortcuts import redirect, render
from django.views.decorators.http import require_POST
from pybis import Openbis


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
    available_parsers = {
        "MyParser1": "",
        "MyParser2": "",
    }  # change this to get_all_parsers()
    parser_choices = list(available_parsers.keys())
    request.session["parser_choices"] = parser_choices

    # Reset session if requested with button
    if request.method == "GET" and "reset" in request.GET:
        for key in ["uploaded_files", "checker_logs"]:
            request.session.pop(key, None)
        return redirect("homepage")

    # CARD 1: Select files
    if request.method == "POST" and "upload" in request.POST:
        project_name = request.POST.get("project_name")
        collection_name = request.POST.get("collection_name")
        uploaded_files = request.FILES.getlist("files")

        if not uploaded_files:
            context["error"] = "No files uploaded."
            return render(request, "homepage.html", context)

        try:
            saved_file_names = []
            for uploaded_file in uploaded_files:
                suffix = os.path.splitext(uploaded_file.name)[1]
                # save the uploaded file to a temporary location
                with tempfile.NamedTemporaryFile(delete=False, suffix=suffix) as tmp:
                    for chunk in uploaded_file.chunks():
                        tmp.write(chunk)
                    tmp_path = tmp.name
                saved_file_names.append((uploaded_file.name, tmp_path))

            # Save for card 2
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
            print("RUN PARSER:", files_parser)
            # run_parser(openbis=o, files_parser=files_parser, project_name=None, collection_name=None)

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
    if request.session.get("parsers_assigned"):
        uploaded_files = []
    else:
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
