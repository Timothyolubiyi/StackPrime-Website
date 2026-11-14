/** An error the central handler in app.ts turns into `{ code, message }` with this HTTP status. */
export const httpError = (statusCode: number, code: string, message: string) =>
  Object.assign(new Error(message), { statusCode, code, expose: true });
