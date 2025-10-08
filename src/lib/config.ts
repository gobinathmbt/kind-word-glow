// config.ts

type ServerEnv = "PROD" | "TEST" |"DEV" | "LOCAL";

const server: ServerEnv = "LOCAL";

// Frontend URL map
const FRONTEND_URLS: Record<ServerEnv, string> = {
  PROD: "https://dev.autoerp.io",
  DEV: "http://dev.autoerp.io",
  TEST: "http://test.autoerp.io",
  LOCAL: "http://localhost:8080",
};

// Backend URL map
const BACKEND_URLS: Record<ServerEnv, string> = {
  PROD: "https://dev-backend.autoerp.io",
  DEV: "https://dev-backend.autoerp.io",
  TEST: "https://test-backend.autoerp.io",
  LOCAL: "http://localhost:5000",
};

const URL: string = FRONTEND_URLS[server];
const BASE_URL: string = BACKEND_URLS[server];

// Socket configuration
export const SOCKET_CONFIG = {
  CHAT_NAMESPACE: '/chat',
  METADATA_NAMESPACE: '/metadata',
  HEALTH_CHECK_ENDPOINTS: {
    CHAT: '/api/socket_connection/v1/chat_connection/health',
    METADATA: '/api/socket_connection/v1/metadata_connection/health',
    STATUS: '/api/socket_connection/status'
  }
};

export { BASE_URL, URL };
