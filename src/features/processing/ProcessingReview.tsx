import {
  useState,
} from "react";

import type {
  ProcessingPlan,
} from "../parser/processingPlan";

import {
  countAssignedFiles,
  processingPlanReady,
} from "../parser/processingPlan";

import {
  processSources,
} from "./processing";

import type {
  ProcessResult,
} from "./processing";


interface ProcessingReviewProps {
  space: string;
  project: string;
  collection: string;

  plan: ProcessingPlan;
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


  const ready =
    processingPlanReady(plan);

  const assignedFiles =
    countAssignedFiles(plan);


  async function process() {
    if (!ready || processing) {
      return;
    }

    setProcessing(true);
    setResult(null);
    setError(null);

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


      {result && (
        <p className="processing-success">
          Processing completed successfully.{" "}
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