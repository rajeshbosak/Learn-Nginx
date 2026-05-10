import { useEffect, useMemo, useState } from "react";
import axios from "axios";
import { API_CONFIG, API_ENDPOINTS } from "./config/api";
import "./App.css";

const http = axios.create({
  timeout: API_CONFIG.TIMEOUT,
});
const defaultAdminToken = "local-dev-token";

const scenarios = [
  {
    title: "Health check",
    description: "Use for uptime probes and Nginx upstream checks.",
    endpoint: "/health",
    run: () => http.get(API_ENDPOINTS.HEALTH),
  },
  {
    title: "Readiness check",
    description: "Use before sending traffic to a new backend instance.",
    endpoint: "/ready",
    run: () => http.get(API_ENDPOINTS.READY),
  },
  {
    title: "Metrics",
    description: "Observe request count, latency, errors, and memory usage.",
    endpoint: "/metrics",
    run: () => http.get(API_ENDPOINTS.METRICS),
  },
  {
    title: "Forwarded headers",
    description: "Verify Host, X-Real-IP, X-Forwarded-For, and protocol from Nginx.",
    endpoint: "/debug/headers",
    run: () => http.get(API_ENDPOINTS.HEADERS),
  },
  {
    title: "Cacheable products",
    description: "Use with Nginx proxy_cache and compare generatedAt values.",
    endpoint: "/cache/products",
    run: () => http.get(API_ENDPOINTS.CACHE_PRODUCTS),
  },
];

