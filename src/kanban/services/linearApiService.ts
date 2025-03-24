/**
 * Linear API Service
 * 
 * This service handles all interactions with the Linear API using GraphQL.
 */

import { GraphQLClient } from 'graphql-request';
import { LinearIssue, LinearState, LinearTeam, LinearUser, LinearLabel, LinearProject } from '../../types/linear';

export class LinearApiService {
  private client: GraphQLClient;
  private LINEAR_API_URL = 'https://api.linear.app/graphql';

  constructor(apiKey: string) {
    if (!apiKey) {
      throw new Error('LINEAR_API_KEY is required');
    }

    this.client = new GraphQLClient(this.LINEAR_API_URL, {
      headers: {
        Authorization: apiKey,
      },
    });
  }

  /**
   * Test the API connection
   */
  async testConnection(): Promise<{ id: string; name: string; email: string }> {
    const query = `
      query {
        viewer {
          id
          name
          email
        }
      }
    `;

    const data: any = await this.client.request(query);
    return data.viewer;
  }

  /**
   * Get issues with filtering
   */
  async getIssues(params: {
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
    cursor?: string;
  }): Promise<{ issues: LinearIssue[]; hasNextPage: boolean; endCursor: string }> {
    const { teams, creators, assignees, projects, labels, states, priorities, startDate, endDate, limit = 100, cursor } = params;

    // Build filter variables
    const variables: any = {
      first: limit,
      filter: {},
      after: cursor,
    };

    if (teams && teams.length > 0) {
      if (teams.length === 1) {
        variables.filter.team = { id: { eq: teams[0] } };
      } else {
        variables.filter.team = { id: { in: teams } };
      }
    }

    if (creators && creators.length > 0) {
      if (creators.length === 1) {
        variables.filter.creator = { id: { eq: creators[0] } };
      } else {
        variables.filter.creator = { id: { in: creators } };
      }
    }

    if (assignees && assignees.length > 0) {
      if (assignees.length === 1) {
        variables.filter.assignee = { id: { eq: assignees[0] } };
      } else {
        variables.filter.assignee = { id: { in: assignees } };
      }
    }

    if (projects && projects.length > 0) {
      if (projects.length === 1) {
        variables.filter.project = { id: { eq: projects[0] } };
      } else {
        variables.filter.project = { id: { in: projects } };
      }
    }

    if (labels && labels.length > 0) {
      if (labels.length === 1) {
        variables.filter.labels = { id: { eq: labels[0] } };
      } else {
        variables.filter.labels = { id: { in: labels } };
      }
    }

    if (states && states.length > 0) {
      if (states.length === 1) {
        variables.filter.state = { id: { eq: states[0] } };
      } else {
        variables.filter.state = { id: { in: states } };
      }
    }

    if (priorities && priorities.length > 0) {
      if (priorities.length === 1) {
        variables.filter.priority = { eq: priorities[0] };
      } else {
        variables.filter.priority = { in: priorities };
      }
    }

    if (startDate) {
      if (!variables.filter.createdAt) variables.filter.createdAt = {};
      variables.filter.createdAt.gte = startDate;
    }

    if (endDate) {
      if (!variables.filter.createdAt) variables.filter.createdAt = {};
      variables.filter.createdAt.lte = endDate;
    }

    // Define query with variables
    const query = `
      query Issues($first: Int, $after: String, $filter: IssueFilter) {
        issues(first: $first, after: $after, filter: $filter) {
          nodes {
            id
            identifier
            title
            description
            priority
            createdAt
            updatedAt
            dueDate
            estimate
            cycle {
              id
              name
              startsAt
              endsAt
            }
            state {
              id
              name
              type
              color
            }
            team {
              id
              name
              key
            }
            creator {
              id
              name
              email
            }
            assignee {
              id
              name
              email
              avatarUrl
            }
            project {
              id
              name
              description
            }
            labels {
              nodes {
                id
                name
                color
              }
            }
            parent {
              id
              identifier
              title
              state {
                id
                name
                type
              }
              team {
                id
                name
                key
              }
            }
            children {
              nodes {
                id
                identifier
                title
                state {
                  id
                  name
                  type
                }
                team {
                  id
                  name
                  key
                }
              }
            }
            comments {
              nodes {
                id
                body
                createdAt
                user {
                  id
                  name
                }
              }
            }
            # Relationship fields
            blocks {
              nodes {
                id
                identifier
                title
                state {
                  id
                  name
                  type
                }
                team {
                  id
                  name
                  key
                }
              }
            }
            blockedBy {
              nodes {
                id
                identifier
                title
                state {
                  id
                  name
                  type
                }
                team {
                  id
                  name
                  key
                }
              }
            }
            relations {
              nodes {
                id
                type
                relatedIssue {
                  id
                  identifier
                  title
                  state {
                    id
                    name
                    type
                  }
                  team {
                    id
                    name
                    key
                  }
                }
              }
            }
          }
          pageInfo {
            hasNextPage
            endCursor
          }
        }
      }
    `;

    try {
      const data: any = await this.client.request(query, variables);
      
      return {
        issues: data.issues.nodes.map((issue: any) => {
          // Transform related issues into appropriate relationship arrays
          const blocking = issue.blocks?.nodes || [];
          const blockedBy = issue.blockedBy?.nodes || [];
          
          // Process general relations
          const relations = issue.relations?.nodes || [];
          const relatedTo = relations
            .filter((rel: any) => rel.type === 'relates_to')
            .map((rel: any) => rel.relatedIssue);

          return {
            ...issue,
            labels: issue.labels.nodes,
            children: issue.children.nodes,
            comments: issue.comments.nodes,
            blocking,
            blockedBy,
            relatedTo,
          };
        }),
        hasNextPage: data.issues.pageInfo.hasNextPage,
        endCursor: data.issues.pageInfo.endCursor,
      };
    } catch (error) {
      console.error('Error fetching issues from Linear:', error);
      throw error;
    }
  }

