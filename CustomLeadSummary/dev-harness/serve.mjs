import * as esbuild from "esbuild";
import * as path from "path";
import * as http from "http";
import * as https from "https";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PORT = 3333;

async function main() {
    // esbuild watches + rebuilds on demand; we serve via our own HTTP server
    const ctx = await esbuild.context({
        entryPoints: [path.join(__dirname, "DevApp.tsx")],
        bundle: true,
        outfile: path.join(__dirname, "bundle.js"),
        platform: "browser",
        format: "iife",
        target: "es2020",
        jsx: "transform",
        loader: { ".tsx": "tsx", ".ts": "ts" },
        logLevel: "info",
    });

    // esbuild's internal server (for serving static + rebuilt bundle)
    const { host: esbHost, port: esbPort } = await ctx.serve({
        servedir: __dirname,
        port: 0, // random port — we front it with our own server
    });

    // ── Proxy helper: forward a request to a remote HTTPS host ────────────
    function proxyHttps(targetUrl, reqBody, res) {
        const url = new URL(targetUrl);
        const options = {
            hostname: url.hostname,
            port: 443,
            path: url.pathname + url.search,
            method: "POST",
            headers: {
                "Content-Type": "application/x-www-form-urlencoded",
                "Content-Length": Buffer.byteLength(reqBody),
            },
        };

        const proxyReq = https.request(options, (proxyRes) => {
            res.writeHead(proxyRes.statusCode, {
                "Content-Type": proxyRes.headers["content-type"] || "application/json",
                "Access-Control-Allow-Origin": "*",
            });
            proxyRes.pipe(res);
        });

        proxyReq.on("error", (err) => {
            res.writeHead(502, { "Content-Type": "text/plain", "Access-Control-Allow-Origin": "*" });
            res.end(`Proxy error: ${err.message}`);
        });

        proxyReq.write(reqBody);
        proxyReq.end();
    }

    // ── Proxy helper: forward a GET request to a remote HTTPS host ────────
    function proxyHttpsGet(targetUrl, bearerToken, res) {
        const url = new URL(targetUrl);
        const headers = {};
        if (bearerToken) headers["Authorization"] = `Bearer ${bearerToken}`;

        const options = {
            hostname: url.hostname,
            port: 443,
            path: url.pathname + url.search,
            method: "GET",
            headers,
        };

        const proxyReq = https.request(options, (proxyRes) => {
            res.writeHead(proxyRes.statusCode, {
                "Content-Type": proxyRes.headers["content-type"] || "application/json",
                "Access-Control-Allow-Origin": "*",
            });
            proxyRes.pipe(res);
        });

        proxyReq.on("error", (err) => {
            res.writeHead(502, { "Content-Type": "text/plain", "Access-Control-Allow-Origin": "*" });
            res.end(`Proxy error: ${err.message}`);
        });

        proxyReq.end();
    }

    // ── Proxy helper: forward a JSON POST to a remote HTTPS host ────────────
    function proxyHttpsJson(targetUrl, jsonBody, bearerToken, extraHeaders, res) {
        const url = new URL(targetUrl);
        const payload = JSON.stringify(jsonBody);
        const headers = {
            "Content-Type": "application/json",
            "Content-Length": Buffer.byteLength(payload),
            "Accept": "application/json,*/*;q=0.8",
        };
        if (bearerToken) headers["Authorization"] = `Bearer ${bearerToken}`;
        // Merge any extra headers (e.g. x-ms-conversationid)
        if (extraHeaders && typeof extraHeaders === "object") {
            for (const [k, v] of Object.entries(extraHeaders)) {
                headers[k] = v;
            }
        }

        const options = {
            hostname: url.hostname,
            port: 443,
            path: url.pathname + url.search,
            method: "POST",
            headers,
        };

        console.log(`[csproxy] POST ${targetUrl}`);
        console.log(`[csproxy] Body: ${payload}`);

        const proxyReq = https.request(options, (proxyRes) => {
            // Collect response for logging on errors
            const chunks = [];
            proxyRes.on("data", (chunk) => chunks.push(chunk));
            proxyRes.on("end", () => {
                const body = Buffer.concat(chunks).toString();
                if (proxyRes.statusCode >= 400) {
                    console.log(`[csproxy] Response ${proxyRes.statusCode}: ${body}`);
                } else {
                    console.log(`[csproxy] Response ${proxyRes.statusCode} OK (${body.length} bytes)`);
                }
            });

            res.writeHead(proxyRes.statusCode, {
                "Content-Type": proxyRes.headers["content-type"] || "application/json",
                "Access-Control-Allow-Origin": "*",
            });
            proxyRes.pipe(res);
        });

        proxyReq.on("error", (err) => {
            console.log(`[csproxy] Proxy error: ${err.message}`);
            res.writeHead(502, { "Content-Type": "text/plain", "Access-Control-Allow-Origin": "*" });
            res.end(`Proxy error: ${err.message}`);
        });

        proxyReq.write(payload);
        proxyReq.end();
    }

    // ── Our HTTP server: proxy /auth/*, /csproxy, pass rest to esbuild ─
    const server = http.createServer((req, res) => {
        // CORS preflight
        if (req.method === "OPTIONS") {
            res.writeHead(204, {
                "Access-Control-Allow-Origin": "*",
                "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
                "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Target-Url",
            });
            res.end();
            return;
        }

        // ── /auth/devicecode — proxy to Azure AD device code endpoint
        if (req.url === "/auth/devicecode" && req.method === "POST") {
            let body = "";
            req.on("data", (chunk) => (body += chunk));
            req.on("end", () => {
                // Body contains tenant_id, client_id, scope as URL-encoded params
                const params = new URLSearchParams(body);
                const tenantId = params.get("tenant_id") || "common";
                params.delete("tenant_id");
                const targetUrl = `https://login.microsoftonline.com/${tenantId}/oauth2/v2.0/devicecode`;
                proxyHttps(targetUrl, params.toString(), res);
            });
            return;
        }

        // ── /auth/token — proxy to Azure AD token endpoint
        if (req.url === "/auth/token" && req.method === "POST") {
            let body = "";
            req.on("data", (chunk) => (body += chunk));
            req.on("end", () => {
                const params = new URLSearchParams(body);
                const tenantId = params.get("tenant_id") || "common";
                params.delete("tenant_id");
                const targetUrl = `https://login.microsoftonline.com/${tenantId}/oauth2/v2.0/token`;
                proxyHttps(targetUrl, params.toString(), res);
            });
            return;
        }

        // ── /csproxy — generic proxy for Copilot Studio REST API calls
        if (req.url === "/csproxy" && req.method === "POST") {
            let body = "";
            req.on("data", (chunk) => (body += chunk));
            req.on("end", () => {
                try {
                    const { targetUrl, method, accessToken, payload, extraHeaders } = JSON.parse(body);
                    if (method === "POST") {
                        proxyHttpsJson(targetUrl, payload || {}, accessToken, extraHeaders, res);
                    } else {
                        proxyHttpsGet(targetUrl, accessToken, res);
                    }
                } catch (err) {
                    res.writeHead(400, { "Content-Type": "text/plain", "Access-Control-Allow-Origin": "*" });
                    res.end(`Invalid proxy request: ${err.message}`);
                }
            });
            return;
        }

        // ── /csproxy/sse — SSE proxy: POST to Copilot Studio, collect SSE stream,
        //    parse activities, return as JSON { conversationId, activities }
        if (req.url === "/csproxy/sse" && req.method === "POST") {
            let body = "";
            req.on("data", (chunk) => (body += chunk));
            req.on("end", () => {
                try {
                    const { targetUrl, accessToken, payload, extraHeaders } = JSON.parse(body);
                    const url = new URL(targetUrl);
                    const jsonPayload = JSON.stringify(payload || {});
                    const headers = {
                        "Content-Type": "application/json",
                        "Content-Length": Buffer.byteLength(jsonPayload),
                        "Accept": "text/event-stream,application/json;q=0.9,*/*;q=0.8",
                    };
                    if (accessToken) headers["Authorization"] = `Bearer ${accessToken}`;
                    if (extraHeaders && typeof extraHeaders === "object") {
                        for (const [k, v] of Object.entries(extraHeaders)) {
                            headers[k] = v;
                        }
                    }

                    console.log(`[csproxy/sse] POST ${targetUrl}`);
                    console.log(`[csproxy/sse] Body: ${jsonPayload}`);

                    const proxyReq = https.request({
                        hostname: url.hostname,
                        port: 443,
                        path: url.pathname + url.search,
                        method: "POST",
                        headers,
                    }, (proxyRes) => {
                        const contentType = proxyRes.headers["content-type"] || "";
                        const conversationId = proxyRes.headers["x-ms-conversationid"] || "";
                        console.log(`[csproxy/sse] Response ${proxyRes.statusCode} (${contentType}), conversationId: ${conversationId}`);

                        if (proxyRes.statusCode >= 400) {
                            let errBody = "";
                            proxyRes.on("data", (chunk) => (errBody += chunk));
                            proxyRes.on("end", () => {
                                console.log(`[csproxy/sse] Error body: ${errBody}`);
                                res.writeHead(proxyRes.statusCode, {
                                    "Content-Type": "application/json",
                                    "Access-Control-Allow-Origin": "*",
                                });
                                res.end(JSON.stringify({ error: errBody, statusCode: proxyRes.statusCode }));
                            });
                            return;
                        }

                        // If the API returns JSON (not SSE), pass it through directly
                        if (contentType.includes("application/json")) {
                            let jsonBody = "";
                            proxyRes.on("data", (chunk) => (jsonBody += chunk));
                            proxyRes.on("end", () => {
                                console.log(`[csproxy/sse] JSON response (${jsonBody.length} bytes)`);
                                try {
                                    const parsed = JSON.parse(jsonBody);
                                    parsed.conversationId = parsed.conversationId || conversationId;
                                    res.writeHead(200, {
                                        "Content-Type": "application/json",
                                        "Access-Control-Allow-Origin": "*",
                                    });
                                    res.end(JSON.stringify(parsed));
                                } catch (e) {
                                    res.writeHead(200, {
                                        "Content-Type": "application/json",
                                        "Access-Control-Allow-Origin": "*",
                                    });
                                    res.end(JSON.stringify({ conversationId, activities: [], raw: jsonBody }));
                                }
                            });
                            return;
                        }

                        // SSE response — collect and parse events
                        let sseData = "";
                        proxyRes.on("data", (chunk) => (sseData += chunk));
                        proxyRes.on("end", () => {
                            console.log(`[csproxy/sse] SSE stream (${sseData.length} bytes):`);
                            console.log(`[csproxy/sse] RAW DATA START >>>>`);
                            console.log(sseData);
                            console.log(`[csproxy/sse] RAW DATA END <<<<`);
                            const activities = [];
                            // Parse SSE format: split on double-newline (handle \r\n too)
                            const blocks = sseData.split(/\r?\n\r?\n/);
                            for (const block of blocks) {
                                const lines = block.trim().split(/\r?\n/);
                                let eventType = "";
                                let dataLines = [];
                                for (const line of lines) {
                                    if (line.startsWith("event:")) eventType = line.slice(6).trim();
                                    else if (line.startsWith("data:")) dataLines.push(line.slice(5).trimStart());
                                }
                                const dataStr = dataLines.join("");
                                console.log(`[csproxy/sse] Block: event="${eventType}" data="${dataStr.substring(0, 200)}..."`);
                                // Accept any event type that has data (not just "activity")
                                if (dataStr) {
                                    try {
                                        const parsed = JSON.parse(dataStr);
                                        // If it's an activity object, add it
                                        if (parsed.type) {
                                            activities.push(parsed);
                                        }
                                        // If it wraps activities array
                                        if (Array.isArray(parsed.activities)) {
                                            activities.push(...parsed.activities);
                                        }
                                        // If it's a BotResponse-like object with action
                                        if (parsed.action && !parsed.type) {
                                            console.log(`[csproxy/sse] BotResponse-like: action=${parsed.action}`);
                                        }
                                    } catch (e) {
                                        console.log(`[csproxy/sse] Failed to parse: ${dataStr.substring(0, 200)}`);
                                    }
                                }
                            }
                            console.log(`[csproxy/sse] Parsed ${activities.length} activities total`);
                            res.writeHead(200, {
                                "Content-Type": "application/json",
                                "Access-Control-Allow-Origin": "*",
                            });
                            res.end(JSON.stringify({ conversationId, activities }));
                        });
                    });

                    proxyReq.on("error", (err) => {
                        console.log(`[csproxy/sse] Proxy error: ${err.message}`);
                        res.writeHead(502, { "Content-Type": "text/plain", "Access-Control-Allow-Origin": "*" });
                        res.end(`Proxy error: ${err.message}`);
                    });

                    proxyReq.write(jsonPayload);
                    proxyReq.end();
                } catch (err) {
                    res.writeHead(400, { "Content-Type": "text/plain", "Access-Control-Allow-Origin": "*" });
                    res.end(`Invalid SSE proxy request: ${err.message}`);
                }
            });
            return;
        }

        // ── Everything else → forward to esbuild's static server ──────────
        const options = {
            hostname: esbHost === "0.0.0.0" ? "127.0.0.1" : esbHost,
            port: esbPort,
            path: req.url,
            method: req.method,
            headers: req.headers,
        };

        const proxyReq = http.request(options, (proxyRes) => {
            res.writeHead(proxyRes.statusCode, proxyRes.headers);
            proxyRes.pipe(res, { end: true });
        });

        req.pipe(proxyReq, { end: true });
    });

    server.listen(PORT, () => {
        console.log(`\n  🧪 Dev harness running at http://localhost:${PORT}\n`);
    });
}

main().catch((err) => {
    console.error(err);
    process.exit(1);
});
