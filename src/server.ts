import { routeAgentRequest } from "agents";
import type { Env } from "./types";

export { ResearchAgent } from "./agent";
export { ResearchWorkflow } from "./workflow";

export default {
  async fetch(
    request: Request,
    env: Env,
    ctx: ExecutionContext
  ): Promise<Response> {
    const url = new URL(request.url);

    // Route WebSocket + HTTP requests to agents
    if (url.pathname.startsWith("/agents/")) {
      const response = await routeAgentRequest(request, env);
      if (response) return response;
    }

    // Serve static frontend assets
    return env.ASSETS.fetch(request);
  },
} satisfies ExportedHandler<Env>;
