import { GraphQLClient } from 'graphql-request';
import { IssueQueryParams, LinearIssue } from '../types/linear';
import dotenv from 'dotenv';

dotenv.config();

const LINEAR_API_KEY = process.env.LINEAR_API_KEY || '';
const LINEAR_API_URL = 'https://api.linear.app/graphql';

if (!LINEAR_API_KEY) {
  throw new Error('LINEAR_API_KEY environment variable is required');
}

class LinearClient {
  private client: GraphQLClient;

  constructor() {
    // Linear API requires API key as a plain token (without Bearer)
    this.client = new GraphQLClient(LINEAR_API_URL, {
      headers: {
        Authorization: LINEAR_API_KEY,
      },
    });
    
    // Test API connection on startup
    console.log('Initializing Linear API client...');
  }

  async getIssues(params: IssueQueryParams): Promise<LinearIssue[]> {
    const { teams, creators, assignees, projects, labels, states, priorities, startDate, endDate, limit = 100, offset = 0 } = params;

    try {
      // Build filter variables
      const variables: any = {
        first: limit,
        filter: {}
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
      // Use a simpler query structure based on Linear's API spec
      const query = `
        query Issues($first: Int, $filter: IssueFilter) {
          issues(first: $first, filter: $filter) {
            nodes {
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
            }
            pageInfo {
              hasNextPage
              endCursor
            }
          }
        }
      `;

      console.log('Executing Linear GraphQL query with variables:', JSON.stringify(variables, null, 2));
      
      // Let's try a simpler query first to validate the connection
      const simpleQuery = `
        query {
          viewer {
            id
            name
            email
          }
        }
      `;
      
      try {
        // Test authentication with a simple query
        const authTest = await this.client.request(simpleQuery) as any;
        console.log('Authentication successful, user:', authTest.viewer.name);
      } catch (authError) {
        console.error('Authentication failed:', authError);
        throw new Error('Failed to authenticate with Linear API. Check your API key.');
      }
      
      // Now try our actual query
      try {
        const data: any = await this.client.request(query, variables);
        return data.issues.nodes.map((issue: any) => ({
          ...issue,
          labels: issue.labels.nodes
        }));
      } catch (queryError: any) {
        console.error('Query error:', queryError.message);
        
        // Try a more basic query
        const basicQuery = `
          query BasicIssues($teamId: ID!) {
            team(id: $teamId) {
              issues(first: 10) {
                nodes {
                  id
                  title
                }
              }
            }
          }
        `;
        
        const basicVars = { teamId: teams?.[0] || "" };
        try {
          console.log('Trying basic query with:', basicVars);
          const basicData = await this.client.request(basicQuery, basicVars);
          console.log('Basic query succeeded with:', basicData);
          return [];
        } catch (basicError) {
          console.error('Even basic query failed:', basicError);
          throw queryError;
        }
      }
    } catch (error) {
      console.error('Error fetching issues from Linear:', error);
      throw error;
    }
  }

  async getTeams() {
    const query = `
      query GetTeams {
        teams(first: 100) {
          nodes {
            id
            name
            key
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

  async getProjects() {
    const query = `
      query GetProjects {
        projects {
          nodes {
            id
            name
            description
          }
        }
      }
    `;

    try {
      const data: any = await this.client.request(query);
      return data.projects.nodes;
    } catch (error) {
      console.error('Error fetching projects from Linear:', error);
      throw error;
    }
  }

  async getUsers() {
    const query = `
      query GetUsers {
        users {
          nodes {
            id
            name
            email
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

  async getLabels() {
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
  
  async getTeamLabels(teamId: string) {
    // Since the team.labels query field might not be supported correctly,
    // we'll use a different approach with filter on the global labels query
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
  
  async getWorkflowStates(teamId?: string) {
    // Use the same query for both cases, just apply a filter for team-specific states
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

    // Create the variables with proper typing
    const variables: any = teamId ? { filter: { team: { id: { eq: teamId } } } } : { filter: {} };

    try {
      const data: any = await this.client.request(query, variables);
      return data.workflowStates.nodes;
    } catch (error) {
      console.error('Error fetching workflow states from Linear:', error);
      throw error;
    }
  }
}

export default new LinearClient();