  /**
   * Get all teams
   */
  async getTeams(): Promise<LinearTeam[]> {
    const query = `
      query GetTeams {
        teams(first: 100) {
          nodes {
            id
            name
            key
            description
            color
          }
        }
      }
    `;

    try {
      const data: any = await this.client.request(query);
      return data.teams.nodes;
    } catch (error) {
      console.error('Error fetching teams from Linear:', error);
      throw error;
    }
  }

  /**
   * Get workflow states
   */
  async getWorkflowStates(teamId?: string): Promise<LinearState[]> {
    const query = `
      query GetWorkflowStates($filter: WorkflowStateFilter) {
        workflowStates(first: 100, filter: $filter) {
          nodes {
            id
            name
            color
            type
            position
            team {
              id
              name
              key
            }
          }
        }
      }
    `;

    const variables: any = teamId ? { filter: { team: { id: { eq: teamId } } } } : { filter: {} };

    try {
      const data: any = await this.client.request(query, variables);
      return data.workflowStates.nodes;
    } catch (error) {
      console.error('Error fetching workflow states from Linear:', error);
      throw error;
    }
  }

  /**
   * Get all users
   */
  async getUsers(): Promise<LinearUser[]> {
    const query = `
      query GetUsers {
        users(first: 100) {
          nodes {
            id
            name
            email
            avatarUrl
            active
          }
        }
      }
    `;

    try {
      const data: any = await this.client.request(query);
      return data.users.nodes;
    } catch (error) {
      console.error('Error fetching users from Linear:', error);
      throw error;
    }
  }

  /**
   * Get all labels
   */
  async getLabels(): Promise<LinearLabel[]> {
    const query = `
      query GetLabels {
        issueLabels(first: 250) {
          nodes {
            id
            name
            color
            createdAt
            team {
              id
              name
              key
            }
          }
        }
      }
    `;

    try {
      const data: any = await this.client.request(query);
      return data.issueLabels.nodes;
    } catch (error) {
      console.error('Error fetching labels from Linear:', error);
      throw error;
    }
  }

  /**
   * Get team labels
   */
  async getTeamLabels(teamId: string): Promise<LinearLabel[]> {
    const query = `
      query GetTeamLabels($teamId: ID!) {
        issueLabels(filter: { team: { id: { eq: $teamId } } }, first: 250) {
          nodes {
            id
            name
            color
            createdAt
            team {
              id
              name
              key
            }
          }
        }
      }
    `;

    try {
      const data: any = await this.client.request(query, { teamId });
      return data.issueLabels.nodes;
    } catch (error) {
      console.error('Error fetching team labels from Linear:', error);
      throw error;
    }
  }

