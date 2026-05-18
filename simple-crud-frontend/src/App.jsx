import { useEffect, useMemo, useState } from "react";
import axios from "axios";
import { API_CONFIG, API_ENDPOINTS } from "./config/api";
import "./App.css";

const http = axios.create({
  timeout: API_CONFIG.TIMEOUT,
});

const defaultAdminToken = "local-dev-token";

const sections = [
  { id: "overview", label: "Overview" },
  { id: "traffic", label: "Traffic" },
  { id: "gateway", label: "Gateway" },
  { id: "load", label: "Load Lab" },
  { id: "microservices", label: "Microservices" },
  { id: "commands", label: "Commands" },
];

const scenarios = [
  {
    title: "Health check",
    endpoint: "/health",
    teaches: "Confirms the upstream is alive and shows which backend instance answered.",
    run: () => http.get(API_ENDPOINTS.HEALTH),
  },
  {
    title: "Readiness check",
    endpoint: "/ready",
    teaches: "Use before sending traffic to a new backend instance.",
    run: () => http.get(API_ENDPOINTS.READY),
  },
  {
    title: "Metrics",
    endpoint: "/metrics",
    teaches: "Watch request counts, latency, route usage, and memory.",
    run: () => http.get(API_ENDPOINTS.METRICS),
  },
  {
    title: "Forwarded headers",
    endpoint: "/debug/headers",
    teaches: "Verify Host, X-Real-IP, X-Forwarded-For, and protocol from Nginx.",
    run: () => http.get(API_ENDPOINTS.HEADERS),
  },
  {
    title: "Cacheable products",
    endpoint: "/cache/products",
    teaches: "Use with proxy_cache and compare generatedAt values.",
    run: () => http.get(API_ENDPOINTS.CACHE_PRODUCTS),
  },
];

const syntheticControls = [
  {
    key: "slow",
    label: "Slow upstream",
    endpoint: "/slow?ms=",
    field: "delayMs",
    suffix: "ms",
    min: 0,
    max: 30000,
    help: "Tests proxy_read_timeout and slow upstream visibility.",
  },
  {
    key: "unstable",
    label: "Unstable upstream",
    endpoint: "/unstable?failRate=",
    field: "failRate",
    suffix: "rate",
    min: 0,
    max: 1,
    step: 0.1,
    help: "Generates random 500s for retry and error-log practice.",
  },
  {
    key: "status",
    label: "Status code",
    endpoint: "/status/",
    field: "statusCode",
    suffix: "code",
    min: 100,
    max: 599,
    help: "Tests error routing and client behavior for known statuses.",
  },
  {
    key: "payload",
    label: "Payload size",
    endpoint: "/payload?kb=",
    field: "payloadKb",
    suffix: "KB",
    min: 1,
    max: 1024,
    help: "Checks large response buffering and transfer timing.",
  },
  {
    key: "cpu",
    label: "CPU work",
    endpoint: "/cpu?ms=",
    field: "cpuMs",
    suffix: "ms",
    min: 10,
    max: 3000,
    help: "Creates CPU pressure for load-balancing and saturation tests.",
  },
];

function decodeJwtPayload(token) {
  try {
    const [, payload] = token.split(".");
    const normalizedPayload = payload.replace(/-/g, "+").replace(/_/g, "/");
    const paddedPayload = normalizedPayload.padEnd(Math.ceil(normalizedPayload.length / 4) * 4, "=");
    return JSON.parse(atob(paddedPayload));
  } catch {
    return null;
  }
}

function getInterestingHeaders(headers = {}) {
  const names = [
    "x-request-id",
    "x-upstream-addr",
    "x-upstream-status",
    "x-cache",
    "cache-control",
    "x-load-balancer",
  ];

  return names.reduce((acc, name) => {
    if (headers[name]) acc[name] = headers[name];
    return acc;
  }, {});
}

