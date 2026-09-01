import { ZodError } from "zod";
import { NextResponse } from "next/server";
import { ApiError, jsonError } from "@/domain/errors";
import { PhoneError } from "@/domain/phone";
import { logger } from "./logger";
import { metrics } from "./metrics";

export async function handleApi(
  requestId: string,
  fn: () => Promise<Response>,
): Promise<Response> {
  try {
    return await fn();
  } catch (error) {
    if (error instanceof PhoneError) {
      return NextResponse.json(
        { error: { code: "invalid_input", message: error.message } },
        { status: 400 },
      );
    }
    if (error instanceof ZodError) {
      const message = error.issues.map((issue) => issue.message).join(" ");
      return NextResponse.json(
        {
          error: {
            code: "invalid_input",
            message: message || "Request validation failed.",
            details: error.flatten(),
          },
        },
        { status: 400 },
      );
    }
    const { body, status } = jsonError(error);
    if (status >= 500) {
      metrics.inc("http_errors_5xx");
      logger.error("api_error", { requestId, err: String(error) });
    }
    return NextResponse.json(body, { status });
  }
}

export function requestIdFrom(req: Request): string {
  return req.headers.get("x-request-id") ?? crypto.randomUUID();
}

export async function readJson(req: Request): Promise<unknown> {
  try {
    return await req.json();
  } catch {
    throw new ApiError("invalid_input", 400, "Body must be JSON.");
  }
}