  /**
   * Get all projects
   */
  async getProjects(): Promise<LinearProject[]> {
    const query = `
      query GetProjects {
        projects(first: 100) {
          nodes {
            id
            name
            description
            state
            startDate
            targetDate
            teams {
              nodes {
                id
                name
                key
              }
            }
          }
        }
      }
    `;

    try {
      const data: any = await this.client.request(query);
      return data.projects.nodes.map((project: any) => ({
        ...project,
        teams: project.teams.nodes,
      }));
    } catch (error) {
      console.error('Error fetching projects from Linear:', error);
      throw error;
    }
  }

  /**
   * Create a new issue
   */
  async createIssue(params: {
    teamId: string;
    title: string;
    description?: string;
    stateId?: string;
    assigneeId?: string;
    priority?: number;
    labelIds?: string[];
    projectId?: string;
  }): Promise<{ success: boolean; issue: LinearIssue }> {
    const { teamId, title, description, stateId, assigneeId, priority, labelIds, projectId } = params;

    const variables: any = {
      input: {
        teamId,
        title,
      },
    };

    if (description) variables.input.description = description;
    if (stateId) variables.input.stateId = stateId;
    if (assigneeId) variables.input.assigneeId = assigneeId;
    if (priority !== undefined) variables.input.priority = priority;
    if (labelIds && labelIds.length > 0) variables.input.labelIds = labelIds;
    if (projectId) variables.input.projectId = projectId;

    const query = `
      mutation CreateIssue($input: IssueCreateInput!) {
        issueCreate(input: $input) {
          success
          issue {
            id
            identifier
            title
            description
            priority
            createdAt
            updatedAt
            state {
              id
              name
              type
            }
            team {
              id
              name
              key
            }
            creator {
              id
              name
              email
            }
            assignee {
              id
              name
              email
            }
            labels {
              nodes {
                id
                name
                color
              }
            }
          }
        }
      }
    `;

    try {
      const data: any = await this.client.request(query, variables);
      return {
        success: data.issueCreate.success,
        issue: {
          ...data.issueCreate.issue,
          labels: data.issueCreate.issue.labels.nodes,
        },
      };
    } catch (error) {
      console.error('Error creating issue in Linear:', error);
      throw error;
    }
  }

  /**
   * Update an issue
   */
  async updateIssue(params: {
    id: string;
    title?: string;
    description?: string;
    stateId?: string;
    assigneeId?: string | null;
    priority?: number;
    labelIds?: string[];
    projectId?: string;
  }): Promise<{ success: boolean; issue: LinearIssue }> {
    const { id, title, description, stateId, assigneeId, priority, labelIds, projectId } = params;

    const variables: any = {
      id,
      input: {},
    };

    if (title) variables.input.title = title;
    if (description !== undefined) variables.input.description = description;
    if (stateId) variables.input.stateId = stateId;
    if (assigneeId !== undefined) variables.input.assigneeId = assigneeId;
    if (priority !== undefined) variables.input.priority = priority;
    if (labelIds) variables.input.labelIds = labelIds;
    if (projectId !== undefined) variables.input.projectId = projectId;

    const query = `
      mutation UpdateIssue($id: ID!, $input: IssueUpdateInput!) {
        issueUpdate(id: $id, input: $input) {
          success
          issue {
            id
            identifier
            title
            description
            priority
            createdAt
            updatedAt
            state {
              id
              name
              type
            }
            team {
              id
              name
              key
            }
            creator {
              id
              name
              email
            }
            assignee {
              id
              name
              email
            }
            labels {
              nodes {
                id
                name
                color
              }
            }
          }
        }
      }
    `;

    try {
      const data: any = await this.client.request(query, variables);
      return {
        success: data.issueUpdate.success,
        issue: {
          ...data.issueUpdate.issue,
          labels: data.issueUpdate.issue.labels.nodes,
        },
      };
    } catch (error) {
      console.error('Error updating issue in Linear:', error);
      throw error;
    }
  }

  /**
   * Get cycles for a team
   */
  async getCycles(teamId: string): Promise<any[]> {
    const query = `
      query GetCycles($teamId: ID!) {
        cycles(filter: { team: { id: { eq: $teamId } } }, first: 10) {
          nodes {
            id
            name
            number
            startsAt
            endsAt
            completedAt
            progress
            issues {
              nodes {
                id
                identifier
                title
              }
            }
          }
        }
      }
    `;

    try {
      const data: any = await this.client.request(query, { teamId });
      return data.cycles.nodes.map((cycle: any) => ({
        ...cycle,
        issues: cycle.issues.nodes,
      }));
    } catch (error) {
      console.error('Error fetching cycles from Linear:', error);
      throw error;
    }
  }

