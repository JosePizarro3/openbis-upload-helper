import {
  useEffect,
  useRef,
  useState,
} from "react";
import {
  save as showSaveDialog,
} from "@tauri-apps/plugin-dialog";

import type {
  ProcessingPlan,
} from "../parser/processingPlan";

import {
  countAssignedFiles,
  processingPlanReady,
} from "../parser/processingPlan";

import {
  listenToProcessingEvents,
  processSources,
  saveProcessingLogs,
} from "./processing";

import type {
  ProcessingEvent,
  ProcessResult,
} from "./processing";


interface ProcessingReviewProps {
  space: string;
  project: string;
  collection: string;

  plan: ProcessingPlan;
}


function formatTimestamp(
  timestamp?: string | null,
): string {
  if (!timestamp) {
    return "";
  }

  const date = new Date(timestamp);

  if (Number.isNaN(date.getTime())) {
    return timestamp;
  }

  return date.toLocaleTimeString(
    [],
    {
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
      hour12: false,
    },
  );
}


function normalizeLevel(
  level: string,
): string {
  return level
    .trim()
    .toLowerCase();
}


async function exportLogs(
  events: ProcessingEvent[],
  space: string,
  project: string,
  collection: string,
) {
  const timestamp =
    new Date()
      .toISOString()
      .replace(/:/g, "-");

  const defaultFileName =
    `openbis-processing-logs-${timestamp}.json`;

  const path =
    await showSaveDialog({
      defaultPath: defaultFileName,

      filters: [
        {
          name: "JSON",
          extensions: ["json"],
        },
      ],
    });

  if (!path) {
    return;
  }

  const data = {
    exportedAt:
      new Date().toISOString(),

    destination: {
      space,
      project,
      collection:
        collection || null,
    },

    logs: events,
  };

  await saveProcessingLogs(
    path,
    JSON.stringify(
      data,
      null,
      2,
    ),
  );
}


