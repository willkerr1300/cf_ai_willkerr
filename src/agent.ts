import { AIChatAgent } from "agents/ai-chat-agent";
import { createWorkersAI } from "workers-ai-provider";
import { streamText, tool } from "ai";
import { z } from "zod";
import type { Env, AgentState } from "./types";

const SYSTEM_PROMPT = `You are a helpful AI research assistant running on Cloudflare's global network.

You can:
- Answer questions and have conversations
- Start deep research workflows on any topic (uses Cloudflare Workflows with automatic retries)
- Check the status of running research and retrieve completed reports
- Remember the user's name and past research topics across sessions

When a user asks you to research something, use the startResearch tool to kick off a background workflow.
After starting research, let the user know they can check back with "check my research".
When summarizing research results, highlight key findings clearly using markdown.

You have persistent memory — you remember the user's name and their full research history.`;

export class ResearchAgent extends AIChatAgent<Env, AgentState> {
  initialState: AgentState = {
    researchHistory: [],
  };

  async onChatMessage(onFinish: Parameters<AIChatAgent["onChatMessage"]>[0]) {
    const workersai = createWorkersAI({ binding: this.env.AI });

    const stream = streamText({
      model: workersai("@cf/meta/llama-3.3-70b-instruct-fp8-fast" as Parameters<ReturnType<typeof createWorkersAI>>[0]),
      system:
        SYSTEM_PROMPT +
        (this.state.userName
          ? `\n\nThe user's name is: ${this.state.userName}`
          : ""),
      messages: this.messages,
      tools: {
        rememberName: tool({
          description: "Remember the user's name for personalized responses",
          parameters: z.object({
            name: z.string().describe("The user's name"),
          }),
          execute: async ({ name }) => {
            await this.setState({ ...this.state, userName: name });
            return `Got it! I'll remember your name is ${name}.`;
          },
        }),

        startResearch: tool({
          description:
            "Start a multi-step research workflow on a topic. Runs in the background with automatic retries.",
          parameters: z.object({
            topic: z.string().describe("The topic to research in depth"),
          }),
          execute: async ({ topic }) => {
            const instance = await this.env.RESEARCH_WORKFLOW.create({
              params: { topic },
            });
            await this.setState({
              ...this.state,
              activeResearch: {
                instanceId: instance.id,
                topic,
                startedAt: new Date().toISOString(),
              },
            });
            return `Research workflow started for "${topic}" (ID: ${instance.id}). Running 3 steps: generating questions -> researching -> synthesizing a report. Check back in a moment!`;
          },
        }),

        checkResearch: tool({
          description:
            "Check the status of the active research workflow and retrieve results if complete",
          parameters: z.object({}),
          execute: async () => {
            const active = this.state.activeResearch;
            if (!active) {
              if (this.state.researchHistory.length > 0) {
                const last =
                  this.state.researchHistory[
                    this.state.researchHistory.length - 1
                  ];
                return `No active research. Last completed: "${last.topic}" on ${new Date(last.date).toLocaleDateString()}.`;
              }
              return "No research has been started yet. Ask me to research a topic!";
            }

            const instance = await this.env.RESEARCH_WORKFLOW.get(
              active.instanceId
            );
            const status = await instance.status();

            if (status.status === "complete") {
              const result = status.output as {
                report: string;
                topic: string;
                completedAt: string;
              };
              const newHistory = [
                ...this.state.researchHistory,
                {
                  topic: result.topic,
                  report: result.report,
                  date: result.completedAt,
                },
              ];
              await this.setState({
                ...this.state,
                activeResearch: undefined,
                researchHistory: newHistory,
              });
              return `Research complete!\n\n${result.report}`;
            }

            if (status.status === "errored") {
              await this.setState({ ...this.state, activeResearch: undefined });
              return `Research workflow encountered an error. Please try again.`;
            }

            return `Research on "${active.topic}" is still running (status: ${status.status}). Started at ${new Date(active.startedAt).toLocaleTimeString()}. Check back in a moment!`;
          },
        }),

        listResearchHistory: tool({
          description: "List all past research topics the user has explored",
          parameters: z.object({}),
          execute: async () => {
            if (this.state.researchHistory.length === 0) {
              return "No research history yet. Ask me to research a topic!";
            }
            return this.state.researchHistory
              .map(
                (r, i) =>
                  `${i + 1}. ${r.topic} (${new Date(r.date).toLocaleDateString()})`
              )
              .join("\n");
          },
        }),

        getResearchReport: tool({
          description: "Retrieve a full research report from history by topic",
          parameters: z.object({
            topic: z
              .string()
              .describe("Part of the topic name to look up in history"),
          }),
          execute: async ({ topic }) => {
            const match = this.state.researchHistory.find((r) =>
              r.topic.toLowerCase().includes(topic.toLowerCase())
            );
            if (!match) {
              const available = this.state.researchHistory
                .map((r) => r.topic)
                .join(", ");
              return `No research found matching "${topic}". Available: ${available || "none"}`;
            }
            return match.report;
          },
        }),
      },
      onFinish,
    });

    return stream.toDataStreamResponse();
  }
}
