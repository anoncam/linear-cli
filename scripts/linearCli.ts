#!/usr/bin/env node --no-warnings
import * as fs from 'fs';
import * as path from 'path';
import { exec } from 'child_process';
import dotenv from 'dotenv';
import { GraphQLClient } from 'graphql-request';
import chalk from 'chalk';

dotenv.config();

// Linear API settings
const LINEAR_API_KEY = process.env.LINEAR_API_KEY || '';
const LINEAR_API_URL = 'https://api.linear.app/graphql';

// Check for API key
if (!LINEAR_API_KEY) {
  console.error('ERROR: LINEAR_API_KEY environment variable is not set');
  console.error('Please create a .env file with your Linear API key');
  process.exit(1);
}

// Create GraphQL client
const linearClient = new GraphQLClient(LINEAR_API_URL, {
  headers: {
    Authorization: LINEAR_API_KEY,
  },
});

const CONFIG_FILE = path.join(process.env.HOME || '~', '.linear-cli-config.json');

// Default configuration
interface Config {
  defaultTeam: string | null;
  defaultTimeframe: string;
  outputPath: string;
  lastQuery: {
    type: string;
    team: string; 
    timeframe: string;
    url: string;
  } | null;
}

let config: Config = {
  defaultTeam: null,
  defaultTimeframe: '1w', // 1w, 2w, 1m, 3m
  outputPath: './CLAUDE_LINEAR.md',
  lastQuery: null
};

// Load config if exists
if (fs.existsSync(CONFIG_FILE)) {
  try {
    config = {
      ...config,
      ...JSON.parse(fs.readFileSync(CONFIG_FILE, 'utf8'))
    };
  } catch (e) {
    console.error('Error loading config:', e);
  }
}

// Save config
const saveConfig = () => {
  fs.writeFileSync(CONFIG_FILE, JSON.stringify(config, null, 2));
};

// Parse command line arguments
const args = process.argv.slice(2);
let command = args[0]?.toLowerCase();

// If only -k is passed, default to 'kanban' command
if (command === '-k' || command === '--kanban') {
  args.unshift('kanban');
  command = 'kanban';
}

// Parse command line options
let outputOption: string | null = null;
let formatOption: 'json' | 'markdown' = 'markdown';
let assigneeOption: string | null = null;
let kanbanOption: boolean = false;

// Check for kanban flag anywhere in the args
if (args.includes('-k') || args.includes('--kanban')) {
  kanbanOption = true;
}

for (let i = 0; i < args.length; i++) {
  if (args[i] === '--output' || args[i] === '-o') {
    if (i + 1 < args.length) {
      outputOption = args[i + 1];
      // Remove the option and its value from args
      args.splice(i, 2);
      i -= 2; // Adjust index after removal
      continue;
    }
  }
  
  if (args[i] === '--format' || args[i] === '-f') {
    if (i + 1 < args.length) {
      if (args[i+1] === 'json' || args[i+1] === 'markdown') {
        formatOption = args[i+1] as 'json' | 'markdown';
      }
      // Remove the option and its value from args
      args.splice(i, 2);
      i -= 2; // Adjust index after removal
      continue;
    }
  }
  
  if (args[i] === '--assignee' || args[i] === '-a') {
    if (i + 1 < args.length) {
      assigneeOption = args[i + 1];
      // Remove the option and its value from args
      args.splice(i, 2);
      i -= 2; // Adjust index after removal
      continue;
    }
  }
  
  if (args[i] === '--kanban' || args[i] === '-k') {
    // We already set the flag, now just remove from args
    args.splice(i, 1);
    i -= 1; // Adjust index after removal
    continue;
  }
}

// Determine timeframe in ISO dates
const getTimeframe = (timeframe = config.defaultTimeframe) => {
  const now = new Date();
  const endDate = now.toISOString();
  let startDate;

  switch (timeframe) {
    case '1w':
      startDate = new Date(now.setDate(now.getDate() - 7)).toISOString();
      break;
    case '2w':
      startDate = new Date(now.setDate(now.getDate() - 14)).toISOString();
      break;
    case '1m':
      startDate = new Date(now.setMonth(now.getMonth() - 1)).toISOString();
      break;
    case '3m':
      startDate = new Date(now.setMonth(now.getMonth() - 3)).toISOString();
      break;
    default:
      startDate = new Date(now.setDate(now.getDate() - 7)).toISOString();
  }

  return { startDate, endDate };
};

// Generic function to execute GraphQL query with timeout
const executeGraphQLQuery = async (query: string, variables = {}, timeoutMs = 10000): Promise<any> => {
  const timeout = setTimeout(() => {
    console.log('\nRequest seems to be taking too long...');
    console.log('This might indicate a connection problem or server issue.');
    console.log('You can press Ctrl+C to cancel and try again.');
  }, timeoutMs);
  
  try {
    console.log('Sending request to Linear API...');
    const response = await linearClient.request(query, variables);
    clearTimeout(timeout);
    return response;
  } catch (error: any) {
    clearTimeout(timeout);
    console.error('Error fetching data from Linear API:', error.message);
    
    if (error.response) {
      console.error('API response:', error.response);
    }
    
    console.log('\nPlease check:');
    console.log('1. Your Linear API key is correct in the .env file');
    console.log('2. You have the necessary permissions in Linear');
    throw error;
  }
};

// API methods that mirror the server implementation
const getTeams = async () => {
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
  
  const data = await executeGraphQLQuery(query);
  return data.teams.nodes;
};

const getLabels = async () => {
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
  
  const data = await executeGraphQLQuery(query);
  return data.issueLabels.nodes;
};

const getTeamLabels = async (teamId: string) => {
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
  
  const data = await executeGraphQLQuery(query, { teamId });
  return data.issueLabels.nodes;
};

const getWorkflowStates = async (teamId?: string) => {
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
  
  const variables = teamId ? { filter: { team: { id: { eq: teamId } } } } : { filter: {} };
  const data = await executeGraphQLQuery(query, variables);
  return data.workflowStates.nodes;
};

const getProjects = async () => {
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
  
  const data = await executeGraphQLQuery(query);
  return data.projects.nodes;
};

const getIssues = async (params: any) => {
  const { teams, creators, assignees, projects, labels, states, priorities, startDate, endDate, limit = 100 } = params;
  
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
  
  const data = await executeGraphQLQuery(query, variables);
  return data.issues.nodes.map((issue: any) => ({
    ...issue,
    labels: issue.labels.nodes
  }));
};

const getViewer = async () => {
  const query = `
    query {
      viewer {
        id
        name
        email
      }
    }
  `;
  
  const data = await executeGraphQLQuery(query);
  return data.viewer;
};

const createIssue = async (params: any) => {
  const { teamId, title, description, labelIds, assigneeId, stateId, priorityId, projectId } = params;
  
  const variables: any = {
    input: {
      teamId,
      title,
    }
  };
  
  if (description) variables.input.description = description;
  if (labelIds && labelIds.length > 0) variables.input.labelIds = labelIds;
  if (assigneeId) variables.input.assigneeId = assigneeId;
  if (stateId) variables.input.stateId = stateId;
  if (priorityId) variables.input.priority = priorityId;
  if (projectId) variables.input.projectId = projectId;
  
  const query = `
    mutation CreateIssue($input: IssueCreateInput!) {
      issueCreate(input: $input) {
        success
        issue {
          id
          identifier
          title
          state {
            name
          }
          team {
            key
          }
        }
      }
    }
  `;
  
  const data = await executeGraphQLQuery(query, variables);
  return data.issueCreate;
};

// Create, update or delete a label
const updateLabel = async (params: any) => {
  const { id, teamId, name, color, description, action } = params;
  
  // For delete operation
  if (action === 'delete' && id) {
    const deleteQuery = `
      mutation DeleteLabel($id: ID!) {
        issueLabelDelete(id: $id) {
          success
        }
      }
    `;
    
    const deleteData = await executeGraphQLQuery(deleteQuery, { id });
    return deleteData.issueLabelDelete;
  }
  
  // For create operation
  if (action === 'create' && teamId && name) {
    const createVariables: any = {
      input: {
        teamId,
        name,
      }
    };
    
    if (color) createVariables.input.color = color;
    if (description) createVariables.input.description = description;
    
    const createQuery = `
      mutation CreateLabel($input: IssueLabelCreateInput!) {
        issueLabelCreate(input: $input) {
          success
          issueLabel {
            id
            name
            color
          }
        }
      }
    `;
    
    const createData = await executeGraphQLQuery(createQuery, createVariables);
    return createData.issueLabelCreate;
  }
  
  // For update operation
  if (action === 'update' && id) {
    const updateVariables: any = {
      id,
      input: {}
    };
    
    if (name) updateVariables.input.name = name;
    if (color) updateVariables.input.color = color;
    if (description) updateVariables.input.description = description;
    
    const updateQuery = `
      mutation UpdateLabel($id: ID!, $input: IssueLabelUpdateInput!) {
        issueLabelUpdate(id: $id, input: $input) {
          success
          issueLabel {
            id
            name
            color
          }
        }
      }
    `;
    
    const updateData = await executeGraphQLQuery(updateQuery, updateVariables);
    return updateData.issueLabelUpdate;
  }
  
  throw new Error('Invalid label operation');
};

