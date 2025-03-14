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
}