  /**
   * Create a relationship between two issues
   */
  async createIssueRelation(params: {
    issueId: string;
    relatedIssueId: string;
    type: string;
  }): Promise<{ success: boolean }> {
    const { issueId, relatedIssueId, type } = params;

    const mutation = `
      mutation CreateIssueRelation($input: IssueRelationCreateInput!) {
        issueRelationCreate(input: $input) {
          success
          issueRelation {
            id
            type
          }
        }
      }
    `;

    try {
      const variables = {
        input: {
          issueId,
          relatedIssueId,
          type,
        },
      };

      const data: any = await this.client.request(mutation, variables);
      return {
        success: data.issueRelationCreate.success,
      };
    } catch (error) {
      console.error('Error creating issue relation:', error);
      throw error;
    }
  }

  /**
   * Delete a relationship between two issues
   */
  async deleteIssueRelation(relationId: string): Promise<{ success: boolean }> {
    const mutation = `
      mutation DeleteIssueRelation($id: ID!) {
        issueRelationDelete(id: $id) {
          success
        }
      }
    `;

    try {
      const variables = {
        id: relationId,
      };

      const data: any = await this.client.request(mutation, variables);
      return {
        success: data.issueRelationDelete.success,
      };
    } catch (error) {
      console.error('Error deleting issue relation:', error);
      throw error;
    }
  }

  /**
   * Get all issue relations for a specific issue
   */
  async getIssueRelations(issueId: string): Promise<any[]> {
    const query = `
      query GetIssueRelations($issueId: ID!) {
        issue(id: $issueId) {
          id
          identifier
          title
          parent {
            id
            identifier
            title
            state {
              id
              name
              type
            }
          }
          children {
            nodes {
              id
              identifier
              title
              state {
                id
                name
                type
              }
            }
          }
          blocks {
            nodes {
              id
              identifier
              title
              state {
                id
                name
                type
              }
            }
          }
          blockedBy {
            nodes {
              id
              identifier
              title
              state {
                id
                name
                type
              }
            }
          }
          relations {
            nodes {
              id
              type
              relatedIssue {
                id
                identifier
                title
                state {
                  id
                  name
                  type
                }
              }
            }
          }
        }
      }
    `;

    try {
      const data: any = await this.client.request(query, { issueId });
      const issue = data.issue;
      
      // Format all relations in a standardized way
      const relations = [];
      
      // Add parent if exists
      if (issue.parent) {
        relations.push({
          type: 'parent',
          issue: issue.parent,
          relationId: null // Parent/child relationships don't have relation IDs
        });
      }
      
      // Add children
      issue.children.nodes.forEach((child: any) => {
        relations.push({
          type: 'child',
          issue: child,
          relationId: null
        });
      });
      
      // Add blocked by issues
      issue.blockedBy.nodes.forEach((blocker: any) => {
        relations.push({
          type: 'blocked_by',
          issue: blocker,
          relationId: null
        });
      });
      
      // Add blocking issues
      issue.blocks.nodes.forEach((blocking: any) => {
        relations.push({
          type: 'blocks',
          issue: blocking,
          relationId: null
        });
      });
      
      // Add other relations
      issue.relations.nodes.forEach((relation: any) => {
        relations.push({
          type: relation.type,
          issue: relation.relatedIssue,
          relationId: relation.id
        });
      });
      
      return relations;
    } catch (error) {
      console.error('Error fetching issue relations:', error);
      throw error;
    }
  }

  /**
   * Set parent-child relationship between issues
   */
  async setParentIssue(params: {
    issueId: string;
    parentId: string | null;
  }): Promise<{ success: boolean }> {
    const { issueId, parentId } = params;

    const mutation = `
      mutation SetParentIssue($id: ID!, $parentId: ID) {
        issueUpdate(id: $id, input: { parentId: $parentId }) {
          success
          issue {
            id
          }
        }
      }
    `;

    try {
      const variables = {
        id: issueId,
        parentId: parentId || null,
      };

      const data: any = await this.client.request(mutation, variables);
      return {
        success: data.issueUpdate.success,
      };
    } catch (error) {
      console.error('Error setting parent issue:', error);
      throw error;
    }
  }
}