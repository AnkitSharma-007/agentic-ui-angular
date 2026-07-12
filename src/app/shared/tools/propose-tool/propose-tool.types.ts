import type { CustomToolParameter } from '../../../core/custom-tools/custom-tool.types';

// Agent-proposed tool draft — a `CustomToolSpec` minus id/timestamps filled in at registration.
export interface ProposeToolDraft {
  readonly name: string;
  readonly description: string;
  readonly parameters: readonly CustomToolParameter[];
  readonly responseTemplate: string;
}

export type ProposeToolArgs = ProposeToolDraft;

// Post-decision payload via interrupt `select` as `{ selected: ProposeToolSelection }` — loop short-circuits before the defensive executor runs.
export interface ProposeToolSelection {
  readonly registered: boolean;
  readonly name: string;
  readonly description: string;
}

export interface ProposeToolResult {
  readonly selected: ProposeToolSelection;
}
