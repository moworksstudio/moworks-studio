// The app's MCP server for one Claude task (stdio, JSON-RPC 2.0, the subset Claude Code uses): one tool, "permit", which Claude Code calls
// as its --permission-prompt-tool whenever a tool needs a yes (the web in "ask" projects, every edit in Manual mode). The question goes to
// the app's server (MW_PERMIT_URL, with the session token and the task id from the environment), which shows it to the user in the chat
// and answers with the user's choice; the answer goes back to Claude Code as {"behavior": "allow" | "deny", ...}. No answer = deny.
// Claude never sees the token: it lives in this process's environment only. The same server lists the app's own tools
// (MW_APP_TOOLS: board stills, QC sheets, the library search) and passes each call to the server's /api/agent/tool.
import { request as httpRequest } from "node:http";
const URL_ = process.env.MW_PERMIT_URL, TOKEN = process.env.MW_PERMIT_TOKEN, TASK = process.env.MW_PERMIT_TASK;
const send = (o) => process.stdout.write(JSON.stringify(o) + "\n");
const TOOL = { name: "permit", description: "Asks the Moworks Studio owner whether Claude may use a tool now.",
  inputSchema: { type: "object", properties: { tool_name: { type: "string" }, input: { type: "object" }, tool_use_id: { type: "string" } }, required: ["tool_name", "input"] } };

const APP = (() => { try { return JSON.parse(process.env.MW_APP_TOOLS ?? "[]"); } catch { return []; } })();
// node:http, not fetch: fetch (undici) gives up after 300 s without response headers with the bare "fetch failed", and an app tool can
// legitimately take longer (a script that waits for the user's yes to go online, a long capture or render check).
const post = (url, body) => new Promise((resolve, reject) => {
  const u = new URL(url), data = JSON.stringify(body);
  const req = httpRequest({ hostname: u.hostname, port: u.port, path: u.pathname + u.search, method: "POST", agent: false,
    headers: { "Content-Type": "application/json", "Content-Length": Buffer.byteLength(data), "X-MW-Token": TOKEN ?? "" } }, (res) => {
    let text = "";
    res.setEncoding("utf8");
    res.on("data", (d) => { text += d; });
    res.on("end", () => {
      let j; try { j = JSON.parse(text); } catch { return reject(new Error(`The app answered something unreadable (HTTP ${res.statusCode})`)); }
      if (res.statusCode < 200 || res.statusCode >= 300) return reject(new Error(j?.error?.message ?? "The app refused the question."));
      resolve(j);
    });
    res.on("error", reject);
  });
  req.setTimeout(0);                              // no socket timeout: the app answers when the tool is done
  req.on("error", (e) => reject(new Error(e.code === "ECONNREFUSED" || e.code === "ECONNRESET" ? "The app is not answering (was it closed or restarted?)" : e.message)));
  req.end(data);
});
/** Ask, then ask again every ~50 s while the user has not answered (the server never holds one request longer). */
async function ask(args) {
  if (!URL_) return { behavior: "deny", message: "The app is not listening for permission questions." };
  try {
    let j = await post(URL_, { task: TASK, tool_name: args.tool_name, input: args.input ?? {} });
    while (j.pending) j = await post(`${URL_}/wait`, { id: j.pending });
    return j.behavior === "allow" ? { behavior: "allow", updatedInput: args.input ?? {} } : { behavior: "deny", message: j.message || "The owner said no." };
  } catch (e) { return { behavior: "deny", message: `The app could not ask the owner: ${e.message}` }; }
}

async function handle(m) {
  if (m.method === "initialize") return send({ jsonrpc: "2.0", id: m.id, result: { protocolVersion: m.params?.protocolVersion ?? "2025-06-18", capabilities: { tools: {} }, serverInfo: { name: "mw", version: "1.0.0" } } });
  if (m.method === "tools/list") return send({ jsonrpc: "2.0", id: m.id, result: { tools: [TOOL, ...APP] } });
  if (m.method === "tools/call" && APP.some((t) => t.name === m.params?.name)) {
    let r;
    try { r = await post(URL_.replace(/\/permit$/, "/tool"), { task: TASK, name: m.params.name, arguments: m.params.arguments ?? {} }); }
    catch (e) { r = { text: `The app could not do it: ${e.message}`, error: true }; }
    return send({ jsonrpc: "2.0", id: m.id, result: { content: [{ type: "text", text: r.text }], ...(r.error ? { isError: true } : {}) } });
  }
  if (m.method === "tools/call") {
    if (m.params?.name !== "permit") return send({ jsonrpc: "2.0", id: m.id, error: { code: -32602, message: "Unknown tool" } });
    const answer = await ask(m.params.arguments ?? {});
    return send({ jsonrpc: "2.0", id: m.id, result: { content: [{ type: "text", text: JSON.stringify(answer) }] } });
  }
  if (m.method === "ping") return send({ jsonrpc: "2.0", id: m.id, result: {} });
  if (m.id !== undefined) send({ jsonrpc: "2.0", id: m.id, error: { code: -32601, message: "Method not found" } });      // notifications get no answer
}

let buf = "";
process.stdin.setEncoding("utf8");
process.stdin.on("data", (d) => {
  buf += d;
  let i;
  while ((i = buf.indexOf("\n")) >= 0) {
    const line = buf.slice(0, i).trim(); buf = buf.slice(i + 1);
    if (!line) continue;
    let m; try { m = JSON.parse(line); } catch { continue; }
    handle(m).catch(() => {});
  }
});
