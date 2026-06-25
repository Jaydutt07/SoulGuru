import { Readable } from "node:stream";
import {
  getClientIp,
  getHttpMethod,
  parseJsonRequest,
  readRequestBody,
  sendErrorJson,
  sendJson
} from "../src/backend/request.js";

const checks = [];

checkBasicRequestHelpers();
await checkJsonParsingContract();
await checkOversizedBodyContract();
await checkErrorResponseContract();

const failed = checks.filter((check) => !check.passed);
printReport();

if (failed.length > 0) {
  process.exit(1);
}

function checkBasicRequestHelpers() {
  const response = createResponse();
  sendJson(response, 202, { ok: true }, { "Cache-Control": "no-store" });

  pushCheck("Request helpers normalize methods, IPs, and JSON responses", [
    getHttpMethod({ method: "post" }) === "POST",
    getHttpMethod({}) === "GET",
    getClientIp({
      headers: { "x-forwarded-for": "203.0.113.4, 10.0.0.1" },
      socket: { remoteAddress: "10.0.0.2" }
    }) === "203.0.113.4",
    response.statusCode === 202,
    response.headers["Content-Type"] === "application/json",
    response.headers["Cache-Control"] === "no-store",
    JSON.parse(response.body).ok === true
  ].every(Boolean));
}

async function checkJsonParsingContract() {
  const parsedObject = await parseJsonRequest({ body: { action: "object" } });
  const parsedString = await parseJsonRequest({ body: "{\"action\":\"string\"}" });
  const parsedEmpty = await parseJsonRequest(createRequest([""]));
  const parsedStream = await parseJsonRequest(createRequest(["{\"action\"", ":\"stream\"}"]));

  pushCheck("JSON parser accepts object, string, empty, and streamed bodies", [
    parsedObject.action === "object",
    parsedString.action === "string",
    Object.keys(parsedEmpty).length === 0,
    parsedStream.action === "stream"
  ].every(Boolean));

  await expectRejects(
    "JSON parser returns a 400 contract for malformed JSON",
    () => parseJsonRequest({ body: "{\"broken\"" }),
    (error) => [
      error.statusCode === 400,
      error.code === "INVALID_JSON",
      /invalid json/i.test(error.message)
    ].every(Boolean)
  );
}

async function checkOversizedBodyContract() {
  await expectRejects(
    "Request body reader returns a 413 contract for oversized payloads",
    () => readRequestBody(createRequest(["12345", "67890"]), 6),
    (error) => [
      error.statusCode === 413,
      error.code === "PAYLOAD_TOO_LARGE",
      /too large/i.test(error.message)
    ].every(Boolean)
  );
}

async function checkErrorResponseContract() {
  const response = createResponse();
  const error = new Error("Invalid JSON request body");
  error.statusCode = 400;
  error.code = "INVALID_JSON";
  await sendErrorJson({
    method: "POST",
    url: "/api/soul-wisdom",
    headers: {}
  }, response, error, {
    route: "soul-wisdom",
    fallbackMessage: "Unable to create guidance"
  });

  pushCheck("Client request errors are returned with their HTTP status", [
    response.statusCode === 400,
    response.headers["Content-Type"] === "application/json",
    JSON.parse(response.body).error === "Invalid JSON request body"
  ].every(Boolean));
}

async function expectRejects(label, action, predicate) {
  try {
    await action();
    pushCheck(label, false);
  } catch (error) {
    pushCheck(label, predicate(error));
  }
}

function createRequest(chunks) {
  const stream = Readable.from(chunks);
  stream.headers = {};
  stream.method = "POST";
  stream.socket = { remoteAddress: "127.0.0.1" };
  return stream;
}

function createResponse() {
  return {
    statusCode: 0,
    headers: {},
    body: "",
    setHeader(name, value) {
      this.headers[name] = value;
    },
    end(body) {
      this.body = body;
    }
  };
}

function pushCheck(label, passed) {
  checks.push({ label, passed });
}

function printReport() {
  console.log(`Request contract check: ${failed.length ? "fail" : "pass"}`);
  for (const check of checks) {
    console.log(`${check.passed ? "PASS" : "FAIL"} ${check.label}`);
  }
}