// Main function to handle commands
const main = async () => {
  try {
    // Show help if no command or help requested
    if (!command || command === 'help') {
      console.log(`
Linear CLI - A command line tool to manage your Linear workspace

Usage:
  linear-cli teams                        - List all teams with their IDs
  linear-cli issues [team] [timeframe]    - Get issues for a team and save to file
  linear-cli report [team] [timeframe]    - Get team report and save to file
  linear-cli config                       - Show current config
  linear-cli set-team <team-id>           - Set default team
  linear-cli set-timeframe <timeframe>    - Set default timeframe (1w, 2w, 1m, 3m)
  linear-cli set-output <filepath>        - Set default output file path
  
  linear-cli labels                       - List all labels in workspace
  linear-cli team-labels <team-id>        - List all labels for a specific team
  linear-cli analyze-labels               - Generate a prompt for Claude to analyze and suggest label changes
  linear-cli apply-label-changes <file>   - Apply bulk label changes from JSON file
  
  linear-cli projects                     - List all projects
  linear-cli states                       - List workflow states
  
  linear-cli my-issues                    - View all issues assigned to you
  linear-cli all-issues                   - View all issues across teams
  linear-cli create                       - Create a new issue
  linear-cli kanban                       - View issues in a kanban board (-k flag)
  
  linear-cli clean                        - Remove all generated files from current directory
  linear-cli test                         - Test connection

Options:
  --output, -o <filepath>                 - Specify output file path for issues/report
  --format, -f <json|markdown>            - Output format (default: markdown)
  --assignee, -a <user-id>                - Filter by assignee
  --kanban, -k                            - Open kanban view
      `);
      return;
    }
    
    // Test command to check Claude CLI
    if (command === 'test') {
      console.log('Testing Claude CLI connection...');
      
      // Create a test file
      const outputPath = outputOption || path.join(process.cwd(), 'claude-test.md');
      const testContent = '# Linear CLI Test\n\nThis is a test to verify Claude can be launched from Linear CLI.';
      
      try {
        fs.writeFileSync(outputPath, testContent);
        console.log(`Test file created at: ${outputPath}`);
      } catch (err) {
        console.error(`Error writing test file: ${err}`);
        console.log('Make sure the directory exists and you have write permissions.');
        return;
      }
      
      console.log(`\nTo test with Claude:
1. Go to https://claude.ai
2. Start a new conversation
3. Click the "+" button and upload: ${outputPath}`);
      console.log('\nYou can now use linear-cli to save Linear data to files for viewing in Claude.');
      return;
    }
    
    // This function has been moved to the top level
    
    // Helper function to format and save data
    const formatAndSaveData = (data: any, title: string, outputPath: string) => {
      let formattedData: string;
      
      if (formatOption === 'json') {
        formattedData = JSON.stringify(data, null, 2);
      } else {
        // Default to markdown format
        formattedData = `# ${title}\n\n`;
        
        if (Array.isArray(data) && data.length === 0) {
          formattedData += 'No data found.\n';
        } else if (Array.isArray(data)) {
          // Try to intelligently format different types of data
          if (data[0].name && data[0].id) {
            formattedData += '| ID | Name | Additional Info |\n';
            formattedData += '|----|------|----------------|\n';
            
            data.forEach((item: any) => {
              const additionalInfo = [];
              if (item.team?.name) additionalInfo.push(`Team: ${item.team.name}`);
              if (item.color) additionalInfo.push(`Color: ${item.color}`);
              if (item.type) additionalInfo.push(`Type: ${item.type}`);
              if (item.key) additionalInfo.push(`Key: ${item.key}`);
              
              formattedData += `| \`${item.id}\` | ${item.name} | ${additionalInfo.join(', ')} |\n`;
            });
          } else {
            // Generic formatting for unknown data structure
            formattedData += JSON.stringify(data, null, 2);
          }
        } else {
          // For non-array data
          formattedData += '```json\n' + JSON.stringify(data, null, 2) + '\n```\n';
        }
      }
      
      try {
        fs.writeFileSync(outputPath, formattedData);
        console.log(`Data saved to ${outputPath}`);
        
        if (formatOption === 'markdown') {
          console.log(`\nTo view in Claude:
1. Go to https://claude.ai
2. Start a new conversation
3. Click the "+" button and upload: ${outputPath}`);
        }
      } catch (err) {
        console.error(`Error writing to file: ${err}`);
      }
    };
    
    // List all teams
    if (command === 'teams') {
      console.log('Fetching teams directly from Linear API...');
      
      try {
        const teams = await getTeams();
        console.log('\nAvailable teams:');
        console.log('================');
        
        if (teams.length === 0) {
          console.log('No teams found. Your Linear API key might not have access to any teams.');
        } else {
          teams.forEach((team: any) => {
            console.log(`ID: ${team.id}`);
            console.log(`Name: ${team.name}`);
            console.log(`Key: ${team.key}`);
            console.log('----------------');
          });
          
          console.log('\nTo set a default team, run:');
          console.log(`linear-cli set-team YOUR_TEAM_ID`);
          console.log('\nFor example:');
          if (teams.length > 0) {
            console.log(`linear-cli set-team ${teams[0].id}  # Sets ${teams[0].name} as default`);
          }
        }
      } catch (error: any) {
        console.error('Error fetching teams from Linear API:', error.message);
        console.log('\nPlease check:');
        console.log('1. Your Linear API key is correct in the .env file');
        console.log('2. You have the necessary permissions in Linear');
      }
      return;
    }

    // Show config
    if (command === 'config') {
      console.log('Current configuration:');
      console.log(JSON.stringify(config, null, 2));
      return;
    }

    // Set default team
    if (command === 'set-team') {
      const teamInput = args[1];
      if (!teamInput) {
        console.error('Please provide a team ID or team key');
        return;
      }
      
      // Check if this is already a valid team ID format
      if (teamInput.match(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i)) {
        config.defaultTeam = teamInput;
        saveConfig();
        console.log(`Default team set to ID: ${teamInput}`);
        console.log('Fetching team info...');
        
        try {
          const teams = await getTeams();
          const teamInfo = teams.find((team: any) => team.id === teamInput);
          if (teamInfo) {
            console.log(`Team name: ${teamInfo.name} (${teamInfo.key})`);
          } else {
            console.log('Could not find team info. Please verify the team ID is correct.');
          }
        } catch (error) {
          console.log('Could not fetch team information. Please check your Linear API key.');
        }
        
        return;
      }
      
      // If it's not a UUID, resolve it to a team ID
      try {
        console.log('Resolving team key to team ID...');
        const teams = await getTeams();
        
        // Try to match by key first
        const normalizedInput = teamInput.toUpperCase();
        let teamInfo = teams.find((team: any) => team.key.toUpperCase() === normalizedInput);
        
        // If that fails, try a partial name match
        if (!teamInfo) {
          teamInfo = teams.find((team: any) => 
            team.name.toUpperCase().includes(normalizedInput)
          );
        }
        
        if (!teamInfo) {
          console.error(`Could not find a team matching "${teamInput}"`);
          console.log('\nAvailable teams:');
          teams.forEach((team: any) => {
            console.log(`- ${team.name} (Key: ${team.key}, ID: ${team.id})`);
          });
          return;
        }
        
        config.defaultTeam = teamInfo.id;
        saveConfig();
        console.log(`Default team set to ${teamInfo.name} (${teamInfo.key})`);
        console.log(`Team ID: ${teamInfo.id}`);
      } catch (error) {
        console.error('Error resolving team key. Please check your Linear API key.');
        console.log('You can also use the full team ID instead.');
      }
      return;
    }

    // Set default timeframe
    if (command === 'set-timeframe') {
      const timeframe = args[1];
      if (!timeframe || !['1w', '2w', '1m', '3m'].includes(timeframe)) {
        console.error('Please provide a valid timeframe: 1w, 2w, 1m, 3m');
        return;
      }
      config.defaultTimeframe = timeframe;
      saveConfig();
      console.log(`Default timeframe set to ${timeframe}`);
      return;
    }
    
    // Set default output path
    if (command === 'set-output') {
      const outputPath = args[1];
      if (!outputPath) {
        console.error('Please provide a file path');
        return;
      }
      config.outputPath = outputPath;
      saveConfig();
      console.log(`Default output path set to ${outputPath}`);
      return;
    }

    // Handle issues command
    if (command === 'issues') {
      const teamInput = args[1] || config.defaultTeam;
      const timeframe = args[2] || config.defaultTimeframe;
      
      if (!teamInput) {
        console.error('Please specify a team ID or key, or set a default team with set-team');
        return;
      }
      
      let teamId: string;
      let teamName: string;
      
      try {
        // Fetch all teams to resolve the team ID
        console.log('Resolving team identifier...');
        const teams = await getTeams();
        
        // Determine if we have a team ID or a team key
        let teamInfo: any;
        
        // Is it a full UUID (team ID)?
        if (teamInput.match(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i)) {
          teamId = teamInput;
          teamInfo = teams.find((team: any) => team.id === teamInput);
        } else {
          // It might be a team key (3-letter code)
          const normalizedInput = teamInput.toUpperCase();
          teamInfo = teams.find((team: any) => 
            team.key.toUpperCase() === normalizedInput
          );
          
          if (!teamInfo) {
            // Try a case-insensitive partial match on team name
            teamInfo = teams.find((team: any) => 
              team.name.toUpperCase().includes(normalizedInput)
            );
          }
          
          if (!teamInfo) {
            console.error(`Could not find a team matching "${teamInput}"`);
            console.log('\nAvailable teams:');
            teams.forEach((team: any) => {
              console.log(`- ${team.name} (Key: ${team.key}, ID: ${team.id})`);
            });
            return;
          }
          
          teamId = teamInfo.id;
        }
        
        teamName = teamInfo ? teamInfo.name : teamId;
      } catch (error) {
        console.error('Error resolving team identifier. Please check your Linear API key.');
        console.log('Proceeding with the team input as-is.');
        teamId = teamInput;
        teamName = teamInput;
      }

      const { startDate, endDate } = getTimeframe(timeframe);
      
      console.log(`Fetching issues for team ${teamName}...`);
      console.log(`Time range: ${timeframe} (${new Date(startDate).toLocaleDateString()} to ${new Date(endDate).toLocaleDateString()})`);
      
      // Save this query to config
      config.lastQuery = {
        type: 'issues',
        team: teamId,
        timeframe,
        url: '' // No longer using URLs
      };
      saveConfig();

      // Use output option if provided, otherwise use the default path
      const outputPath = outputOption || config.outputPath;
      
      try {
        // Fetch the issues directly from Linear
        const issues = await getIssues({
          teams: [teamId],
          startDate,
          endDate
        });
        
        console.log(`Found ${issues.length} issues for team ${teamName}`);
        
        // Create a markdown report
        let reportText = `# Issues for Team: ${teamName}\n\n`;
        reportText += `Time Period: ${new Date(startDate).toLocaleDateString()} to ${new Date(endDate).toLocaleDateString()}\n\n`;
        
        if (issues.length === 0) {
          reportText += "No issues found for this time period.\n";
        } else {
          // Group issues by state
          const issuesByState: Record<string, any[]> = {};
          
          issues.forEach((issue: any) => {
            const stateName = issue.state?.name || 'Unknown';
            if (!issuesByState[stateName]) {
              issuesByState[stateName] = [];
            }
            issuesByState[stateName].push(issue);
          });
          
          // Add each state section
          Object.entries(issuesByState).forEach(([stateName, stateIssues]) => {
            reportText += `## ${stateName} (${stateIssues.length})\n\n`;
            
            stateIssues.forEach(issue => {
              const labels = issue.labels?.map((label: any) => `\`${label.name}\``).join(', ') || '';
              const assigneeName = issue.assignee?.name || 'Unassigned';
              
              reportText += `### ${issue.identifier}: ${issue.title}\n\n`;
              if (labels) reportText += `**Labels:** ${labels}\n\n`;
              reportText += `**Assignee:** ${assigneeName}\n\n`;
              reportText += `**Created:** ${new Date(issue.createdAt).toLocaleDateString()}\n\n`;
              
              if (issue.description) {
                reportText += "**Description:**\n";
                reportText += "```\n";
                reportText += issue.description.substring(0, 500);
                if (issue.description.length > 500) reportText += "...(truncated)";
                reportText += "\n```\n\n";
              }
              
              reportText += "---\n\n";
            });
          });
        }
        
        console.log(`Writing data to file: ${outputPath}`);
        fs.writeFileSync(outputPath, reportText);
        console.log('File created successfully.');
        console.log(`\nTo view this data in Claude:
1. Go to https://claude.ai
2. Start a new conversation
3. Click the "+" button and upload: ${outputPath}`);
      } catch (error: any) {
        console.error('Error fetching issues from Linear:', error.message);
        console.log('\nPlease check:');
        console.log('1. Your Linear API key is correct in the .env file');
        console.log('2. You specified a valid team ID');
        console.log('3. You have the necessary permissions in Linear');
      }
    }

    // Handle report command
    if (command === 'report') {
      const teamInput = args[1] || config.defaultTeam;
      const timeframe = args[2] || config.defaultTimeframe;
      
      if (!teamInput) {
        console.error('Please specify a team ID or key, or set a default team with set-team');
        return;
      }
      
      let teamId: string;
      let teamName: string;
      
      try {
        // Fetch all teams to resolve the team ID
        console.log('Resolving team identifier...');
        const teams = await getTeams();
        
        // Determine if we have a team ID or a team key
        let teamInfo: any;
        
        // Is it a full UUID (team ID)?
        if (teamInput.match(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i)) {
          teamId = teamInput;
          teamInfo = teams.find((team: any) => team.id === teamInput);
        } else {
          // It might be a team key (3-letter code)
          const normalizedInput = teamInput.toUpperCase();
          teamInfo = teams.find((team: any) => 
            team.key.toUpperCase() === normalizedInput
          );
          
          if (!teamInfo) {
            // Try a case-insensitive partial match on team name
            teamInfo = teams.find((team: any) => 
              team.name.toUpperCase().includes(normalizedInput)
            );
          }
          
          if (!teamInfo) {
            console.error(`Could not find a team matching "${teamInput}"`);
            console.log('\nAvailable teams:');
            teams.forEach((team: any) => {
              console.log(`- ${team.name} (Key: ${team.key}, ID: ${team.id})`);
            });
            return;
          }
          
          teamId = teamInfo.id;
        }
        
        teamName = teamInfo ? teamInfo.name : teamId;
      } catch (error) {
        console.error('Error resolving team identifier. Please check your Linear API key.');
        console.log('Proceeding with the team input as-is.');
        teamId = teamInput;
        teamName = teamInput;
      }

      const { startDate, endDate } = getTimeframe(timeframe);
      
      console.log(`Generating team report for ${teamName}...`);
      console.log(`Time range: ${timeframe} (${new Date(startDate).toLocaleDateString()} to ${new Date(endDate).toLocaleDateString()})`);
      
      // Save this query to config
      config.lastQuery = {
        type: 'report',
        team: teamId,
        timeframe,
        url: '' // No longer using URLs
      };
      saveConfig();

      // Use output option if provided, otherwise use the default path
      const outputPath = outputOption || config.outputPath.replace('.md', '-report.md');
      
      try {
        // Fetch the issues directly from Linear
        const issues = await getIssues({
          teams: [teamId],
          startDate,
          endDate
        });
        
        // Also get the workflow states
        const states = await getWorkflowStates(teamId);
        
        console.log(`Found ${issues.length} issues for team ${teamName}`);
        
        // Create a markdown report
        let reportText = `# Team Report: ${teamName}\n\n`;
        reportText += `Time Period: ${new Date(startDate).toLocaleDateString()} to ${new Date(endDate).toLocaleDateString()}\n\n`;
        
        // Summary statistics
        const completedIssues = issues.filter((issue: any) => issue.state?.type === 'completed');
        const canceledIssues = issues.filter((issue: any) => issue.state?.type === 'canceled');
        const inProgressIssues = issues.filter((issue: any) => issue.state?.type === 'started');
        const todoIssues = issues.filter((issue: any) => issue.state?.type === 'unstarted' || issue.state?.type === 'backlog');
        
        reportText += `## Summary\n\n`;
        reportText += `- **Total Issues:** ${issues.length}\n`;
        reportText += `- **Completed:** ${completedIssues.length}\n`;
        reportText += `- **Canceled:** ${canceledIssues.length}\n`;
        reportText += `- **In Progress:** ${inProgressIssues.length}\n`;
        reportText += `- **Todo/Backlog:** ${todoIssues.length}\n\n`;
        
        // Label statistics
        const labelCounts: Record<string, number> = {};
        issues.forEach((issue: any) => {
          if (issue.labels && issue.labels.length > 0) {
            issue.labels.forEach((label: any) => {
              if (!labelCounts[label.name]) {
                labelCounts[label.name] = 0;
              }
              labelCounts[label.name]++;
            });
          }
        });
        
        if (Object.keys(labelCounts).length > 0) {
          reportText += `## Label Usage\n\n`;
          Object.entries(labelCounts)
            .sort((a, b) => b[1] - a[1])
            .forEach(([labelName, count]) => {
              reportText += `- \`${labelName}\`: ${count} issues\n`;
            });
          reportText += `\n`;
        }
        
        // Issues by state
        reportText += `## Issues by State\n\n`;
        
        // Create a map of state IDs to state objects
        const stateMap = states.reduce((map: Record<string, any>, state: any) => {
          map[state.id] = state;
          return map;
        }, {});
        
        // Group issues by state
        const issuesByState: Record<string, any[]> = {};
        
        issues.forEach((issue: any) => {
          const stateId = issue.state?.id;
          const stateName = issue.state?.name || 'Unknown';
          
          if (!issuesByState[stateName]) {
            issuesByState[stateName] = [];
          }
          issuesByState[stateName].push(issue);
        });
        
        // Sort states by their position in the workflow
        const sortedStates = Object.entries(issuesByState)
          .sort((a, b) => {
            // If we have state positions, use them
            const stateA = states.find((s: any) => s.name === a[0]);
            const stateB = states.find((s: any) => s.name === b[0]);
            
            if (stateA && stateB) {
              return stateA.position - stateB.position;
            }
            
            // Fallback to alphabetical
            return a[0].localeCompare(b[0]);
          });
        
        // Add each state section
        sortedStates.forEach(([stateName, stateIssues]) => {
          reportText += `### ${stateName} (${stateIssues.length})\n\n`;
          
          stateIssues.forEach(issue => {
            reportText += `- **${issue.identifier}:** ${issue.title}\n`;
          });
          reportText += `\n`;
        });
        
        // Assignee distribution
        const assigneeCounts: Record<string, number> = {};
        issues.forEach((issue: any) => {
          const assigneeName = issue.assignee?.name || 'Unassigned';
          if (!assigneeCounts[assigneeName]) {
            assigneeCounts[assigneeName] = 0;
          }
          assigneeCounts[assigneeName]++;
        });
        
        reportText += `## Assignee Distribution\n\n`;
        Object.entries(assigneeCounts)
          .sort((a, b) => b[1] - a[1])
          .forEach(([assigneeName, count]) => {
            reportText += `- **${assigneeName}:** ${count} issues\n`;
          });
        
        console.log(`Writing report data to file: ${outputPath}`);
        fs.writeFileSync(outputPath, reportText);
        console.log('File created successfully.');
        console.log(`\nTo view this report in Claude:
1. Go to https://claude.ai
2. Start a new conversation
3. Click the "+" button and upload: ${outputPath}`);
      } catch (error: any) {
        console.error('Error generating team report:', error.message);
        console.log('\nPlease check:');
        console.log('1. Your Linear API key is correct in the .env file');
        console.log('2. You specified a valid team ID');
        console.log('3. You have the necessary permissions in Linear');
      }
    }
    
    // Handle my-issues command
    if (command === 'my-issues') {
      console.log('Fetching your assigned issues...');
      
      try {
        // First get the current user's ID
        const viewer = await getViewer();
        console.log(`Logged in as: ${viewer.name} (${viewer.email})`);
        
        const timeframe = args[1] || config.defaultTimeframe;
        const { startDate, endDate } = getTimeframe(timeframe);
        
        console.log(`Fetching issues assigned to you from all teams...`);
        console.log(`Time range: ${timeframe} (${new Date(startDate).toLocaleDateString()} to ${new Date(endDate).toLocaleDateString()})`);
        
        // Fetch all teams first
        const teams = await getTeams();
        
        // Then fetch issues assigned to current user
        const issues = await getIssues({
          assignees: [viewer.id],
          startDate,
          endDate,
          limit: 200
        });
        
        // Open kanban view if requested
        if (kanbanOption) {
          await showKanbanView(issues, teams);
          return;
        }
        
        console.log(`\nFound ${issues.length} issues assigned to you`);
        
        // Group issues by team
        const issuesByTeam: Record<string, any[]> = {};
        
        issues.forEach((issue: any) => {
          const teamKey = issue.team?.key || 'Unknown';
          if (!issuesByTeam[teamKey]) {
            issuesByTeam[teamKey] = [];
          }
          issuesByTeam[teamKey].push(issue);
        });
        
        // Sort teams by key
        const sortedTeams = Object.entries(issuesByTeam).sort((a, b) => a[0].localeCompare(b[0]));
        
        // Display issues grouped by team and state
        sortedTeams.forEach(([teamKey, teamIssues]) => {
          console.log(`\n${teamKey} (${teamIssues.length} issues):`);
          
          // Group by state
          const issuesByState: Record<string, any[]> = {};
          
          teamIssues.forEach((issue: any) => {
            const stateName = issue.state?.name || 'Unknown';
            if (!issuesByState[stateName]) {
              issuesByState[stateName] = [];
            }
            issuesByState[stateName].push(issue);
          });
          
          // Display each state
          Object.entries(issuesByState).forEach(([stateName, stateIssues]) => {
            console.log(`  ${stateName} (${stateIssues.length}):`);
            
            stateIssues.forEach((issue: any) => {
              const priority = issue.priority ? `P${issue.priority}` : '';
              console.log(`    ${issue.identifier}: ${issue.title} ${priority}`);
            });
          });
        });
        
        // Generate a markdown report if output is requested
        if (outputOption) {
          let reportText = `# My Assigned Issues\n\n`;
          reportText += `Time Period: ${new Date(startDate).toLocaleDateString()} to ${new Date(endDate).toLocaleDateString()}\n\n`;
          
          // Add team sections
          sortedTeams.forEach(([teamKey, teamIssues]) => {
            reportText += `## ${teamKey} Team (${teamIssues.length} issues)\n\n`;
            
            // Group by state
            const issuesByState: Record<string, any[]> = {};
            
            teamIssues.forEach((issue: any) => {
              const stateName = issue.state?.name || 'Unknown';
              if (!issuesByState[stateName]) {
                issuesByState[stateName] = [];
              }
              issuesByState[stateName].push(issue);
            });
            
            // Add each state section
            Object.entries(issuesByState).forEach(([stateName, stateIssues]) => {
              reportText += `### ${stateName} (${stateIssues.length})\n\n`;
              
              stateIssues.forEach((issue: any) => {
                const priority = issue.priority ? `P${issue.priority}` : '';
                const labels = issue.labels?.map((label: any) => `\`${label.name}\``).join(', ') || '';
                
                reportText += `- **${issue.identifier}:** ${issue.title} ${priority}\n`;
                if (labels) reportText += `  **Labels:** ${labels}\n`;
                if (issue.description) reportText += `  _${issue.description.split('\n')[0].substring(0, 100)}${issue.description.length > 100 ? '...' : ''}_\n`;
                reportText += `\n`;
              });
            });
          });
          
          fs.writeFileSync(outputOption, reportText);
          console.log(`\nReport saved to ${outputOption}`);
        }
      } catch (error: any) {
        console.error('Error fetching your issues:', error.message);
        console.log('\nPlease check:');
        console.log('1. Your Linear API key is correct in the .env file');
        console.log('2. You have the necessary permissions in Linear');
      }
      return;
    }
    
    // Handle all-issues command
    if (command === 'all-issues') {
      console.log('Fetching all issues across teams...');
      
      const timeframe = args[1] || config.defaultTimeframe;
      const { startDate, endDate } = getTimeframe(timeframe);
      
      console.log(`Time range: ${timeframe} (${new Date(startDate).toLocaleDateString()} to ${new Date(endDate).toLocaleDateString()})`);
      
      try {
        // Fetch all teams
        const teams = await getTeams();
        
        // Fetch issues with optional assignee filter
        const params: any = {
          startDate,
          endDate,
          limit: 200
        };
        
        if (assigneeOption) {
          params.assignees = [assigneeOption];
          console.log(`Filtering by assignee ID: ${assigneeOption}`);
        }
        
        const issues = await getIssues(params);
        
        // Open kanban view if requested
        if (kanbanOption) {
          await showKanbanView(issues, teams);
          return;
        }
        
        console.log(`\nFound ${issues.length} issues across ${teams.length} teams`);
        
        // Group issues by team
        const issuesByTeam: Record<string, any[]> = {};
        
        issues.forEach((issue: any) => {
          const teamKey = issue.team?.key || 'Unknown';
          if (!issuesByTeam[teamKey]) {
            issuesByTeam[teamKey] = [];
          }
          issuesByTeam[teamKey].push(issue);
        });
        
        // Sort teams by key
        const sortedTeams = Object.entries(issuesByTeam).sort((a, b) => a[0].localeCompare(b[0]));
        
        // Display issues grouped by team and state
        sortedTeams.forEach(([teamKey, teamIssues]) => {
          console.log(`\n${teamKey} (${teamIssues.length} issues):`);
          
          // Group by state
          const issuesByState: Record<string, any[]> = {};
          
          teamIssues.forEach((issue: any) => {
            const stateName = issue.state?.name || 'Unknown';
            if (!issuesByState[stateName]) {
              issuesByState[stateName] = [];
            }
            issuesByState[stateName].push(issue);
          });
          
          // Display each state
          Object.entries(issuesByState).forEach(([stateName, stateIssues]) => {
            console.log(`  ${stateName} (${stateIssues.length}):`);
            
            stateIssues.forEach((issue: any) => {
              const assignee = issue.assignee?.name || 'Unassigned';
              const priority = issue.priority ? `P${issue.priority}` : '';
              console.log(`    ${issue.identifier}: ${issue.title} (${assignee}) ${priority}`);
            });
          });
        });
        
        // Generate a markdown report if output is requested
        if (outputOption) {
          let reportText = `# All Issues Across Teams\n\n`;
          reportText += `Time Period: ${new Date(startDate).toLocaleDateString()} to ${new Date(endDate).toLocaleDateString()}\n\n`;
          
          if (assigneeOption) {
            reportText += `Filtered by assignee ID: ${assigneeOption}\n\n`;
          }
          
          // Add team sections
          sortedTeams.forEach(([teamKey, teamIssues]) => {
            reportText += `## ${teamKey} Team (${teamIssues.length} issues)\n\n`;
            
            // Group by state
            const issuesByState: Record<string, any[]> = {};
            
            teamIssues.forEach((issue: any) => {
              const stateName = issue.state?.name || 'Unknown';
              if (!issuesByState[stateName]) {
                issuesByState[stateName] = [];
              }
              issuesByState[stateName].push(issue);
            });
            
            // Add each state section
            Object.entries(issuesByState).forEach(([stateName, stateIssues]) => {
              reportText += `### ${stateName} (${stateIssues.length})\n\n`;
              
              stateIssues.forEach((issue: any) => {
                const assignee = issue.assignee?.name || 'Unassigned';
                const priority = issue.priority ? `P${issue.priority}` : '';
                const labels = issue.labels?.map((label: any) => `\`${label.name}\``).join(', ') || '';
                
                reportText += `- **${issue.identifier}:** ${issue.title} (${assignee}) ${priority}\n`;
                if (labels) reportText += `  **Labels:** ${labels}\n`;
                if (issue.description) reportText += `  _${issue.description.split('\n')[0].substring(0, 100)}${issue.description.length > 100 ? '...' : ''}_\n`;
                reportText += `\n`;
              });
            });
          });
          
          fs.writeFileSync(outputOption, reportText);
          console.log(`\nReport saved to ${outputOption}`);
        }
      } catch (error: any) {
        console.error('Error fetching issues:', error.message);
        console.log('\nPlease check:');
        console.log('1. Your Linear API key is correct in the .env file');
        console.log('2. You have the necessary permissions in Linear');
      }
      return;
    }
    
    // Handle create command
    if (command === 'create') {
      console.log('Create a new issue:');
      
      try {
        // First get the teams to select one
        const teams = await getTeams();
        
        if (teams.length === 0) {
          console.error('No teams found. Your Linear API key might not have access to any teams.');
          return;
        }
        
        // Use the default team if set
        let selectedTeamId = config.defaultTeam;
        let selectedTeam: any = null;
        
        if (selectedTeamId) {
          selectedTeam = teams.find((team: any) => team.id === selectedTeamId);
        }
        
        if (!selectedTeam) {
          // No default team or default team not found, show team selection
          console.log('\nSelect a team:');
          teams.forEach((team: any, index: number) => {
            console.log(`${index + 1}. ${team.name} (${team.key})`);
          });
          
          // Use readline for interactive input
          const readline = require('readline').createInterface({
            input: process.stdin,
            output: process.stdout
          });
          
          const teamIndex = await new Promise((resolve) => {
            readline.question('\nTeam number: ', (answer: string) => {
              resolve(parseInt(answer, 10) - 1);
            });
          });
          
          if (isNaN(teamIndex as number) || teamIndex as number < 0 || teamIndex as number >= teams.length) {
            console.error('Invalid team selection.');
            readline.close();
            return;
          }
          
          selectedTeam = teams[teamIndex as number];
          selectedTeamId = selectedTeam.id;
        }
        
        console.log(`\nCreating issue for team: ${selectedTeam.name} (${selectedTeam.key})`);
        
        // Create a readline interface for user input
        const readline = require('readline').createInterface({
          input: process.stdin,
          output: process.stdout
        });
        
        // Get issue title
        const title = await new Promise((resolve) => {
          readline.question('Title: ', (answer: string) => {
            resolve(answer);
          });
        });
        
        if (!title) {
          console.error('Title is required.');
          readline.close();
          return;
        }
        
        // Get issue description (optional)
        const description = await new Promise((resolve) => {
          readline.question('Description (optional): ', (answer: string) => {
            resolve(answer);
          });
        });
        
        // Create the issue
        console.log('\nCreating issue...');
        const result = await createIssue({
          teamId: selectedTeamId,
          title,
          description: description || undefined
        });
        
        readline.close();
        
        if (result.success) {
          console.log(`\nIssue created successfully!`);
          console.log(`ID: ${result.issue.identifier}`);
          console.log(`Title: ${result.issue.title}`);
          console.log(`State: ${result.issue.state.name}`);
          console.log(`Team: ${result.issue.team.key}`);
        } else {
          console.error('Error creating issue.');
        }
      } catch (error: any) {
        console.error('Error creating issue:', error.message);
        console.log('\nPlease check:');
        console.log('1. Your Linear API key is correct in the .env file');
        console.log('2. You have the necessary permissions in Linear');
      }
      return;
    }
    
    // Handle kanban command explicitly
    if (command === 'kanban') {
      console.log('Opening kanban view...');
      
      try {
        // Extract team if specified
        let teamFilter: string | null = null;
        let teamId: string | null = null;
        let teamName: string | null = null;
        let timeframe = config.defaultTimeframe;
        
        // Check all arguments for a potential team identifier
        for (let i = 1; i < args.length; i++) {
          // Skip if it's a recognized option
          if (args[i].startsWith('-')) continue;
          
          // First non-option argument could be a team
          teamFilter = args[i];
          
          // Second non-option argument could be a timeframe
          if (i + 1 < args.length && !args[i+1].startsWith('-')) {
            const potentialTimeframe = args[i+1];
            if (['1w', '2w', '1m', '3m'].includes(potentialTimeframe)) {
              timeframe = potentialTimeframe;
            }
          }
          
          break;
        }
        
        const { startDate, endDate } = getTimeframe(timeframe);
        console.log(`Time range: ${timeframe} (${new Date(startDate).toLocaleDateString()} to ${new Date(endDate).toLocaleDateString()})`);
        
        // Get teams first to resolve any team identifier
        const teams = await getTeams();
        
        // If team filter is specified, try to resolve it
        if (teamFilter) {
          // Is it a full UUID?
          if (teamFilter.match(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i)) {
            teamId = teamFilter;
            const teamInfo = teams.find((team: any) => team.id === teamFilter);
            teamName = teamInfo ? teamInfo.name : 'Unknown';
          } else {
            // Try to match by key or name
            const normalizedInput = teamFilter.toUpperCase();
            let teamInfo = teams.find((team: any) => team.key.toUpperCase() === normalizedInput);
            
            // If not found by key, try by name (partial match)
            if (!teamInfo) {
              teamInfo = teams.find((team: any) => 
                team.name.toUpperCase().includes(normalizedInput)
              );
            }
            
            if (teamInfo) {
              teamId = teamInfo.id;
              teamName = teamInfo.name;
              console.log(`Showing issues for team: ${teamName} (${teamInfo.key})`);
            } else {
              console.error(`Could not find a team matching "${teamFilter}"`);
              console.log('\nAvailable teams:');
              teams.forEach((team: any) => {
                console.log(`- ${team.name} (${team.key})`);
              });
              return;
            }
          }
        } else if (config.defaultTeam) {
          // Use default team if no team specified and default exists
          teamId = config.defaultTeam;
          const teamInfo = teams.find((team: any) => team.id === teamId);
          if (teamInfo) {
            teamName = teamInfo.name;
            console.log(`Using default team: ${teamName} (${teamInfo.key})`);
          }
        } else {
          console.log('Showing issues from all teams');
        }
        
        // Build params for issues query
        const params: any = {
          startDate,
          endDate,
          limit: 200  // Increased limit to show more issues
        };
        
        if (teamId) {
          params.teams = [teamId];
        }
        
        if (assigneeOption) {
          params.assignees = [assigneeOption];
          console.log(`Filtering by assignee ID: ${assigneeOption}`);
        }
        
        // Fetch workflow states to ensure we display all relevant states
        let workflowStates: any[] = [];
        try {
          if (teamId) {
            workflowStates = await getWorkflowStates(teamId);
            console.log(`Loaded ${workflowStates.length} workflow states for team`);
          } else {
            // If no team specified, get all workflow states
            workflowStates = await getWorkflowStates();
            console.log(`Loaded ${workflowStates.length} workflow states from workspace`);
          }
        } catch (error) {
          console.error('Error loading workflow states, will use default states:', error);
          // We'll continue even if we can't get states
        }
        
        // Fetch issues
        const issues = await getIssues(params);
        
        if (issues.length === 0) {
          console.log(chalk.yellow('No issues found with the current filters.'));
          
          if (teamId) {
            console.log('Try viewing issues across all teams:');
            console.log(chalk.cyan('  linear-cli kanban'));
          }
          
          if (assigneeOption) {
            console.log('Try removing the assignee filter:');
            console.log(chalk.cyan('  linear-cli kanban' + (teamId ? ` ${teamFilter}` : '')));
          }
          
          return;
        }
        
        // Show kanban view
        await showKanbanView(issues, teams, workflowStates);
      } catch (error: any) {
        console.error('Error loading kanban view:', error.message);
        console.log('\nPlease check:');
        console.log('1. Your Linear API key is correct in the .env file');
        console.log('2. You have the necessary permissions in Linear');
      }
      return;
    }
    
    // Function to show kanban view (used by multiple commands)
    async function showKanbanView(issues: any[], allTeams: any[], workflowStates: any[] = []) {
      // This is a colorful terminal implementation using chalk
      console.log(chalk.bold.cyan('\n🔄 KANBAN VIEW 🔄') + chalk.yellow(' (Press Ctrl+C to exit)\n'));
      
      if (!issues || issues.length === 0) {
        console.log(chalk.red('No issues found to display in kanban view.'));
        return;
      }
      
      // Create an initial map of all states, even empty ones
      const issuesByState: Record<string, any[]> = {};
      
      // If we have workflow states, prepopulate the states map with all of them
      if (workflowStates && workflowStates.length > 0) {
        workflowStates.forEach(state => {
          // Only include states that are not done/canceled when prepopulating
          if (state.type !== 'completed' && state.type !== 'canceled') {
            issuesByState[state.name] = [];
          }
        });
      }
      
      // Add all issues to their corresponding state
      issues.forEach((issue: any) => {
        const stateName = issue.state?.name || 'Unknown';
        if (!issuesByState[stateName]) {
          issuesByState[stateName] = [];
        }
        issuesByState[stateName].push(issue);
      });
      
      if (Object.keys(issuesByState).length === 0) {
        console.log(chalk.red('No states found to display in kanban view.'));
        return;
      }
      
      // Get common state types for column order and assign colors
      const stateOrder = ['backlog', 'unstarted', 'started', 'completed', 'canceled'];
      const stateColors: Record<string, any> = {
        'backlog': chalk.gray,
        'unstarted': chalk.blue,
        'started': chalk.yellow,
        'completed': chalk.green,
        'canceled': chalk.red
      };
      
      // Create a map of state names to their types and positions
      const stateInfo: Record<string, {type: string, position: number}> = {};
      if (workflowStates && workflowStates.length > 0) {
        workflowStates.forEach(state => {
          stateInfo[state.name] = {
            type: state.type,
            position: state.position
          };
        });
      }
      
      // Sort states by their workflow position if available, otherwise by type
      const sortedStates = Object.entries(issuesByState).sort((a, b) => {
        const stateNameA = a[0];
        const stateNameB = b[0];
        
        // First use workflow position if available
        if (stateInfo[stateNameA] && stateInfo[stateNameB]) {
          return stateInfo[stateNameA].position - stateInfo[stateNameB].position;
        }
        
        // Fall back to type-based ordering if we have state types
        const stateTypeA = stateInfo[stateNameA]?.type || 
                          issues.find((issue: any) => issue.state?.name === stateNameA)?.state?.type;
        const stateTypeB = stateInfo[stateNameB]?.type || 
                          issues.find((issue: any) => issue.state?.name === stateNameB)?.state?.type;
        
        const indexA = stateOrder.indexOf(stateTypeA);
        const indexB = stateOrder.indexOf(stateTypeB);
        
        if (indexA !== -1 && indexB !== -1) {
          return indexA - indexB;
        }
        
        // Last resort: alphabetical
        return stateNameA.localeCompare(stateNameB);
      });
      
      // Display summary
      const teams: Record<string, { count: number, key: string }> = {};
      issues.forEach((issue: any) => {
        const teamName = issue.team?.name || 'Unknown';
        const teamKey = issue.team?.key || '---';
        if (!teams[teamName]) {
          teams[teamName] = { count: 0, key: teamKey };
        }
        teams[teamName].count++;
      });
      
      // Team summary display
      console.log(chalk.white(`Displaying ${chalk.bold(issues.length.toString())} issues from ${chalk.bold(Object.keys(teams).length.toString())} teams:`));
      
      // Create a colorful team summary with counts
      const teamColorByKey: Record<string, any> = {
        'ENG': chalk.cyan,
        'DES': chalk.magenta,
        'MKT': chalk.green,
        'OPS': chalk.yellow,
        'SUP': chalk.blue
      };
      
      const teamSummary = Object.entries(teams)
        .sort((a, b) => b[1].count - a[1].count) // Sort by count descending
        .map(([name, info]) => {
          const color = teamColorByKey[info.key] || chalk.white;
          return color(`${info.key} (${info.count})`);
        })
        .join(' | ');
      
      console.log(chalk.white(teamSummary));
      
      // Display legend
      console.log('\n' + chalk.bold('Priority: ') + 
        chalk.white.bgRed(' P0 ') + ' ' + 
        chalk.black.bgYellow(' P1 ') + ' ' + 
        chalk.black.bgGreen(' P2 ') + ' ' + 
        chalk.black.bgBlue(' P3 ') + ' ' + 
        chalk.white.bgGray(' P4 '));
      
      // Display kanban columns (handle terminal width)
      const columnWidth = 22; // Fixed column width
      const separator = chalk.gray(' │ ');
      
      // Create a header with state names in appropriate colors
      const header = sortedStates.map(([state, _], index) => {
        // Get state type from our state info map or find it in issues
        const stateType = stateInfo[state]?.type || 
                         issues.find((issue: any) => issue.state?.name === state)?.state?.type || '';
        const colorFn = stateColors[stateType] || chalk.white;
        
        // Add a count of issues in the header
        const count = issuesByState[state].length;
        const stateDisplay = `${state} (${count})`;
        
        return colorFn.bold(stateDisplay.substring(0, columnWidth).padEnd(columnWidth));
      }).join(separator);
      
      // Create horizontal border
      const border = sortedStates.map(() => 
        chalk.gray('─'.repeat(columnWidth))
      ).join(chalk.gray('┼'));
      
      // Display header
      console.log('\n' + header);
      console.log(chalk.gray('┌' + border + '┐'));
      
      // Find the column with the most issues
      const maxIssues = Math.max(...sortedStates.map(([_, stateIssues]) => stateIssues.length), 1);
      
      // Calculate max visible issues (limit to avoid overwhelming terminal)
      const maxVisibleIssues = Math.min(maxIssues, 25);
      
      // Display issues in columns
      for (let i = 0; i < maxVisibleIssues; i++) {
        const row = sortedStates.map(([stateName, stateIssues]) => {
          if (i < stateIssues.length) {
            const issue = stateIssues[i];
            const teamKey = issue.team?.key || '';
            const priority = issue.priority !== null ? issue.priority : 4;
            
            // Choose priority background color
            let priorityDisplay = '';
            if (priority === 0) priorityDisplay = chalk.white.bgRed(' P0 ');
            else if (priority === 1) priorityDisplay = chalk.black.bgYellow(' P1 ');
            else if (priority === 2) priorityDisplay = chalk.black.bgGreen(' P2 ');
            else if (priority === 3) priorityDisplay = chalk.black.bgBlue(' P3 ');
            else priorityDisplay = chalk.white.bgGray(' P4 ');
            
            // Format the identifier in team color
            const colorByTeam: Record<string, any> = {
              'ENG': chalk.cyan,
              'DES': chalk.magenta,
              'MKT': chalk.green,
              'OPS': chalk.yellow,
              'SUP': chalk.blue
            };
            
            const teamColor = colorByTeam[teamKey] || chalk.white;
            const identifier = teamColor(issue.identifier);
            
            // Format the display text
            let titleText = '';
            const maxTitleLength = columnWidth - 12; // Allow space for identifier and priority
            
            if (issue.title) {
              titleText = issue.title.length > maxTitleLength 
                ? issue.title.substring(0, maxTitleLength - 3) + '...' 
                : issue.title;
            }
            
            const displayText = `${identifier} ${chalk.white(titleText)}`;
            
            // Construct the cell with proper padding
            let cell = displayText + ' '.repeat(Math.max(0, columnWidth - displayText.length - priorityDisplay.length)) + priorityDisplay;
            if (cell.length > columnWidth) {
              cell = cell.substring(0, columnWidth);
            }
            
            return cell;
          }
          return ' '.repeat(columnWidth);
        }).join(separator);
        
        console.log(chalk.gray('│') + row + chalk.gray('│'));
      }
      
      // If there are more issues than we showed, indicate it
      if (maxIssues > maxVisibleIssues) {
        const hiddenCount = maxIssues - maxVisibleIssues;
        console.log(chalk.gray('│') + chalk.yellow(` ... ${hiddenCount} more issues not shown ...`.padEnd(columnWidth * sortedStates.length + (sortedStates.length - 1) * 3)) + chalk.gray('│'));
      }
      
      // Bottom border
      console.log(chalk.gray('└' + border + '┘'));
      
      console.log('\n' + chalk.yellow('Press Ctrl+C to exit kanban view'));
      
      // Keep the process running until the user presses Ctrl+C
      return new Promise((resolve) => {
        process.stdin.resume();
        
        const sigintHandler = () => {
          console.log(chalk.green('\nExiting kanban view.'));
          process.stdin.pause();
          process.removeListener('SIGINT', sigintHandler);
          resolve(undefined);
        };
        
        process.on('SIGINT', sigintHandler);
      });
    }
    
    // This function has been moved to the top level
    
    // List all labels
    if (command === 'labels') {
      console.log('Fetching all labels directly from Linear API...');
      
      try {
        const labels = await getLabels();
        const outputPath = outputOption || path.join(process.cwd(), 'linear-labels.md');
        
        // Group labels by team
        const labelsByTeam: Record<string, any[]> = {};
        const globalLabels: any[] = [];
        
        labels.forEach((label: any) => {
          if (label.team) {
            const teamName = label.team.name;
            if (!labelsByTeam[teamName]) {
              labelsByTeam[teamName] = [];
            }
            labelsByTeam[teamName].push(label);
          } else {
            globalLabels.push(label);
          }
        });
        
        // Display in terminal
        console.log(`\nFound ${labels.length} labels across ${Object.keys(labelsByTeam).length} teams`);
        
        if (globalLabels.length > 0) {
          console.log(`\nGlobal Labels (${globalLabels.length}):`);
          globalLabels.forEach((label: any) => {
            console.log(`- ${label.name} (${label.id})`);
          });
        }
        
        // Format and save to file
        formatAndSaveData(labels, 'Linear Labels', outputPath);
      } catch (error) {
        console.error('Error fetching labels from Linear API. Please check your API key and permissions.');
      }
      return;
    }
    
    // List team labels
    if (command === 'team-labels') {
      let teamInput = args[1] || config.defaultTeam;
      
      if (!teamInput) {
        console.error('Please specify a team ID or key, or set a default team with set-team');
        return;
      }
      
      try {
        // Fetch all teams to resolve the team ID
        console.log('Fetching teams to resolve team identifier...');
        const teams = await getTeams();
        
        // Determine if we have a team ID or a team key
        let teamId: string;
        let teamInfo: any;
        
        // Is it a full UUID (team ID)?
        if (teamInput.match(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i)) {
          teamId = teamInput;
          teamInfo = teams.find((team: any) => team.id === teamInput);
        } else {
          // It might be a team key (3-letter code)
          const normalizedInput = teamInput.toUpperCase();
          teamInfo = teams.find((team: any) => 
            team.key.toUpperCase() === normalizedInput
          );
          
          if (!teamInfo) {
            // Try a case-insensitive partial match on team name
            teamInfo = teams.find((team: any) => 
              team.name.toUpperCase().includes(normalizedInput)
            );
          }
          
          if (!teamInfo) {
            console.error(`Could not find a team matching "${teamInput}"`);
            console.log('\nAvailable teams:');
            teams.forEach((team: any) => {
              console.log(`- ${team.name} (Key: ${team.key}, ID: ${team.id})`);
            });
            return;
          }
          
          teamId = teamInfo.id;
        }
        
        console.log(`Fetching labels for team ${teamInfo ? teamInfo.name : teamId}...`);
        
        const labels = await getTeamLabels(teamId);
        
        const teamName = teamInfo ? teamInfo.name : teamId;
        
        // Determine output path based on option, team name, or default
        const outputPath = outputOption || path.join(process.cwd(), `linear-team-labels-${teamName}.md`);
        const analyzeOutputPath = outputOption ? 
          outputOption.replace(/\.md$/, `-analysis.md`) : 
          path.join(process.cwd(), `ANALYZE_${teamName.toUpperCase().replace(/\s+/g, '_')}_LABELS.md`);
        
        if (labels.length === 0) {
          console.log(`\nNo labels found for team ${teamName}`);
        } else {
          // Display in terminal
          console.log(`\nFound ${labels.length} labels for team ${teamName}:`);
          
          // Show the first few labels as a preview
          labels.slice(0, 5).forEach((label: any) => {
            console.log(`- ${label.name} (${label.color})`);
          });
          
          if (labels.length > 5) {
            console.log(`... and ${labels.length - 5} more`);
          }
          
          // Format and save to file
          formatAndSaveData(labels, `Team Labels for ${teamName}`, outputPath);
          
          // ADDITIONALLY: Create an analysis template file
          try {
            // Read the MODIFY_LABELS.md template
            const templatePath = path.join(process.cwd(), 'MODIFY_LABELS.md');
            let template = '';
            
            try {
              template = fs.readFileSync(templatePath, 'utf8');
            } catch (err) {
              console.error(`Error reading MODIFY_LABELS.md template: ${err}`);
              console.log('Creating team labels file only. For analysis file, ensure MODIFY_LABELS.md exists.');
              return;
            }
            
            // Format the team labels data
            let labelsData = `## Current Labels for Team: ${teamName}\n\n`;
            labelsData += `TeamID: \`${teamId}\`\n`;
            labelsData += `TeamKey: ${teamInfo ? teamInfo.key : 'Unknown'}\n\n`;
            labelsData += '| ID | Name | Color |\n';
            labelsData += '|----|------|-------|\n';
            
            labels.forEach((label: any) => {
              labelsData += `| \`${label.id}\` | ${label.name} | ${label.color} |\n`;
            });
            
            // Combine template and data
            const fullPrompt = template + '\n\n' + labelsData;
            
            // Write the combined file
            fs.writeFileSync(analyzeOutputPath, fullPrompt);
            
            console.log(`\nTeam label analysis prompt created at: ${analyzeOutputPath}`);
            console.log(`\nTo analyze with Claude:
1. Go to https://claude.ai
2. Start a new conversation
3. Click the "+" button and upload: ${analyzeOutputPath}

When Claude responds:
1. Find the JSON section in Claude's response
2. Copy the entire JSON (from { to })
3. Save it to ${teamName.toLowerCase().replace(/\s+/g, '-')}-label-changes.json
4. In the future, you'll be able to apply these changes with:
   linear-cli apply-label-changes ${teamName.toLowerCase().replace(/\s+/g, '-')}-label-changes.json`);
          } catch (err) {
            console.error(`Error creating analysis file: ${err}`);
            console.log('The labels file was still created successfully.');
          }
        }
      } catch (error: any) {
        console.error('Error fetching team labels from Linear API:', error.message);
        console.log('\nPlease check:');
        console.log('1. Your Linear API key is correct in the .env file');
        console.log('2. You specified a valid team ID');
        console.log('3. You have the necessary permissions in Linear');
      }
      return;
    }
    
    // List workflow states
    if (command === 'states') {
      const teamInput = args[1] || config.defaultTeam;
      let teamId: string | undefined;
      let teamName = '';
      
      // If a team is specified, resolve it
      if (teamInput) {
        try {
          // Fetch all teams to resolve the team ID
          console.log('Resolving team identifier...');
          const teams = await getTeams();
          
          // Determine if we have a team ID or a team key
          let teamInfo: any;
          
          // Is it a full UUID (team ID)?
          if (teamInput.match(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i)) {
            teamId = teamInput;
            teamInfo = teams.find((team: any) => team.id === teamInput);
          } else {
            // It might be a team key (3-letter code)
            const normalizedInput = teamInput.toUpperCase();
            teamInfo = teams.find((team: any) => 
              team.key.toUpperCase() === normalizedInput
            );
            
            if (!teamInfo) {
              // Try a case-insensitive partial match on team name
              teamInfo = teams.find((team: any) => 
                team.name.toUpperCase().includes(normalizedInput)
              );
            }
            
            if (!teamInfo) {
              console.error(`Could not find a team matching "${teamInput}"`);
              console.log('\nAvailable teams:');
              teams.forEach((team: any) => {
                console.log(`- ${team.name} (Key: ${team.key}, ID: ${team.id})`);
              });
              return;
            }
            
            teamId = teamInfo.id;
          }
          
          if (teamId) {
            teamName = teamInfo ? teamInfo.name : teamId;
            console.log(`Fetching workflow states for team ${teamName}...`);
          }
        } catch (error) {
          console.error('Error resolving team identifier. Falling back to all states.');
        }
      } else {
        console.log('Fetching all workflow states...');
      }
      
      try {
        const states = await getWorkflowStates(teamId);
        
        // Create appropriate output path and title
        const outputPath = outputOption || (teamName 
          ? path.join(process.cwd(), `linear-states-${teamName.toLowerCase().replace(/\s+/g, '-')}.md`)
          : path.join(process.cwd(), 'linear-states.md'));
        
        const title = teamName ? `Workflow States for ${teamName}` : 'All Workflow States';
        
        // Display in terminal
        console.log(`\nFound ${states.length} workflow states`);
        
        // Format and save to file
        formatAndSaveData(states, title, outputPath);
      } catch (error: any) {
        console.error('Error fetching workflow states from Linear API:', error.message);
        console.log('\nPlease check:');
        console.log('1. Your Linear API key is correct in the .env file');
        console.log('2. You have the necessary permissions in Linear');
      }
      return;
    }
    
    // List projects
    if (command === 'projects') {
      console.log('Fetching all projects directly from Linear API...');
      
      try {
        const projects = await getProjects();
        const outputPath = outputOption || path.join(process.cwd(), 'linear-projects.md');
        
        // Display in terminal
        console.log(`\nFound ${projects.length} projects`);
        
        // Format and save to file
        formatAndSaveData(projects, 'Linear Projects', outputPath);
      } catch (error: any) {
        console.error('Error fetching projects from Linear API:', error.message);
        console.log('\nPlease check:');
        console.log('1. Your Linear API key is correct in the .env file');
        console.log('2. You have the necessary permissions in Linear');
      }
      return;
    }
    
    // Analyze labels
    if (command === 'analyze-labels') {
      console.log('Generating label analysis prompt for Claude...');
      
      try {
        // Step 1: Get all labels directly from Linear API
        console.log('Fetching all labels from Linear API...');
        const labels = await getLabels();
        
        // Display in terminal
        console.log(`\nFound ${labels.length} labels`);
        
        // Step 2: Read the MODIFY_LABELS.md template
        const templatePath = path.join(process.cwd(), 'MODIFY_LABELS.md');
        let template = '';
        
        try {
          template = fs.readFileSync(templatePath, 'utf8');
        } catch (err) {
          console.error(`Error reading MODIFY_LABELS.md template: ${err}`);
          console.log('Please make sure the MODIFY_LABELS.md file exists in the current directory.');
          return;
        }
        
        // Step 3: Format the labels data
        let labelsData = '## Current Labels\n\n';
        
        // Group labels by team
        const labelsByTeam: Record<string, any[]> = {};
        const globalLabels: any[] = [];
        
        labels.forEach((label: any) => {
          if (label.team) {
            const teamName = label.team.name;
            if (!labelsByTeam[teamName]) {
              labelsByTeam[teamName] = [];
            }
            labelsByTeam[teamName].push(label);
          } else {
            globalLabels.push(label);
          }
        });
        
        // Add global labels section
        if (globalLabels.length > 0) {
          labelsData += '### Global Labels\n\n';
          labelsData += '| ID | Name | Color |\n';
          labelsData += '|----|------|-------|\n';
          
          globalLabels.forEach(label => {
            labelsData += `| \`${label.id}\` | ${label.name} | ${label.color} |\n`;
          });
          
          labelsData += '\n';
        }
        
        // Add team-specific labels sections
        Object.entries(labelsByTeam).forEach(([teamName, teamLabels]) => {
          labelsData += `### Team: ${teamName}\n\n`;
          labelsData += '| ID | Name | Color |\n';
          labelsData += '|----|------|-------|\n';
          
          teamLabels.forEach(label => {
            labelsData += `| \`${label.id}\` | ${label.name} | ${label.color} |\n`;
          });
          
          labelsData += '\n';
        });
        
        // Step 4: Combine template and data
        const fullPrompt = template + '\n\n' + labelsData;
        
        // Step 5: Write the combined file
        const outputPath = outputOption || path.join(process.cwd(), 'ANALYZE_LABELS.md');
        fs.writeFileSync(outputPath, fullPrompt);
        
        console.log(`\nLabel analysis prompt created at: ${outputPath}`);
        console.log(`\nTo analyze with Claude:
1. Go to https://claude.ai
2. Start a new conversation
3. Click the "+" button and upload: ${outputPath}

When Claude responds:
1. Find the JSON section in Claude's response
2. Copy the entire JSON (from { to })
3. Save it to label-changes.json
4. Apply the changes with:
   linear-cli apply-label-changes label-changes.json`);
      } catch (error: any) {
        console.error('Error generating label analysis:', error.message);
        console.log('\nPlease check:');
        console.log('1. Your Linear API key is correct in the .env file');
        console.log('2. You have the necessary permissions in Linear');
        console.log('3. The MODIFY_LABELS.md template file exists');
      }
      return;
    }
    
    // Clean command to remove generated files
    if (command === 'clean') {
      console.log(chalk.cyan('Cleaning up generated files from current directory...'));
      
      // Define patterns to match generated files
      const patterns = [
        'linear-team-labels*.md',
        'linear-labels*.md',
        'linear-projects*.md',
        'linear-states*.md',
        'ANALYZE_*.md',
        'ANALYZE_LABELS.md',
        '*-label-changes.json',
        'label-changes.json',
        'CLAUDE_LINEAR*.md'
      ];
      
      // Create absolute paths for each pattern
      const absolutePatterns = patterns.map(pattern => 
        path.join(process.cwd(), pattern)
      );
      
      try {
        // Use glob to find matching files
        const { glob } = await import('glob');
        
        let filesRemoved = 0;
        let errors = 0;
        
        // Process each pattern and remove matching files
        for (const pattern of absolutePatterns) {
          const files = await glob(pattern);
          
          for (const file of files) {
            try {
              fs.unlinkSync(file);
              console.log(chalk.green(`✓ Removed: ${path.basename(file)}`));
              filesRemoved++;
            } catch (error) {
              console.error(chalk.red(`Error removing ${file}: ${error}`));
              errors++;
            }
          }
        }
        
        // Display summary
        if (filesRemoved === 0 && errors === 0) {
          console.log(chalk.yellow('No files found to clean up.'));
        } else {
          console.log(chalk.cyan(`\nCleanup complete! ${filesRemoved} files removed.`));
          if (errors > 0) {
            console.log(chalk.red(`Failed to remove ${errors} files.`));
          }
        }
      } catch (error) {
        console.error(chalk.red('Error during cleanup:'), error);
      }
      
      return;
    }
    
    // Apply label changes from JSON file
    if (command === 'apply-label-changes') {
      const filePath = args[1];
      
      if (!filePath) {
        console.error('Please provide a path to a JSON file with label changes');
        console.log('Usage: linear-cli apply-label-changes <file>');
        return;
      }
      
      try {
        // Step 1: Read the JSON file
        let labelChanges;
        try {
          const fileContent = fs.readFileSync(filePath, 'utf8');
          labelChanges = JSON.parse(fileContent);
        } catch (err) {
          console.error(`Error reading or parsing JSON file: ${err}`);
          console.log('Make sure the file exists and contains valid JSON.');
          return;
        }
        
        if (!labelChanges || typeof labelChanges !== 'object') {
          console.error('Invalid label changes format. Expected a JSON object.');
          return;
        }
        
        // Step 2: Validate and transform the JSON structure if needed
        // First, check if it's using the recommended Claude format (from MODIFY_LABELS.md)
        const hasClaudeFormat = labelChanges.add || labelChanges.rename || labelChanges.merge || 
                                labelChanges.remove || labelChanges.recolor;
        
        // If it's using Claude's format, transform it to our internal format
        if (hasClaudeFormat) {
          console.log(chalk.cyan('Detected Claude AI format, transforming to internal format...'));
          
          // Create temporary structure
          const transformedChanges: any = {
            create: [],
            update: [],
            delete: []
          };
          
          // Handle "add" operations
          if (labelChanges.add && Array.isArray(labelChanges.add)) {
            labelChanges.add.forEach((label: any) => {
              if (label.name) {
                transformedChanges.create.push({
                  teamId: label.teamId,
                  name: label.name,
                  color: label.color,
                  description: label.description
                });
              }
            });
          }
          
          // Handle "rename" operations as updates
          if (labelChanges.rename && Array.isArray(labelChanges.rename)) {
            labelChanges.rename.forEach((rename: any) => {
              if (rename.oldName && rename.newName) {
                // Check if we have an ID, otherwise we'll need to look it up
                if (rename.id) {
                  transformedChanges.update.push({
                    id: rename.id,
                    name: rename.newName,
                    color: rename.color
                  });
                } else {
                  console.log(chalk.yellow(`Warning: Rename operation for "${rename.oldName}" requires label ID.`));
                  console.log('Please include the exact label ID in the JSON file.');
                }
              }
            });
          }
          
          // Handle "recolor" operations as updates
          if (labelChanges.recolor && Array.isArray(labelChanges.recolor)) {
            labelChanges.recolor.forEach((recolor: any) => {
              if (recolor.name && recolor.color) {
                if (recolor.id) {
                  transformedChanges.update.push({
                    id: recolor.id,
                    color: recolor.color
                  });
                } else {
                  console.log(chalk.yellow(`Warning: Recolor operation for "${recolor.name}" requires label ID.`));
                  console.log('Please include the exact label ID in the JSON file.');
                }
              }
            });
          }
          
          // Handle "merge" operations (create one label, delete others)
          if (labelChanges.merge && Array.isArray(labelChanges.merge)) {
            labelChanges.merge.forEach((merge: any) => {
              if (merge.sourceLabels && merge.targetLabel) {
                // First, create or update the target label
                if (merge.targetLabelId) {
                  // Update existing label
                  transformedChanges.update.push({
                    id: merge.targetLabelId,
                    name: merge.targetLabel,
                    color: merge.color
                  });
                } else {
                  // Create new label
                  transformedChanges.create.push({
                    teamId: merge.teamId,
                    name: merge.targetLabel,
                    color: merge.color
                  });
                  console.log(chalk.yellow(`Note: Creating new target label "${merge.targetLabel}" for merge operation.`));
                }
                
                // Then delete the source labels (if we have their IDs)
                if (merge.sourceLabelIds && Array.isArray(merge.sourceLabelIds)) {
                  merge.sourceLabelIds.forEach((id: string) => {
                    if (id) transformedChanges.delete.push(id);
                  });
                } else {
                  console.log(chalk.yellow(`Warning: Merge operation for "${merge.targetLabel}" requires source label IDs.`));
                  console.log('Please include the exact label IDs in the JSON file.');
                }
              }
            });
          }
          
          // Handle "remove" operations
          if (labelChanges.remove && Array.isArray(labelChanges.remove)) {
            labelChanges.remove.forEach((remove: any) => {
              if (remove.id) {
                transformedChanges.delete.push(remove.id);
              } else {
                console.log(chalk.yellow(`Warning: Remove operation for "${remove.name}" requires label ID.`));
                console.log('Please include the exact label ID in the JSON file.');
              }
            });
          }
          
          // Replace the original with transformed structure
          labelChanges = transformedChanges;
          console.log(chalk.green('Successfully transformed format.'));
        }
        
        // Now validate the structure
        if ((!labelChanges.create || labelChanges.create.length === 0) && 
            (!labelChanges.update || labelChanges.update.length === 0) && 
            (!labelChanges.delete || labelChanges.delete.length === 0)) {
          console.error('Invalid label changes format. Expected at least one of: create, update, or delete.');
          console.log('Format should be: { "create": [...], "update": [...], "delete": [...] }');
          console.log('Or Claude format: { "add": [...], "rename": [...], "remove": [...], ... }');
          return;
        }
        
        // Step 3: Process changes
        let createCount = 0;
        let updateCount = 0;
        let deleteCount = 0;
        let errorCount = 0;
        
        // Get team ID if we have a team key
        let teamId = null;
        if (labelChanges.teamId) {
          teamId = labelChanges.teamId;
        } else if (labelChanges.teamKey) {
          console.log(`Resolving team key ${labelChanges.teamKey}...`);
          const teams = await getTeams();
          const teamInfo = teams.find((team: any) => team.key.toUpperCase() === labelChanges.teamKey.toUpperCase());
          
          if (!teamInfo) {
            console.error(`Could not find a team with key "${labelChanges.teamKey}"`);
            return;
          }
          
          teamId = teamInfo.id;
          console.log(`Resolved team key ${labelChanges.teamKey} to ID: ${teamId}`);
        }
        
        // Confirm with user
        const readline = require('readline').createInterface({
          input: process.stdin,
          output: process.stdout
        });
        
        console.log(chalk.cyan('\nPreparing to apply the following label changes:'));
        if (labelChanges.create && labelChanges.create.length > 0) {
          console.log(chalk.green(`- Create ${labelChanges.create.length} new labels`));
        }
        if (labelChanges.update && labelChanges.update.length > 0) {
          console.log(chalk.yellow(`- Update ${labelChanges.update.length} existing labels`));
        }
        if (labelChanges.delete && labelChanges.delete.length > 0) {
          console.log(chalk.red(`- Delete ${labelChanges.delete.length} labels`));
        }
        
        // Confirm before proceeding
        const confirm = await new Promise((resolve) => {
          readline.question(chalk.bold('\nDo you want to proceed? [y/N] '), (answer: string) => {
            resolve(answer.toLowerCase());
          });
        });
        
        if (confirm !== 'y' && confirm !== 'yes') {
          console.log('Operation canceled.');
          readline.close();
          return;
        }
        
        readline.close();
        
        // Process create operations
        if (labelChanges.create && labelChanges.create.length > 0) {
          console.log(chalk.cyan('\nCreating new labels...'));
          
          for (const label of labelChanges.create) {
            try {
              if (!teamId && !label.teamId) {
                console.error(`Cannot create label "${label.name}" without a team ID`);
                errorCount++;
                continue;
              }
              
              const result = await updateLabel({
                action: 'create',
                teamId: label.teamId || teamId,
                name: label.name,
                color: label.color,
                description: label.description
              });
              
              if (result.success) {
                console.log(chalk.green(`✓ Created label: ${label.name}`));
                createCount++;
              } else {
                console.error(`Failed to create label: ${label.name}`);
                errorCount++;
              }
            } catch (error: any) {
              console.error(`Error creating label "${label.name}": ${error.message}`);
              errorCount++;
            }
            
            // Add a small delay to avoid rate limiting
            await new Promise(resolve => setTimeout(resolve, 200));
          }
        }
        
        // Process update operations
        if (labelChanges.update && labelChanges.update.length > 0) {
          console.log(chalk.cyan('\nUpdating existing labels...'));
          
          for (const label of labelChanges.update) {
            try {
              if (!label.id) {
                console.error(`Cannot update label "${label.name}" without an ID`);
                errorCount++;
                continue;
              }
              
              const result = await updateLabel({
                action: 'update',
                id: label.id,
                name: label.name,
                color: label.color,
                description: label.description
              });
              
              if (result.success) {
                console.log(chalk.yellow(`✓ Updated label: ${label.name}`));
                updateCount++;
              } else {
                console.error(`Failed to update label: ${label.name}`);
                errorCount++;
              }
            } catch (error: any) {
              console.error(`Error updating label "${label.name}": ${error.message}`);
              errorCount++;
            }
            
            // Add a small delay to avoid rate limiting
            await new Promise(resolve => setTimeout(resolve, 200));
          }
        }
        
        // Process delete operations
        if (labelChanges.delete && labelChanges.delete.length > 0) {
          console.log(chalk.cyan('\nDeleting labels...'));
          
          for (const labelId of labelChanges.delete) {
            try {
              if (!labelId) {
                console.error(`Cannot delete label without an ID`);
                errorCount++;
                continue;
              }
              
              const result = await updateLabel({
                action: 'delete',
                id: labelId
              });
              
              if (result.success) {
                console.log(chalk.red(`✓ Deleted label ID: ${labelId}`));
                deleteCount++;
              } else {
                console.error(`Failed to delete label: ${labelId}`);
                errorCount++;
              }
            } catch (error: any) {
              console.error(`Error deleting label ID "${labelId}": ${error.message}`);
              errorCount++;
            }
            
            // Add a small delay to avoid rate limiting
            await new Promise(resolve => setTimeout(resolve, 200));
          }
        }
        
        // Summary
        console.log(chalk.cyan('\nLabel changes complete:'));
        console.log(chalk.green(`- Created: ${createCount}`));
        console.log(chalk.yellow(`- Updated: ${updateCount}`));
        console.log(chalk.red(`- Deleted: ${deleteCount}`));
        
        if (errorCount > 0) {
          console.error(chalk.red(`- Errors: ${errorCount}`));
        }
        
        // Suggest next steps
        console.log('\nTo view the updated labels:');
        if (teamId) {
          const teams = await getTeams();
          const teamInfo = teams.find((team: any) => team.id === teamId);
          if (teamInfo) {
            console.log(`linear-cli team-labels ${teamInfo.key}`);
          } else {
            console.log(`linear-cli team-labels <team-id-or-key>`);
          }
        } else {
          console.log(`linear-cli labels`);
        }
      } catch (error: any) {
        console.error('Error applying label changes:', error.message);
        console.log('\nPlease check:');
        console.log('1. Your Linear API key is correct in the .env file');
        console.log('2. You have the necessary permissions in Linear');
        console.log('3. The JSON file is properly formatted');
      }
      return;
    }

  } catch (error) {
    console.error('Error:', error);
  }
};

main();