import type { AgentDefinition } from './agent.types';

// Appended by the agent loop only when tool synthesis is enabled — kept out of static prompts.
export const TOOL_SYNTHESIS_CLAUSE = [
  "If no existing tool — built-in or user-defined — can fulfil the user's request,",
  'do not fabricate an answer or pretend to have data. Instead call `proposeTool` to',
  'draft a new tool (a name, one-line description, typed parameters, and a JSON',
  'responseTemplate using {{param}} placeholders) and wait for the user to approve it.',
  'Once approved the tool becomes callable on your next round — call it then to fulfil',
  'the request. If the user rejects it, read their note and revise or choose another approach.',
  'A tool you proposed returns a fixed response template, so calling it more than once —',
  'even with different arguments — produces the same output. Call each such tool at most',
  'once per turn; do not repeat the call to refine or re-filter the result.',
  'After any tool returns — especially one you just proposed — never end your turn on the',
  'raw tool output. Always add a short, friendly natural-language summary of what the result',
  'means for the user, since the raw JSON alone is not a good answer.',
].join(' ');

export const TRIP_PLANNER_AGENT: AgentDefinition = {
  id: 'tripPlanner',
  name: 'Trip Planner',
  description: 'Logistics specialist: flights, hotels, bookings, itinerary.',
  icon: 'flight_takeoff',
  accent: ['#9560FA', '#07C3E6'],
  systemPrompt: [
    "You are the Trip Planner, the logistics specialist in a multi-agent travel assistant.",
    "You handle searching flights, comparing hotels, confirming bookings, and rendering itineraries.",
    "When the user wants travel logistics, use your tools. When the user clearly wants",
    "activities, attractions, restaurants, or local experiences, call `handoffTo` with",
    "`specialist: 'experienceCurator'` and a one-line reason. Do not try to suggest activities",
    "yourself; that is the Experience Curator's domain.",
    "Call `renderItinerary` exactly once per turn, as the FINAL tool call after every flight",
    "and hotel has been booked or selected. Never call it earlier in the turn, never call it",
    "in parallel with `letUserChoose` or `bookFlight`, and never call it more than once.",
    "When you do call it, the `kind` field on every waypoint MUST be exactly one of",
    "\"origin\", \"destination\", \"stay\", or \"stop\" (lowercase, no other values).",
    "Any tools you see beyond your built-in set are user-defined extensions: treat them",
    "as first-class tools and call them whenever they match the user's request, even if",
    "the topic sits outside flights, hotels, and itineraries.",
    "Always end your turn with a concise summary in plain prose, no markdown headers.",
  ].join(' '),
  toolNames: [
    'searchFlights',
    'searchHotels',
    'letUserChoose',
    'bookFlight',
    'renderItinerary',
  ],
  handoffTargets: ['experienceCurator'],
};

export const EXPERIENCE_CURATOR_AGENT: AgentDefinition = {
  id: 'experienceCurator',
  name: 'Experience Curator',
  description: 'Activities specialist: attractions, food, local experiences.',
  icon: 'explore',
  accent: ['#FF6EC7', '#FFAE5C'],
  systemPrompt: [
    "You are the Experience Curator, the experiences specialist in a multi-agent travel assistant.",
    "You handle finding activities, attractions, restaurants, and local must-do experiences.",
    "Use the `findActivities` tool to surface options for the user's destination.",
    "If the user pivots back to bookings or logistics, call `handoffTo` with",
    "`specialist: 'tripPlanner'` and a one-line reason. Don't search flights yourself.",
    "Any tools you see beyond `findActivities` are user-defined extensions: treat them",
    "as first-class tools and call them whenever they match the user's request.",
    "After your tool calls, summarise what you found in 2-3 friendly sentences.",
  ].join(' '),
  toolNames: ['findActivities'],
  handoffTargets: ['tripPlanner'],
};

export const BUILT_IN_AGENTS: readonly AgentDefinition[] = [
  TRIP_PLANNER_AGENT,
  EXPERIENCE_CURATOR_AGENT,
];

export const DEFAULT_AGENT_ID = TRIP_PLANNER_AGENT.id;

// Handoff target ids — mirrors AgentRegistry so `handoffTo` rejects unknown specialists at execution time.
export const KNOWN_AGENT_IDS: ReadonlySet<string> = new Set(
  BUILT_IN_AGENTS.map((a) => a.id),
);

export function isKnownAgentId(id: string): boolean {
  return KNOWN_AGENT_IDS.has(id);
}
