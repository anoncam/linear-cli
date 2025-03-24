export interface LinearIssue {
  id: string;
  identifier: string;
  title: string;
  description: string | null;
  priority: number;
  state: LinearState;
  team: LinearTeam;
  creator: LinearUser;
  assignee: LinearUser | null;
  project: LinearProject | null;
  labels: LinearLabel[];
  createdAt: string;
  updatedAt: string;
  parent: LinearIssueRelation | null;
  children: LinearIssueRelation[];
  blockedBy: LinearIssueRelation[];
  blocking: LinearIssueRelation[];
  relatedTo: LinearIssueRelation[];
  comments?: Array<{
    id: string;
    body: string;
    createdAt: string;
    user?: {
      id: string;
      name: string;
    };
  }>;
}

export interface LinearState {
  id: string;
  name: string;
  type: string;
}

export interface LinearTeam {
  id: string;
  name: string;
  key: string;
}

export interface LinearUser {
  id: string;
  name: string;
  email: string;
}

export interface LinearProject {
  id: string;
  name: string;
  description: string | null;
}

export interface LinearLabel {
  id: string;
  name: string;
  color: string;
}

export interface LinearIssueRelation {
  id: string;
  identifier: string;
  title: string;
  state?: LinearState;
  team?: LinearTeam;
}

export interface IssueRelationInput {
  issueId: string;
  relationIssueId: string;
  relationType: IssueRelationType;
}

export enum IssueRelationType {
  BLOCKS = "blocks",
  BLOCKED_BY = "blocked_by",
  RELATED = "related",
  DUPLICATE = "duplicate",
  PARENT = "parent",
  CHILD = "child"
}

export interface IssueQueryParams {
  teams?: string[];
  creators?: string[];
  assignees?: string[];
  projects?: string[];
  labels?: string[];
  states?: string[];
  priorities?: number[];
  startDate?: string;
  endDate?: string;
  limit?: number;
  offset?: number;
  includeRelationships?: boolean;
}