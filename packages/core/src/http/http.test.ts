import { describe, expect, it, vi } from "vitest";
import { z } from "zod";

import {
  AppError, asValue, ConflictError, createApiHandler, createAppContainer,
  createMakeCrudRoute, CSRF_HEADER, ForbiddenError, isAppError, NotFoundError, parseInput,
  readJsonBody, UnauthorizedError, ValidationError,
} from "../index";

function setup() {
  const container = createAppContainer();
  const logger = { info: vi.fn(), warn: vi.fn(), error: vi.fn() };
  container.register({ logger: asValue(logger), principalResolver: asValue({ resolve: async () => null }) });
  return { container, logger, apiHandler: createApiHandler(container) };
}

function request(method = "GET", body?: string, url = "http://localhost/api/items", csrf = true) {
  return new Request(url, { method, ...(body === undefined ? {} : { body }),
    headers: csrf ? { [CSRF_HEADER]: "1" } : {} });
}

const ctx = { params: Promise.resolve({ id: "route-param" }) };

describe("domain errors", () => {
  it("preserves codes, status, names, custom messages and causes", () => {
    const cause = new Error("cause");
    const cases = [
      [UnauthorizedError, "Authentication required", "unauthorized", 401],
      [ForbiddenError, "Forbidden", "forbidden", 403],
      [NotFoundError, "Not found", "not_found", 404],
      [ConflictError, "Conflict", "conflict", 409],
    ] as const;
    for (const [Type, message, code, status] of cases) {
      expect(new Type()).toMatchObject({ message, code, status, name: Type.name });
      expect(new Type("custom", { cause })).toMatchObject({ message: "custom", cause });
    }
    expect(new AppError("base", "base", 418, { cause })).toMatchObject({ name: "AppError", cause });
    expect(new ValidationError({ name: ["required"] })).toMatchObject({
      message: "Invalid input", code: "validation_error", status: 400, fieldErrors: { name: ["required"] },
    });
    expect(new ValidationError({}, "custom", { cause })).toMatchObject({ message: "custom", cause });
  });
});

/** A fresh copy of the errors module, as another Next.js bundle would load it. */
async function foreignErrors() {
  vi.resetModules();
  const copy = await import("./errors");
  expect(copy.AppError).not.toBe(AppError);
  return copy;
}

describe("AppError across module copies", () => {
  it("is recognized by its brand, not by class identity", async () => {
    const copy = await foreignErrors();
    const foreign = new copy.ConflictError("Taken");
    expect(foreign instanceof AppError).toBe(false);
    expect(isAppError(foreign)).toBe(true);
    expect(isAppError(new ConflictError())).toBe(true);
    for (const value of [new Error("Conflict"), { code: "conflict", status: 409 }, "conflict", null, undefined]) {
      expect(isAppError(value)).toBe(false);
    }
  });
});

describe("input validation", () => {
  it("returns schema transformations", () => {
    expect(parseInput(z.string().trim(), "  value  ")).toBe("value");
  });

  it("groups repeated field errors and preserves the first form error", () => {
    const schema = z.object({ name: z.string() }).superRefine((_value, context) => {
      context.addIssue({ code: "custom", path: ["name"], message: "first" });
      context.addIssue({ code: "custom", path: ["name", "nested"], message: "second" });
      context.addIssue({ code: "custom", path: [0], message: "numeric" });
      context.addIssue({ code: "custom", message: "form first" });
      context.addIssue({ code: "custom", message: "form second" });
    });
    expect(() => parseInput(schema, { name: "a" })).toThrowError(expect.objectContaining({
      message: "form first", fieldErrors: { name: ["first", "second"], "0": ["numeric"] },
      cause: expect.any(z.ZodError),
    }));
    expect(() => parseInput(z.object({ name: z.string() }), {})).toThrowError("Invalid input");
  });

  it("reads JSON and maps parser failures to validation errors", async () => {
    await expect(readJsonBody(request("POST", '{"name":"a"}'))).resolves.toEqual({ name: "a" });
    await expect(readJsonBody(request("POST", "bad"))).rejects.toMatchObject({
      message: "Request body must be valid JSON", fieldErrors: {}, cause: expect.any(Error),
    });
  });
});

