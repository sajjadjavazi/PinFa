type AnalyticsPayload = Record<string, unknown>;

export function logAnalyticsEvent(
  event: string,
  payload: AnalyticsPayload = {},
) {
  console.info(
    JSON.stringify({
      event,
      level: "info",
      payload,
      timestamp: new Date().toISOString(),
    }),
  );
}

export function logAnalyticsError(
  event: string,
  error: unknown,
  payload: AnalyticsPayload = {},
) {
  console.error(
    JSON.stringify({
      errorMessage: getErrorMessage(error),
      event,
      level: "error",
      payload,
      timestamp: new Date().toISOString(),
    }),
  );
}

function getErrorMessage(error: unknown) {
  if (error instanceof Error) {
    return error.message;
  }

  return "Unknown error";
}
