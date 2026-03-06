const BASE_URL = process.env.REACT_APP_API_BASE_URL || "http://localhost:5000";

const toQueryString = (params = {}) => {
  const entries = Object.entries(params).filter(([, value]) => value !== undefined && value !== null && value !== "");
  if (!entries.length) return "";
  return `?${new URLSearchParams(entries).toString()}`;
};

const parseResponse = async (response) => {
  const contentType = response.headers.get("content-type") || "";
  const isJson = contentType.includes("application/json");
  const data = isJson ? await response.json() : await response.text();

  if (!response.ok) {
    const error = new Error("Request failed");
    error.response = { status: response.status, data };
    throw error;
  }

  return { data };
};

const request = async (method, path, body, config = {}) => {
  const url = `${BASE_URL}${path}${toQueryString(config.params)}`;
  const response = await fetch(url, {
    method,
    headers: {
      "Content-Type": "application/json",
      ...(config.headers || {}),
    },
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });

  return parseResponse(response);
};

const api = {
  get: (path, config) => request("GET", path, undefined, config),
  post: (path, body, config) => request("POST", path, body, config),
  patch: (path, body, config) => request("PATCH", path, body, config),
  delete: (path, config) => request("DELETE", path, undefined, config),
};

export default api;
