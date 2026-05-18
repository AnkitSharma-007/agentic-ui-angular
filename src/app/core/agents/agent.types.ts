export interface AgentDefinition {
  readonly id: string;
  readonly name: string;
  readonly description: string;
  readonly icon: string;
  readonly accent: readonly [string, string];
  readonly systemPrompt: string;
  readonly toolNames: readonly string[];
  readonly handoffTargets: readonly string[];
}