function App() {
  const [items, setItems] = useState([]);
  const [newItem, setNewItem] = useState("");
  const [loadingItems, setLoadingItems] = useState(false);
  const [selectedScenario, setSelectedScenario] = useState(scenarios[0]);
  const [scenarioResult, setScenarioResult] = useState(null);
  const [scenarioLoading, setScenarioLoading] = useState(false);
  const [delayMs, setDelayMs] = useState(1000);
  const [failRate, setFailRate] = useState(0.5);
  const [statusCode, setStatusCode] = useState(500);
  const [payloadKb, setPayloadKb] = useState(10);
  const [cpuMs, setCpuMs] = useState(100);
  const [customResult, setCustomResult] = useState(null);
  const [errorMessage, setErrorMessage] = useState("");
  const [searchTerm, setSearchTerm] = useState("");
  const [category, setCategory] = useState("");
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(5);
  const [advancedResult, setAdvancedResult] = useState(null);
  const [adminToken, setAdminToken] = useState(defaultAdminToken);
  const [idempotencyKey, setIdempotencyKey] = useState(`order-${Date.now()}`);
  const [requestId, setRequestId] = useState(`web-${Date.now()}`);
  const [events, setEvents] = useState([]);

  const appName = import.meta.env.VITE_APP_NAME || "Nginx Learning Lab";
  const appVersion = import.meta.env.VITE_APP_VERSION || "dev";

  const apiMode = useMemo(() => {
    return API_CONFIG.HOST ? `API host: ${API_CONFIG.HOST}` : "API mode: same-domain proxy";
  }, []);

  const capture = async (request) => {
    const started = performance.now();

    try {
      const response = await request();

      return {
        ok: response.status < 400,
        status: response.status,
        durationMs: Math.round(performance.now() - started),
        data: response.data,
      };
    } catch (error) {
      return {
        ok: false,
        status: error.response?.status || "network",
        durationMs: Math.round(performance.now() - started),
        data: error.response?.data || { message: error.message },
      };
    }
  };

  const fetchItems = async () => {
    setLoadingItems(true);
    setErrorMessage("");

    const result = await capture(() => http.get(API_ENDPOINTS.GET_ALL_ITEMS));
    setLoadingItems(false);

    if (!result.ok) {
      setErrorMessage(`Failed to load items: ${result.data.message || result.status}`);
      setItems([]);
      return;
    }

    setItems(Array.isArray(result.data) ? result.data : result.data.data || []);
  };

  const addItem = async () => {
    if (!newItem.trim()) return;

    const result = await capture(() => http.post(API_ENDPOINTS.CREATE_ITEM, { name: newItem.trim() }));

    if (!result.ok) {
      setErrorMessage(`Failed to add item: ${result.data.message || result.status}`);
      return;
    }

    setNewItem("");
    fetchItems();
  };

  const deleteItem = async (id) => {
    const result = await capture(() => http.delete(API_ENDPOINTS.DELETE_ITEM(id)));

    if (!result.ok) {
      setErrorMessage(`Failed to delete item: ${result.data.message || result.status}`);
      return;
    }

    fetchItems();
  };

  const runScenario = async (scenario) => {
    setSelectedScenario(scenario);
    setScenarioLoading(true);
    setScenarioResult(null);
    setScenarioResult(await capture(scenario.run));
    setScenarioLoading(false);
  };

  const runCustom = async (label, request) => {
    setCustomResult({
      label,
      result: await capture(request),
    });
  };

  const runAdvanced = async (label, request) => {
    setAdvancedResult({
      label,
      result: await capture(request),
    });
  };

  const startEventStream = () => {
    setEvents([]);

    const source = new EventSource(API_ENDPOINTS.EVENTS(8, 750));

    source.addEventListener("metric", (event) => {
      setEvents((current) => [JSON.parse(event.data), ...current].slice(0, 8));
    });

    source.onerror = () => {
      source.close();
    };
  };

  useEffect(() => {
    fetchItems();
  }, []);

  return (
    <main className="app-shell">
      <section className="topbar">
        <div>
          <p className="eyebrow">Reverse proxy, observability, and load testing</p>
          <h1>{appName}</h1>
        </div>
        <div className="status-strip">
          <span>{apiMode}</span>
          <span>Version {appVersion}</span>
        </div>
      </section>

      <section className="grid grid-two">
        <div className="panel">
          <div className="panel-header">
            <div>
              <p className="eyebrow">CRUD traffic</p>
              <h2>Items API</h2>
            </div>
            <button onClick={fetchItems} disabled={loadingItems}>
              Refresh
            </button>
          </div>

          <div className="inline-form">
            <input
              value={newItem}
              onChange={(event) => setNewItem(event.target.value)}
              onKeyDown={(event) => event.key === "Enter" && addItem()}
              placeholder="Add an item name"
            />
            <button onClick={addItem}>Add</button>
          </div>

          {errorMessage && <p className="notice error">{errorMessage}</p>}

          <div className="item-list">
            {Array.isArray(items) && items.map((item) => (
              <div className="item-row" key={item.id}>
                <span>{item.name}</span>
                <button className="secondary" onClick={() => deleteItem(item.id)}>
                  Delete
                </button>
              </div>
            ))}
          </div>
        </div>

        <div className="panel">
          <div className="panel-header">
            <div>
              <p className="eyebrow">Nginx diagnostics</p>
              <h2>Scenario Runner</h2>
            </div>
            <code>{selectedScenario.endpoint}</code>
          </div>

          <div className="scenario-list">
            {scenarios.map((scenario) => (
              <button
                className={selectedScenario.title === scenario.title ? "scenario active" : "scenario"}
                key={scenario.title}
                onClick={() => runScenario(scenario)}
              >
                <strong>{scenario.title}</strong>
                <span>{scenario.description}</span>
              </button>
            ))}
          </div>

          {scenarioLoading && <p className="notice">Running scenario...</p>}
          {scenarioResult && <ResultPanel result={scenarioResult} />}
        </div>
      </section>

      <section className="panel">
        <div className="panel-header">
          <div>
            <p className="eyebrow">Load-test behavior</p>
            <h2>Synthetic Endpoints</h2>
          </div>
        </div>

        <div className="tool-grid">
          <Control
            label="Slow response"
            value={delayMs}
            min="0"
            max="30000"
            suffix="ms"
            onChange={setDelayMs}
            onRun={() => runCustom("Slow response", () => http.get(API_ENDPOINTS.SLOW(delayMs)))}
          />
          <Control
            label="Unstable error rate"
            value={failRate}
            min="0"
            max="1"
            step="0.1"
            suffix="rate"
            onChange={setFailRate}
            onRun={() => runCustom("Unstable endpoint", () => http.get(API_ENDPOINTS.UNSTABLE(failRate)))}
          />
          <Control
            label="Synthetic status"
            value={statusCode}
            min="100"
            max="599"
            suffix="code"
            onChange={setStatusCode}
            onRun={() => runCustom("Synthetic status", () => http.get(API_ENDPOINTS.STATUS(statusCode)))}
          />
          <Control
            label="Payload size"
            value={payloadKb}
            min="1"
            max="1024"
            suffix="KB"
            onChange={setPayloadKb}
            onRun={() => runCustom("Payload", () => http.get(API_ENDPOINTS.PAYLOAD(payloadKb)))}
          />
          <Control
            label="CPU work"
            value={cpuMs}
            min="10"
            max="3000"
            suffix="ms"
            onChange={setCpuMs}
            onRun={() => runCustom("CPU simulation", () => http.get(API_ENDPOINTS.CPU(cpuMs)))}
          />
        </div>

        {customResult && (
          <div className="result-block">
            <h3>{customResult.label}</h3>
            <ResultPanel result={customResult.result} />
          </div>
        )}
      </section>

      <section className="panel">
        <div className="panel-header">
          <div>
            <p className="eyebrow">Production API patterns</p>
            <h2>Advanced Backend Features</h2>
          </div>
        </div>

        <div className="advanced-grid">
          <div className="feature-box">
            <h3>Search and pagination</h3>
            <div className="stacked-form">
              <input
                value={searchTerm}
                onChange={(event) => setSearchTerm(event.target.value)}
                placeholder="Search item names"
              />
              <input
                value={category}
                onChange={(event) => setCategory(event.target.value)}
                placeholder="Category filter"
              />
              <div className="control-row">
                <input type="number" value={page} min="1" onChange={(event) => setPage(event.target.value)} />
                <input type="number" value={limit} min="1" max="100" onChange={(event) => setLimit(event.target.value)} />
                <button onClick={() => runAdvanced("Paginated items", () => http.get(API_ENDPOINTS.PAGINATED_ITEMS(page, limit, searchTerm, category)))}>
                  Search
                </button>
              </div>
            </div>
          </div>

          <div className="feature-box">
            <h3>Seed test data</h3>
            <p>Generate records before load testing pagination, filtering, and large responses.</p>
            <button onClick={() => runAdvanced("Bulk seed", () => http.post(API_ENDPOINTS.BULK_ITEMS, { count: 100 }))}>
              Seed 100 Items
            </button>
          </div>

          <div className="feature-box">
            <h3>Protected admin route</h3>
            <div className="stacked-form">
              <input value={adminToken} onChange={(event) => setAdminToken(event.target.value)} placeholder="x-admin-token" />
              <button onClick={() => runAdvanced("Admin reset", () => http.post(API_ENDPOINTS.ADMIN_RESET, {}, { headers: { "x-admin-token": adminToken } }))}>
                Reset Demo Data
              </button>
            </div>
          </div>

          <div className="feature-box">
            <h3>Idempotent writes</h3>
            <div className="stacked-form">
              <input value={idempotencyKey} onChange={(event) => setIdempotencyKey(event.target.value)} placeholder="idempotency-key" />
              <button onClick={() => runAdvanced("Create order", () => http.post(API_ENDPOINTS.ORDERS, { itemName: "Practice order", quantity: 1 }, { headers: { "idempotency-key": idempotencyKey } }))}>
                Create Order
              </button>
            </div>
          </div>

          <div className="feature-box">
            <h3>Request correlation</h3>
            <div className="stacked-form">
              <input value={requestId} onChange={(event) => setRequestId(event.target.value)} placeholder="x-request-id" />
              <button onClick={() => runAdvanced("Request ID", () => http.get(API_ENDPOINTS.REQUEST_ID, { headers: { "x-request-id": requestId } }))}>
                Send Request ID
              </button>
            </div>
          </div>

          <div className="feature-box">
            <h3>Server-sent events</h3>
            <p>Use this to learn long-lived connections, buffering, and Nginx streaming headers.</p>
            <button onClick={startEventStream}>Start Stream</button>
          </div>
        </div>

        {events.length > 0 && (
          <div className="event-list">
            {events.map((event) => (
              <code key={`${event.requestId}-${event.sequence}`}>
                #{event.sequence} latency={event.averageLatencyMs}ms requests={event.requests}
              </code>
            ))}
          </div>
        )}

        {advancedResult && (
          <div className="result-block">
            <h3>{advancedResult.label}</h3>
            <ResultPanel result={advancedResult.result} />
          </div>
        )}
      </section>

      <section className="panel command-panel">
        <div>
          <p className="eyebrow">Autocannon examples</p>
          <h2>Commands to Try</h2>
        </div>
        <pre>{`autocannon -c 100 -d 20 http://localhost:5000/items
autocannon -c 200 -d 20 http://localhost:5000/health
autocannon -c 50 -d 20 http://localhost:5000/slow?ms=250
autocannon -c 100 -d 20 http://localhost/items
autocannon -c 50 -d 20 http://localhost/api/v1/items?page=1\\&limit=20
autocannon -c 10 -d 20 http://localhost/stream/events?count=10\\&intervalMs=250`}</pre>
      </section>
    </main>
  );
}

function Control({ label, value, onChange, onRun, min, max, step = "1", suffix }) {
  return (
    <div className="control">
      <label>{label}</label>
      <div className="control-row">
        <input
          type="number"
          value={value}
          min={min}
          max={max}
          step={step}
          onChange={(event) => onChange(event.target.value)}
        />
        <span>{suffix}</span>
        <button onClick={onRun}>Run</button>
      </div>
    </div>
  );
}

function ResultPanel({ result }) {
  return (
    <div className={result.ok ? "result ok" : "result failed"}>
      <div className="result-meta">
        <span>Status: {result.status}</span>
        <span>Duration: {result.durationMs}ms</span>
      </div>
      <pre>{JSON.stringify(result.data, null, 2)}</pre>
    </div>
  );
}

export default App;