function App() {
  const [activeSection, setActiveSection] = useState("overview");
  const [busy, setBusy] = useState({});
  const [lastResult, setLastResult] = useState(null);
  const [items, setItems] = useState([]);
  const [newItem, setNewItem] = useState("");
  const [errorMessage, setErrorMessage] = useState("");
  const [delayMs, setDelayMs] = useState(1000);
  const [failRate, setFailRate] = useState(0.5);
  const [statusCode, setStatusCode] = useState(500);
  const [payloadKb, setPayloadKb] = useState(10);
  const [cpuMs, setCpuMs] = useState(100);
  const [searchTerm, setSearchTerm] = useState("");
  const [category, setCategory] = useState("");
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(5);
  const [adminToken, setAdminToken] = useState(defaultAdminToken);
  const [idempotencyKey, setIdempotencyKey] = useState(`order-${Date.now()}`);
  const [requestId, setRequestId] = useState(`web-${Date.now()}`);
  const [events, setEvents] = useState([]);
  const [balanceSamples, setBalanceSamples] = useState([]);

  const [msToken, setMsToken] = useState(localStorage.getItem("ms_token") || "");
  const [msUserId, setMsUserId] = useState(() => decodeJwtPayload(localStorage.getItem("ms_token") || "")?.id || "");
  const [msAuthForm, setMsAuthForm] = useState({ email: "test@example.com", password: "password123" });
  const [msProfileForm, setMsProfileForm] = useState({ name: "Demo User", age: 28, bio: "Learning Nginx microservices routing" });
  const [msProfile, setMsProfile] = useState(null);
  const [msProducts, setMsProducts] = useState([]);
  const [msNewProduct, setMsNewProduct] = useState({ name: "", description: "" });

  const appName = import.meta.env.VITE_APP_NAME || "Nginx Learning Lab";
  const appVersion = import.meta.env.VITE_APP_VERSION || "dev";
  const syntheticValues = { delayMs, failRate, statusCode, payloadKb, cpuMs };

  const apiMode = useMemo(() => (
    API_CONFIG.HOST ? `API host: ${API_CONFIG.HOST}` : "same-domain proxy"
  ), []);

  const authHeaders = useMemo(() => (
    msToken ? { Authorization: `Bearer ${msToken}` } : {}
  ), [msToken]);

  const setBusyState = (key, value) => {
    setBusy(current => ({ ...current, [key]: value }));
  };

  const capture = async (request) => {
    const started = performance.now();

    try {
      const response = await request();

      return {
        ok: response.status < 400,
        status: response.status,
        durationMs: Math.round(performance.now() - started),
        data: response.data,
        headers: getInterestingHeaders(response.headers),
      };
    } catch (error) {
      return {
        ok: false,
        status: error.response?.status || "network",
        durationMs: Math.round(performance.now() - started),
        data: error.response?.data || { message: error.message },
        headers: getInterestingHeaders(error.response?.headers),
      };
    }
  };

  const runTask = async (key, label, request, afterSuccess) => {
    setBusyState(key, true);
    const result = await capture(request);
    setLastResult({ label, result });
    setBusyState(key, false);

    if (result.ok && afterSuccess) {
      afterSuccess(result);
    }

    return result;
  };

  const fetchItems = async () => {
    setErrorMessage("");
    await runTask("items-refresh", "Fetch Items", () => http.get(API_ENDPOINTS.GET_ALL_ITEMS), (result) => {
      setItems(Array.isArray(result.data) ? result.data : result.data.data || []);
    });
  };

  const addItem = async () => {
    if (!newItem.trim()) return;

    const result = await runTask("items-add", "Add Item", () => http.post(API_ENDPOINTS.CREATE_ITEM, { name: newItem.trim() }));

    if (!result.ok) {
      setErrorMessage(`Failed to add item: ${result.data.message || result.status}`);
      return;
    }

    setNewItem("");
    fetchItems();
  };

  const deleteItem = async (id) => {
    const result = await runTask(`items-delete-${id}`, "Delete Item", () => http.delete(API_ENDPOINTS.DELETE_ITEM(id)));

    if (!result.ok) {
      setErrorMessage(`Failed to delete item: ${result.data.message || result.status}`);
      return;
    }

    fetchItems();
  };

  const runLoadBalanceCheck = async () => {
    setBusyState("balance", true);
    const samples = [];

    for (let index = 0; index < 6; index += 1) {
      const result = await capture(() => http.get(API_ENDPOINTS.HEALTH));
      samples.push({
        attempt: index + 1,
        status: result.status,
        instanceId: result.data?.instanceId || "unknown",
        upstream: result.headers["x-upstream-addr"] || "not exposed",
        durationMs: result.durationMs,
      });
    }

    setBalanceSamples(samples);
    setLastResult({
      label: "Load Balancer Rotation",
      result: {
        ok: samples.every(sample => sample.status === 200),
        status: "multi",
        durationMs: samples.reduce((total, sample) => total + sample.durationMs, 0),
        data: samples,
        headers: {},
      },
    });
    setBusyState("balance", false);
  };

  const runSynthetic = (control) => {
    const value = syntheticValues[control.field];
    const request = {
      slow: () => http.get(API_ENDPOINTS.SLOW(delayMs)),
      unstable: () => http.get(API_ENDPOINTS.UNSTABLE(failRate)),
      status: () => http.get(API_ENDPOINTS.STATUS(statusCode)),
      payload: () => http.get(API_ENDPOINTS.PAYLOAD(payloadKb)),
      cpu: () => http.get(API_ENDPOINTS.CPU(cpuMs)),
    }[control.key];

    runTask(control.key, `${control.label}: ${value}${control.suffix}`, request);
  };

  const runSearch = () => {
    runTask("search", "Paginated Items", () => http.get(API_ENDPOINTS.PAGINATED_ITEMS(page, limit, searchTerm, category)));
  };

  const seedData = () => {
    runTask("seed", "Bulk Seed", () => http.post(API_ENDPOINTS.BULK_ITEMS, { count: 100 }), () => fetchItems());
  };

  const resetData = () => {
    runTask("admin-reset", "Admin Reset", () => http.post(API_ENDPOINTS.ADMIN_RESET, {}, { headers: { "x-admin-token": adminToken } }), () => fetchItems());
  };

  const createOrder = () => {
    runTask("order", "Create Order", () => http.post(
      API_ENDPOINTS.ORDERS,
      { itemName: "Practice order", quantity: 1 },
      { headers: { "idempotency-key": idempotencyKey } }
    ));
  };

  const sendRequestId = () => {
    runTask("request-id", "Request Correlation", () => http.get(API_ENDPOINTS.REQUEST_ID, { headers: { "x-request-id": requestId } }));
  };

  const startEventStream = () => {
    setEvents([]);
    setBusyState("events", true);

    const source = new EventSource(API_ENDPOINTS.EVENTS(8, 750));

    source.addEventListener("metric", (event) => {
      setEvents((current) => [JSON.parse(event.data), ...current].slice(0, 8));
    });

    source.onerror = () => {
      source.close();
      setBusyState("events", false);
    };
  };

  const handleRegister = async () => {
    const register = await runTask("ms-register", "Register User", () => http.post(API_ENDPOINTS.GATEWAY_AUTH_REGISTER, msAuthForm));

    if (register.ok && register.data?._id) {
      setMsUserId(register.data._id);
      const login = await runTask("ms-login", "Login Registered User", () => http.post(API_ENDPOINTS.GATEWAY_AUTH_LOGIN, msAuthForm));

      if (login.ok && login.data.token) {
        const payload = decodeJwtPayload(login.data.token);
        setMsToken(login.data.token);
        setMsUserId(payload?.id || register.data._id);
        localStorage.setItem("ms_token", login.data.token);
      }
    }
  };

  const handleLogin = async () => {
    const result = await runTask("ms-login", "Login User", () => http.post(API_ENDPOINTS.GATEWAY_AUTH_LOGIN, msAuthForm));

    if (result.ok && result.data.token) {
      const payload = decodeJwtPayload(result.data.token);
      setMsToken(result.data.token);
      setMsUserId(payload?.id || "");
      localStorage.setItem("ms_token", result.data.token);
    }
  };

  const handleLogout = () => {
    setMsToken("");
    setMsUserId("");
    setMsProfile(null);
    setMsProducts([]);
    setLastResult(null);
    localStorage.removeItem("ms_token");
  };

  const saveMsProfile = () => {
    if (!msUserId) return;

    runTask(
      "ms-profile-save",
      "Save User Profile",
      () => http.put(API_ENDPOINTS.GATEWAY_USER_PROFILE(msUserId), {
        name: msProfileForm.name,
        age: Number(msProfileForm.age) || 0,
        bio: msProfileForm.bio,
      }, { headers: authHeaders }),
      result => setMsProfile(result.data)
    );
  };

  const fetchMsProfile = () => {
    if (!msUserId) return;

    runTask(
      "ms-profile-get",
      "Fetch User Profile",
      () => http.get(API_ENDPOINTS.GATEWAY_USER_PROFILE(msUserId), { headers: authHeaders }),
      result => setMsProfile(result.data)
    );
  };

  const addMsProduct = async () => {
    if (!msNewProduct.name.trim()) return;

    const result = await runTask(
      "ms-product-add",
      "Add Product",
      () => http.post(API_ENDPOINTS.GATEWAY_PRODUCTS, msNewProduct, { headers: authHeaders })
    );

    if (result.ok) {
      setMsNewProduct({ name: "", description: "" });
      fetchMsProducts();
    }
  };

  const fetchMsProducts = () => {
    runTask(
      "ms-product-get",
      "Fetch Products",
      () => http.get(API_ENDPOINTS.GATEWAY_PRODUCTS, { headers: authHeaders }),
      result => setMsProducts(result.data)
    );
  };

  const deleteMsProduct = async (id) => {
    const result = await runTask(
      `ms-product-delete-${id}`,
      "Delete Product",
      () => http.delete(API_ENDPOINTS.GATEWAY_PRODUCT_BY_ID(id), { headers: authHeaders })
    );

    if (result.ok) {
      fetchMsProducts();
    }
  };

  useEffect(() => {
    fetchItems();
  }, []);

  return (
    <main className="lab-shell">
      <aside className="sidebar">
        <div className="brand-block">
          <span className="brand-mark">NX</span>
          <div>
            <p className="eyebrow">Nginx practice</p>
            <h1>{appName}</h1>
          </div>
        </div>

        <nav className="nav-list" aria-label="Lab sections">
          {sections.map(section => (
            <button
              key={section.id}
              className={activeSection === section.id ? "nav-item active" : "nav-item"}
              onClick={() => setActiveSection(section.id)}
            >
              {section.label}
            </button>
          ))}
        </nav>

        <div className="sidebar-card">
          <span className="status-dot" />
          <p>{apiMode}</p>
          <small>Version {appVersion}</small>
        </div>
      </aside>

      <section className="workspace">
        <header className="hero-panel">
          <div>
            <p className="eyebrow">Reverse proxy, gateway routing, caching, and load testing</p>
            <h2>Learn Nginx by pressing the buttons and watching the network.</h2>
          </div>
          <div className="hero-stats">
            <Metric label="Items" value={items.length} />
            <Metric label="JWT" value={msToken ? "ready" : "missing"} />
            <Metric label="Section" value={sections.find(section => section.id === activeSection)?.label} />
          </div>
        </header>

        {activeSection === "overview" && (
          <Section title="What To Try First" eyebrow="Learning path">
            <div className="learning-grid">
              <GuideStep number="1" title="Confirm proxy health" text="Run Health, Readiness, and Headers. In DevTools, compare Request URL, X-Request-ID, and forwarded headers." />
              <GuideStep number="2" title="Create real traffic" text="Add items, seed 100 records, and search. These requests prove Nginx routes normal API traffic correctly." />
              <GuideStep number="3" title="Stress the edge" text="Use slow, unstable, payload, and CPU endpoints. Then run Autocannon commands from the Commands tab." />
              <GuideStep number="4" title="Test service routing" text="Register, login, save a profile, and create products. Nginx routes paths while each service verifies JWT." />
            </div>
            <ResultPanel result={lastResult?.result} label={lastResult?.label} emptyText="Run any lab action and the latest request result appears here." />
          </Section>
        )}

        {activeSection === "traffic" && (
          <Section title="CRUD Traffic" eyebrow="Basic reverse proxy">
            <div className="split-grid">
              <div className="surface">
                <PanelHeader title="Items API" subtitle="Exercises /items through the same proxy path your frontend uses." />
                <div className="inline-form">
                  <input value={newItem} onChange={event => setNewItem(event.target.value)} onKeyDown={event => event.key === "Enter" && addItem()} placeholder="Add an item name" />
                  <LoadingButton loading={busy["items-add"]} onClick={addItem}>Add</LoadingButton>
                  <LoadingButton variant="secondary" loading={busy["items-refresh"]} onClick={fetchItems}>Refresh</LoadingButton>
                </div>
                {errorMessage && <p className="notice error">{errorMessage}</p>}
                <div className="item-list">
                  {items.map(item => (
                    <div className="item-row" key={item.id}>
                      <div>
                        <strong>{item.name}</strong>
                        <small>{item.category || "general"}</small>
                      </div>
                      <LoadingButton variant="secondary" loading={busy[`items-delete-${item.id}`]} onClick={() => deleteItem(item.id)}>Delete</LoadingButton>
                    </div>
                  ))}
                </div>
              </div>

              <div className="surface">
                <PanelHeader title="Advanced API Patterns" subtitle="Pagination, admin headers, idempotency, and request correlation." />
                <div className="card-grid two">
                  <ActionCard title="Search and pagination" text="/api/v1/items?page=1&limit=5">
                    <input value={searchTerm} onChange={event => setSearchTerm(event.target.value)} placeholder="Search item names" />
                    <input value={category} onChange={event => setCategory(event.target.value)} placeholder="Category filter" />
                    <div className="inline-form compact">
                      <input type="number" value={page} min="1" onChange={event => setPage(event.target.value)} />
                      <input type="number" value={limit} min="1" max="100" onChange={event => setLimit(event.target.value)} />
                      <LoadingButton loading={busy.search} onClick={runSearch}>Search</LoadingButton>
                    </div>
                  </ActionCard>
                  <ActionCard title="Seed records" text="Create data before load testing list endpoints.">
                    <LoadingButton loading={busy.seed} onClick={seedData}>Seed 100 Items</LoadingButton>
                  </ActionCard>
                  <ActionCard title="Protected admin route" text="Requires x-admin-token.">
                    <input value={adminToken} onChange={event => setAdminToken(event.target.value)} placeholder="x-admin-token" />
                    <LoadingButton loading={busy["admin-reset"]} onClick={resetData}>Reset Demo Data</LoadingButton>
                  </ActionCard>
                  <ActionCard title="Idempotent writes" text="Repeat the same key and the backend replays the first order.">
                    <input value={idempotencyKey} onChange={event => setIdempotencyKey(event.target.value)} placeholder="idempotency-key" />
                    <LoadingButton loading={busy.order} onClick={createOrder}>Create Order</LoadingButton>
                  </ActionCard>
                  <ActionCard title="Request correlation" text="Send x-request-id and find it in response headers and logs.">
                    <input value={requestId} onChange={event => setRequestId(event.target.value)} placeholder="x-request-id" />
                    <LoadingButton loading={busy["request-id"]} onClick={sendRequestId}>Send Request ID</LoadingButton>
                  </ActionCard>
                  <ActionCard title="Server-sent events" text="Tests streaming and proxy_buffering off.">
                    <LoadingButton loading={busy.events} onClick={startEventStream}>Start Stream</LoadingButton>
                  </ActionCard>
                </div>
              </div>
            </div>

            {events.length > 0 && (
              <div className="event-list">
                {events.map(event => (
                  <code key={`${event.requestId}-${event.sequence}`}>#{event.sequence} latency={event.averageLatencyMs}ms</code>
                ))}
              </div>
            )}

            <ResultPanel result={lastResult?.result} label={lastResult?.label} />
          </Section>
        )}

        {activeSection === "gateway" && (
          <Section title="Nginx Gateway Diagnostics" eyebrow="Headers, cache, routing">
            <div className="scenario-grid">
              {scenarios.map(scenario => (
                <button className="scenario-card" key={scenario.title} onClick={() => runTask(`scenario-${scenario.title}`, scenario.title, scenario.run)}>
                  <span>{scenario.endpoint}</span>
                  <strong>{scenario.title}</strong>
                  <small>{scenario.teaches}</small>
                  {busy[`scenario-${scenario.title}`] && <Loader label="Running" />}
                </button>
              ))}
            </div>

            <div className="surface">
              <PanelHeader title="Load-balancer rotation check" subtitle="Calls /health six times and shows which instance answered each request." />
              <LoadingButton loading={busy.balance} onClick={runLoadBalanceCheck}>Run Rotation Check</LoadingButton>
              {balanceSamples.length > 0 && (
                <div className="sample-grid">
                  {balanceSamples.map(sample => (
                    <div className="sample" key={sample.attempt}>
                      <small>Attempt {sample.attempt}</small>
                      <strong>{sample.instanceId}</strong>
                      <span>{sample.upstream}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <ResultPanel result={lastResult?.result} label={lastResult?.label} />
          </Section>
        )}

        {activeSection === "load" && (
          <Section title="Synthetic Load Lab" eyebrow="Timeouts, errors, payloads, CPU">
            <div className="card-grid five">
              {syntheticControls.map(control => (
                <ActionCard key={control.key} title={control.label} text={control.help}>
                  <div className="control-row">
                    <input
                      type="number"
                      min={control.min}
                      max={control.max}
                      step={control.step || 1}
                      value={syntheticValues[control.field]}
                      onChange={event => ({
                        delayMs: setDelayMs,
                        failRate: setFailRate,
                        statusCode: setStatusCode,
                        payloadKb: setPayloadKb,
                        cpuMs: setCpuMs,
                      }[control.field](event.target.value))}
                    />
                    <span>{control.suffix}</span>
                  </div>
                  <LoadingButton loading={busy[control.key]} onClick={() => runSynthetic(control)}>Run</LoadingButton>
                </ActionCard>
              ))}
            </div>
            <ResultPanel result={lastResult?.result} label={lastResult?.label} />
          </Section>
        )}

        {activeSection === "microservices" && (
          <Section title="Microservices Lab" eyebrow="Nginx path routing">
            <div className="card-grid three">
              <ActionCard title="Identity and gateway" text="/api/auth/* goes to auth-service. Registration logs in automatically.">
                <input value={msAuthForm.email} onChange={event => setMsAuthForm({ ...msAuthForm, email: event.target.value })} placeholder="Email" />
                <input type="password" value={msAuthForm.password} onChange={event => setMsAuthForm({ ...msAuthForm, password: event.target.value })} placeholder="Password" />
                <div className="button-row">
                  <LoadingButton loading={busy["ms-register"]} onClick={handleRegister}>Register</LoadingButton>
                  <LoadingButton loading={busy["ms-login"]} onClick={handleLogin}>Login</LoadingButton>
                  <LoadingButton variant="secondary" loading={busy["gateway-health"]} onClick={() => runTask("gateway-health", "Nginx Gateway Health", () => http.get(API_ENDPOINTS.GATEWAY_HEALTH))}>Gateway</LoadingButton>
                </div>
                {msToken && <LoadingButton variant="secondary" onClick={handleLogout}>Logout</LoadingButton>}
                {msUserId && <code>User ID: {msUserId}</code>}
              </ActionCard>

              <ActionCard title="User service" text="/api/users/:id goes to user-service and requires JWT.">
                <input value={msProfileForm.name} onChange={event => setMsProfileForm({ ...msProfileForm, name: event.target.value })} placeholder="Profile name" />
                <input type="number" min="0" value={msProfileForm.age} onChange={event => setMsProfileForm({ ...msProfileForm, age: event.target.value })} placeholder="Age" />
                <input value={msProfileForm.bio} onChange={event => setMsProfileForm({ ...msProfileForm, bio: event.target.value })} placeholder="Bio" />
                <div className="button-row">
                  <LoadingButton loading={busy["ms-profile-save"]} disabled={!msToken} onClick={saveMsProfile}>Save</LoadingButton>
                  <LoadingButton variant="secondary" loading={busy["ms-profile-get"]} disabled={!msToken} onClick={fetchMsProfile}>Get</LoadingButton>
                </div>
                {msProfile && <div className="mini-record"><strong>{msProfile.name}</strong><span>{msProfile.age} yrs</span></div>}
              </ActionCard>

              <ActionCard title="Product service" text="/api/products goes to product-service and requires JWT.">
                <input value={msNewProduct.name} onChange={event => setMsNewProduct({ ...msNewProduct, name: event.target.value })} placeholder="Product name" />
                <input value={msNewProduct.description} onChange={event => setMsNewProduct({ ...msNewProduct, description: event.target.value })} placeholder="Description" />
                <div className="button-row">
                  <LoadingButton loading={busy["ms-product-add"]} disabled={!msToken} onClick={addMsProduct}>Add</LoadingButton>
                  <LoadingButton variant="secondary" loading={busy["ms-product-get"]} disabled={!msToken} onClick={fetchMsProducts}>Get</LoadingButton>
                </div>
                <div className="item-list compact-list">
                  {msProducts.map(product => (
                    <div className="item-row" key={product._id}>
                      <div>
                        <strong>{product.name}</strong>
                        <small>{product.description || "No description"}</small>
                      </div>
                      <LoadingButton variant="secondary" loading={busy[`ms-product-delete-${product._id}`]} onClick={() => deleteMsProduct(product._id)}>Delete</LoadingButton>
                    </div>
                  ))}
                </div>
              </ActionCard>
            </div>
            <ResultPanel result={lastResult?.result} label={lastResult?.label} />
          </Section>
        )}

        {activeSection === "commands" && (
          <Section title="Commands To Try" eyebrow="Terminal practice">
            <div className="command-grid">
              <CommandBlock title="Backend direct" commands={[
                "curl -i http://localhost:5000/health",
                "curl -i http://localhost:5000/debug/headers",
                "autocannon -c 100 -d 20 http://localhost:5000/items",
              ]} />
              <CommandBlock title="Nginx routed" commands={[
                "curl -i https://api.myapp.com/health",
                "curl -i https://api.myapp.com/cache/products",
                "autocannon -c 100 -d 20 https://api.myapp.com/health",
              ]} />
              <CommandBlock title="Load balancing" commands={[
                "for i in 1 2 3 4 5 6; do curl -s http://localhost:8080/health; echo; done",
                "docker compose -f docker-compose.local-lb.yml up --build",
                "docker compose -f docker-compose.local-lb.yml down",
              ]} />
              <CommandBlock title="Microservices" commands={[
                "cd microservices-app && docker compose up --build",
                "curl -i https://api.myapp.com/gateway/health",
                "curl -i https://api.myapp.com/api/products",
              ]} />
            </div>
          </Section>
        )}
      </section>
    </main>
  );
}

function Section({ title, eyebrow, children }) {
  return (
    <section className="section-panel">
      <div className="section-heading">
        <p className="eyebrow">{eyebrow}</p>
        <h2>{title}</h2>
      </div>
      {children}
    </section>
  );
}

function PanelHeader({ title, subtitle }) {
  return (
    <div className="panel-header">
      <div>
        <h3>{title}</h3>
        <p>{subtitle}</p>
      </div>
    </div>
  );
}

function ActionCard({ title, text, children }) {
  return (
    <div className="action-card">
      <div>
        <h3>{title}</h3>
        <p>{text}</p>
      </div>
      <div className="stacked-form">{children}</div>
    </div>
  );
}

function GuideStep({ number, title, text }) {
  return (
    <div className="guide-step">
      <span>{number}</span>
      <h3>{title}</h3>
      <p>{text}</p>
    </div>
  );
}

function Metric({ label, value }) {
  return (
    <div className="metric">
      <span>{label}</span>
      <strong>{value}</strong>
    </div>
  );
}

function LoadingButton({ children, loading, variant = "primary", disabled, onClick }) {
  return (
    <button className={variant === "secondary" ? "button secondary" : "button"} disabled={loading || disabled} onClick={onClick}>
      {loading ? <Loader label="Working" /> : children}
    </button>
  );
}

function Loader({ label }) {
  return (
    <span className="loader-label">
      <span className="spinner" />
      {label}
    </span>
  );
}

function ResultPanel({ result, label, emptyText }) {
  if (!result) {
    return <div className="empty-result">{emptyText || "Run an action to inspect status, timing, headers, and response body."}</div>;
  }

  return (
    <div className={result.ok ? "result ok" : "result failed"}>
      <div className="result-meta">
        <strong>{label || "Latest Result"}</strong>
        <span>Status: {result.status}</span>
        <span>Duration: {result.durationMs}ms</span>
      </div>
      {Object.keys(result.headers || {}).length > 0 && (
        <div className="header-strip">
          {Object.entries(result.headers).map(([key, value]) => <code key={key}>{key}: {value}</code>)}
        </div>
      )}
      <pre>{JSON.stringify(result.data, null, 2)}</pre>
    </div>
  );
}

function CommandBlock({ title, commands }) {
  return (
    <div className="command-block">
      <h3>{title}</h3>
      <pre>{commands.join("\n")}</pre>
    </div>
  );
}

export default App;
