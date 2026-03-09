import {
  WorkflowEntrypoint,
  WorkflowStep,
  WorkflowEvent,
} from "cloudflare:workers";
import type { Env, ResearchParams } from "./types";

export class ResearchWorkflow extends WorkflowEntrypoint<Env, ResearchParams> {
  async run(event: WorkflowEvent<ResearchParams>, step: WorkflowStep) {
    const { topic } = event.payload;

    // Step 1: Generate focused research questions
    const questions = await step.do("generate-questions", async () => {
      const response = await this.env.AI.run(
        "@cf/meta/llama-3.3-70b-instruct-fp8-fast" as Parameters<typeof this.env.AI.run>[0],
        {
          messages: [
            {
              role: "system",
              content:
                "You are a research planner. Given a topic, generate exactly 3 specific, focused research questions that would give a comprehensive overview. Return only the numbered questions, nothing else.",
            },
            { role: "user", content: `Topic: ${topic}` },
          ],
          max_tokens: 300,
        }
      );
      return (response as { response: string }).response;
    });

    // Step 2: Answer each question (with automatic retry on failure)
    const answers = await step.do(
      "research-questions",
      { retries: { limit: 3, delay: "1 second" } },
      async () => {
        const response = await this.env.AI.run(
          "@cf/meta/llama-3.3-70b-instruct-fp8-fast" as Parameters<typeof this.env.AI.run>[0],
          {
            messages: [
              {
                role: "system",
                content:
                  "You are an expert researcher. Answer each question thoroughly with facts and key insights. Be concise but comprehensive.",
              },
              {
                role: "user",
                content: `Topic: ${topic}

Please answer these research questions:
${questions}`,
              },
            ],
            max_tokens: 1200,
          }
        );
        return (response as { response: string }).response;
      }
    );

    // Step 3: Synthesize into a structured report
    const report = await step.do("synthesize-report", async () => {
      const response = await this.env.AI.run(
        "@cf/meta/llama-3.3-70b-instruct-fp8-fast" as Parameters<typeof this.env.AI.run>[0],
        {
          messages: [
            {
              role: "system",
              content:
                "You are a technical writer. Create a well-structured research report with: 1) Executive Summary, 2) Key Findings, 3) Conclusion. Use markdown formatting.",
            },
            {
              role: "user",
              content: `Topic: ${topic}

Research Q&A:
${answers}`,
            },
          ],
          max_tokens: 800,
        }
      );
      return (response as { response: string }).response;
    });

    return { topic, report, completedAt: new Date().toISOString() };
  }
}