describe("API envelope", () => {
  it.each(["GET", "HEAD", "OPTIONS"])("permits safe %s requests without CSRF", async (method) => {
    const { apiHandler } = setup();
    const response = await apiHandler(async () => ({ accepted: true }), { access: "public" })(request(method, undefined, undefined, false), ctx);
    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ ok: true, data: { accepted: true } });
  });

  it("creates a scope, awaits parameters and honors custom status", async () => {
    const { apiHandler, container, logger } = setup();
    const scopeSpy = vi.spyOn(container, "createScope");
    const handler = vi.fn(async ({ params, cradle }) => {
      expect(params).toEqual({ id: "route-param" });
      expect(cradle.logger).toBe(logger);
      return "created";
    });
    const wrapped = apiHandler(handler, { access: "public", status: 201 });
    const response = await wrapped(request("POST"), ctx);
    await wrapped(request("POST"), ctx);
    expect(scopeSpy).toHaveBeenCalledTimes(2);
    expect(scopeSpy.mock.results[0]?.value).not.toBe(scopeSpy.mock.results[1]?.value);
    expect(response.status).toBe(201);
    expect(await response.json()).toEqual({ ok: true, data: "created" });
  });

  it.each([undefined, null])("normalizes nullish data %s", async (data) => {
    const { apiHandler } = setup();
    const response = await apiHandler(async () => data, { access: "public" })(request(), ctx);
    expect(await response.json()).toEqual({ ok: true, data: null });
  });

  it("rejects missing CSRF before executing state-changing handlers", async () => {
    const { apiHandler } = setup();
    const handler = vi.fn();
    const response = await apiHandler(handler, { access: "public" })(request("POST", undefined, undefined, false), ctx);
    expect(handler).not.toHaveBeenCalled();
    expect(response.status).toBe(403);
    expect(await response.json()).toEqual({ ok: false, error: { code: "forbidden", message: "Missing CSRF header" } });
  });

  it.each([new UnauthorizedError(), new ForbiddenError(), new NotFoundError(), new ConflictError(),
    new ValidationError({ name: ["required"] })])("maps domain error $code", async (error) => {
    const { apiHandler, logger } = setup();
    const response = await apiHandler(async () => { throw error; }, { access: "public" })(request(), ctx);
    expect(response.status).toBe(error.status);
    expect(await response.json()).toEqual({ ok: false, error: {
      code: error.code, message: error.message,
      ...(error instanceof ValidationError ? { fieldErrors: error.fieldErrors } : {}),
    } });
    expect(logger.error).not.toHaveBeenCalled();
  });

  it("maps a domain error thrown by another copy of core, keeping field errors", async () => {
    const copy = await foreignErrors();
    const { apiHandler, logger } = setup();
    const conflict = await apiHandler(async () => { throw new copy.ConflictError("Taken"); }, { access: "public" })(request(), ctx);
    expect(conflict.status).toBe(409);
    expect(await conflict.json()).toEqual({ ok: false, error: { code: "conflict", message: "Taken" } });
    const invalid = await apiHandler(async () => { throw new copy.ValidationError({ email: ["taken"] }); },
      { access: "public" })(request(), ctx);
    expect(invalid.status).toBe(400);
    expect(await invalid.json()).toEqual({ ok: false,
      error: { code: "validation_error", message: "Invalid input", fieldErrors: { email: ["taken"] } } });
    expect(logger.error).not.toHaveBeenCalled();
  });

  it("logs unexpected failures without disclosing their details", async () => {
    const { apiHandler, logger } = setup();
    const error = new Error("private details");
    const response = await apiHandler(async () => { throw error; }, { access: "public" })(request(), ctx);
    expect(response.status).toBe(500);
    expect(await response.json()).toEqual({ ok: false, error: { code: "internal_error", message: "Something went wrong" } });
    expect(logger.error).toHaveBeenCalledWith("Unhandled API error", { method: "GET", route: "api", error: { name: "Error" } });
  });
});

describe("CRUD handlers", () => {
  function crud() {
    const { apiHandler } = setup();
    const service = { list: vi.fn().mockResolvedValue([]), create: vi.fn().mockResolvedValue({ id: "new" }),
      update: vi.fn().mockResolvedValue({ id: "updated" }), delete: vi.fn().mockResolvedValue(undefined) };
    const schema = z.object({ name: z.string().trim().min(1) });
    const routes = createMakeCrudRoute(apiHandler)({ methods: ["GET", "POST", "PUT", "DELETE"], access: "public",
      service: () => service, createSchema: schema, updateSchema: schema });
    return { routes, service };
  }

  it("delegates all methods with validated input and UUID", async () => {
    const { routes, service } = crud();
    const id = "cf775862-5b99-4f30-a5f5-a52b628c4380";
    const url = `http://localhost/api/items?id=${id}`;
    expect((await routes.GET(request(), ctx)).status).toBe(200);
    expect(service.list).toHaveBeenCalledWith();
    expect((await routes.POST(request("POST", '{"name":" a "}'), ctx)).status).toBe(201);
    expect(service.create).toHaveBeenCalledWith({ name: "a" });
    expect((await routes.PUT(request("PUT", '{"name":" b "}', url), ctx)).status).toBe(200);
    expect(service.update).toHaveBeenCalledWith(id, { name: "b" });
    expect(await (await routes.DELETE(request("DELETE", undefined, url), ctx)).json()).toEqual({ ok: true, data: null });
    expect(service.delete).toHaveBeenCalledWith(id);
  });

  it("rejects missing IDs, malformed JSON and invalid fields before calling services", async () => {
    const { routes, service } = crud();
    expect((await routes.PUT(request("PUT", '{"name":"a"}'), ctx)).status).toBe(400);
    expect((await routes.DELETE(request("DELETE", undefined, "http://localhost/api/items?id=bad"), ctx)).status).toBe(400);
    expect((await routes.POST(request("POST", "bad"), ctx)).status).toBe(400);
    expect((await routes.POST(request("POST", '{"name":""}'), ctx)).status).toBe(400);
    expect(service.update).not.toHaveBeenCalled();
    expect(service.delete).not.toHaveBeenCalled();
    expect(service.create).not.toHaveBeenCalled();
  });

  it("only exposes requested methods and maps service failures", async () => {
    const { apiHandler } = setup();
    const routes = createMakeCrudRoute(apiHandler)({ methods: ["GET"], access: "public", service: () => ({
      list: async () => { throw new NotFoundError("gone"); },
    }) });
    expect(Object.keys(routes)).toEqual(["GET"]);
    expect((await routes.GET(request(), ctx)).status).toBe(404);
  });
});