export function ProcessingReview({
  space,
  project,
  collection,
  plan,
}: ProcessingReviewProps) {
  const [processing, setProcessing] =
    useState(false);

  const [result, setResult] =
    useState<ProcessResult | null>(
      null,
    );

  const [error, setError] =
    useState<string | null>(null);

  const [events, setEvents] =
    useState<ProcessingEvent[]>([]);

  const [currentStage, setCurrentStage] =
    useState<string | null>(null);

  const logEndRef =
    useRef<HTMLDivElement | null>(null);


  const ready =
    processingPlanReady(plan);

  const assignedFiles =
    countAssignedFiles(plan);


  /*
   * Subscribe once to the processing events emitted
   * by the Rust backend.
   */
  useEffect(() => {
    let unlisten:
      (() => void) | undefined;

    let disposed = false;


    listenToProcessingEvents(
      (event) => {
        if (disposed) {
          return;
        }

        setEvents(
          (current) => [
            ...current,
            event,
          ],
        );

        if (
          event.kind === "stage" &&
          event.stage
        ) {
          setCurrentStage(
            event.stage,
          );
        }
      },
    ).then(
      (cleanup) => {
        if (disposed) {
          cleanup();
          return;
        }

        unlisten = cleanup;
      },
    );


    return () => {
      disposed = true;
      unlisten?.();
    };
  }, []);


  /*
   * Keep the newest processing message visible.
   */
  useEffect(() => {
    logEndRef.current
      ?.scrollIntoView({
        behavior: "smooth",
        block: "nearest",
      });
  }, [events]);


  async function process() {
    if (!ready || processing) {
      return;
    }

    setProcessing(true);

    setResult(null);
    setError(null);

    setEvents([]);
    setCurrentStage("starting");


    try {
      const response =
        await processSources({
          space,
          project,
          collection,
          jobs: plan.jobs,
        });


      if (!response.success) {
        setError(
          response.error ??
            "Processing failed.",
        );

        return;
      }


      setResult(response);
    } catch (error) {
      setError(
        error instanceof Error
          ? error.message
          : String(error),
      );
    } finally {
      setProcessing(false);
    }
  }


  const warningCount =
    events.filter(
      (event) =>
        normalizeLevel(
          event.level,
        ) === "warning",
    ).length;

  const errorLogCount =
    events.filter(
      (event) => {
        const level =
          normalizeLevel(
            event.level,
          );

        return (
          level === "error" ||
          level === "critical"
        );
      },
    ).length;


  return (
    <div className="processing-review">
      <div className="processing-review-details">
        <div>
          <span className="processing-review-label">
            Destination
          </span>

          <strong>
            /{space}/{project}
            {collection
              ? `/${collection}`
              : ""}
          </strong>
        </div>


        <div>
          <span className="processing-review-label">
            Files
          </span>

          <strong>
            {assignedFiles}
          </strong>
        </div>


        <div>
          <span className="processing-review-label">
            Parser jobs
          </span>

          <strong>
            {plan.jobs.length}
          </strong>
        </div>
      </div>


      <p className="processing-review-warning">
        This action parses the selected files and
        writes the resulting data to openBIS.
      </p>


      <button
        type="button"
        className="processing-start-button"
        disabled={
          !ready ||
          processing
        }
        onClick={process}
      >
        {processing
          ? "Processing..."
          : "Process & upload"}
      </button>


      {(processing ||
        events.length > 0) && (
        <div className="processing-monitor">
          <div className="processing-monitor-header">
            <div>
                <strong>
                Processing logs
                </strong>

                {processing && (
                <span className="processing-running">
                    Running
                </span>
                )}
            </div>


            <div className="processing-monitor-actions">
                {currentStage && (
                <span className="processing-stage">
                    {currentStage}
                </span>
                )}

                <button
                type="button"
                className="processing-export-button"
                disabled={events.length === 0}
                onClick={() => {
                    void exportLogs(
                    events,
                    space,
                    project,
                    collection,
                    );
                }}
                >
                Export JSON
                </button>
            </div>
          </div>


          <div
            className="processing-log"
            role="log"
            aria-live="polite"
          >
            {events.length === 0 ? (
              <div className="processing-log-empty">
                Waiting for processing output...
              </div>
            ) : (
              events.map(
                (event, index) => {
                  const level =
                    normalizeLevel(
                      event.level,
                    );

                  return (
                    <div
                      key={index}
                      className={
                        `processing-log-entry processing-log-${level}`
                      }
                    >
                      <span className="processing-log-time">
                        {formatTimestamp(
                          event.timestamp,
                        )}
                      </span>

                      <span
                        className={
                          `processing-log-level processing-log-level-${level}`
                        }
                      >
                        {level}
                      </span>

                      <span className="processing-log-message">
                        {event.message}
                      </span>
                    </div>
                  );
                },
              )
            )}

            <div ref={logEndRef} />
          </div>


          {(warningCount > 0 ||
            errorLogCount > 0) && (
            <div className="processing-log-summary">
              {warningCount > 0 && (
                <span className="processing-warning-count">
                  {warningCount} warning
                  {warningCount === 1
                    ? ""
                    : "s"}
                </span>
              )}

              {errorLogCount > 0 && (
                <span className="processing-error-count">
                  {errorLogCount} error
                  {errorLogCount === 1
                    ? ""
                    : "s"}
                </span>
              )}
            </div>
          )}
        </div>
      )}


      {result && (
        <p
          className={
            warningCount > 0 ||
            errorLogCount > 0
              ? "processing-success-with-warnings"
              : "processing-success"
          }
        >
          {warningCount > 0 ||
          errorLogCount > 0
            ? "Processing completed with logged warnings or errors."
            : "Processing completed successfully."}{" "}

          {result.processedFiles} file
          {result.processedFiles === 1
            ? ""
            : "s"}{" "}
          processed in {result.jobs} job
          {result.jobs === 1
            ? ""
            : "s"}.
        </p>
      )}


      {error && (
        <p className="processing-error">
          {error}
        </p>
      )}
    </div>
  );
}