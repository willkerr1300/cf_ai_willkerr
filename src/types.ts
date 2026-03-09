export interface Env {
  AI: Ai;
  RESEARCH_AGENT: DurableObjectNamespace;
  RESEARCH_WORKFLOW: Workflow;
  ASSETS: Fetcher;
}

export interface AgentState {
  userName?: string;
  researchHistory: Array<{
    topic: string;
    report: string;
    date: string;
  }>;
  activeResearch?: {
    instanceId: string;
    topic: string;
    startedAt: string;
  };
}

export interface ResearchParams {
  topic: string;
}
