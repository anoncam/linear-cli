/**
 * Enhanced Kanban Mode for Linear CLI
 * 
 * A full-featured terminal-based kanban board with support for viewing 
 * and managing issue relationships.
 */

import blessed from 'neo-blessed';
import { GraphQLClient } from 'graphql-request';
import chalk from 'chalk';
import { EventEmitter } from 'events';

// Define interfaces for our data
interface LinearIssue {
  id: string;
  identifier: string;
  title: string;
  description: string | null;
  priority: number;
  createdAt: string;
  updatedAt: string;
  dueDate?: string;
  cycle?: {
    id: string;
    name: string;
    startsAt: string;
    endsAt: string;
  } | null;
  state: {
    id: string;
    name: string;
    type: string;
    color: string;
  };
  team: {
    id: string;
    name: string;
    key: string;
  };
  creator: {
    id: string;
    name: string;
    email: string;
  };
  assignee: {
    id: string;
    name: string;
    email: string;
    avatarUrl?: string;
  } | null;
  project: {
    id: string;
    name: string;
    description: string | null;
  } | null;
  labels: {
    id: string;
    name: string;
    color: string;
  }[];
  parent: LinearIssueRelation | null;
  children: LinearIssueRelation[];
  blockedBy: LinearIssueRelation[];
  blocking: LinearIssueRelation[];
  relatedTo: LinearIssueRelation[];
  comments?: {
    id: string;
    body: string;
    createdAt: string;
    user?: {
      id: string;
      name: string;
    };
  }[];
}

interface LinearIssueRelation {
  id: string;
  identifier: string;
  title: string;
  state?: {
    id: string;
    name: string;
    type: string;
  };
  team?: {
    id: string;
    name: string;
    key: string;
  };
}

interface LinearTeam {
  id: string;
  name: string;
  key: string;
  description?: string;
  color?: string;
}

interface LinearState {
  id: string;
  name: string;
  type: string;
  color: string;
  position: number;
  team: {
    id: string;
    name: string;
    key: string;
  };
}

interface LinearUser {
  id: string;
  name: string;
  email: string;
  avatarUrl?: string;
  active?: boolean;
}

// Define our view modes
enum ViewMode {
  KANBAN = 'kanban',
  DETAIL = 'detail',
  TEAM_SELECT = 'team_select',
  FILTER = 'filter',
  CREATE = 'create',
  HELP = 'help',
  RELATIONSHIP_GRAPH = 'relationship_graph',
}

// Define our state management
interface KanbanState {
  issues: LinearIssue[];
  teams: LinearTeam[];
  workflowStates: LinearState[];
  users: LinearUser[];
  selectedTeamId: string | null;
  selectedTeamName: string | null;
  selectedIssueId: string | null;
  selectedStateId: string | null;
  selectedAssigneeId: string | null;
  viewMode: ViewMode;
  isLoading: boolean;
  error: string | null;
  startDate: string | null;
  endDate: string | null;
  focusedColumnIndex: number;
  focusedIssueIndex: number;
  events: EventEmitter;
}

// GraphQL queries
const ISSUES_QUERY = `
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

const TEAMS_QUERY = `
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

const USERS_QUERY = `
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

const STATES_QUERY = `
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

const CREATE_ISSUE_MUTATION = `
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

const UPDATE_ISSUE_MUTATION = `
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

const CREATE_ISSUE_RELATION_MUTATION = `
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

const DELETE_ISSUE_RELATION_MUTATION = `
  mutation DeleteIssueRelation($id: ID!) {
    issueRelationDelete(id: $id) {
      success
    }
  }
`;

const GET_ISSUE_RELATIONS_QUERY = `
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

// State type colors
const STATE_TYPE_COLORS = {
  'backlog': '#555555',
  'unstarted': '#f1fa8c',
  'started': '#bd93f9',
  'completed': '#50fa7b',
  'canceled': '#ff5555'
};

// Priority colors
const PRIORITY_COLORS = {
  0: '#555555',
  1: '#ff5555',
  2: '#f1fa8c',
  3: '#bd93f9',
  4: '#50fa7b'
};

// Priority labels
const PRIORITIES = {
  0: 'No priority',
  1: 'Urgent',
  2: 'High',
  3: 'Medium',
  4: 'Low'
};

/**
 * Initialize the kanban state with default values
 */
function initializeState(options: {
  teamId?: string;
  teamName?: string;
  assigneeId?: string;
  startDate?: string;
  endDate?: string;
}): KanbanState {
  const events = new EventEmitter();
  
  // Set max listeners to avoid memory leak warnings
  events.setMaxListeners(100);
  
  return {
    // Data
    issues: [],
    teams: [],
    workflowStates: [],
    users: [],
    
    // Current selections
    selectedTeamId: options.teamId || null,
    selectedTeamName: options.teamName || null,
    selectedIssueId: null,
    selectedStateId: null,
    selectedAssigneeId: options.assigneeId || null,
    
    // View state
    viewMode: ViewMode.KANBAN,
    isLoading: false,
    error: null,
    
    // Filters
    startDate: options.startDate || null,
    endDate: options.endDate || null,
    
    // UI state
    focusedColumnIndex: 0,
    focusedIssueIndex: 0,
    
    // Events
    events
  };
}

/**
 * Create a screen component 
 */
function setupScreen(): blessed.Widgets.Screen {
  return blessed.screen({
    smartCSR: true,
    title: 'Linear CLI - Enhanced Kanban',
    cursor: {
      artificial: true,
      shape: 'line',
      blink: true,
      color: 'white',
    },
    debug: false,
    dockBorders: true,
    fullUnicode: true,
    autoPadding: true,
  });
}

/**
 * Create the layout components
 */
function setupLayout(screen: blessed.Widgets.Screen) {
  const header = blessed.box({
    parent: screen,
    top: 0,
    left: 0,
    right: 0,
    height: 3,
    tags: true,
    style: {
      fg: 'white',
      bg: 'blue',
    },
  });

  const footer = blessed.box({
    parent: screen,
    bottom: 0,
    left: 0,
    right: 0,
    height: 3,
    tags: true,
    style: {
      fg: 'white',
      bg: 'blue',
    },
  });

  const board = blessed.box({
    parent: screen,
    top: 3,
    left: 0,
    right: 0,
    bottom: 3,
    tags: true,
    style: {
      fg: 'white',
      bg: 'black',
    },
    scrollable: true,
    scrollbar: {
      ch: ' ',
      track: {
        bg: 'gray',
      },
      style: {
        inverse: true,
      },
    },
    mouse: true,
    keys: true,
  });

  const detailView = blessed.box({
    parent: screen,
    top: 'center',
    left: 'center',
    width: '80%',
    height: '80%',
    tags: true,
    border: {
      type: 'line',
    },
    style: {
      fg: 'white',
      bg: 'black',
      border: {
        fg: 'white',
      },
    },
    scrollable: true,
    scrollbar: {
      ch: ' ',
      track: {
        bg: 'gray',
      },
      style: {
        inverse: true,
      },
    },
    mouse: true,
    keys: true,
    hidden: true,
  });

  const relationshipGraph = blessed.box({
    parent: screen,
    top: 'center',
    left: 'center',
    width: '90%',
    height: '90%',
    tags: true,
    border: {
      type: 'line',
    },
    style: {
      fg: 'white',
      bg: 'black',
      border: {
        fg: 'cyan',
      },
    },
    scrollable: true,
    scrollbar: {
      ch: ' ',
      track: {
        bg: 'gray',
      },
      style: {
        inverse: true,
      },
    },
    mouse: true,
    keys: true,
    hidden: true,
  });

  const loading = blessed.box({
    parent: screen,
    top: 'center',
    left: 'center',
    width: 30,
    height: 5,
    tags: true,
    border: {
      type: 'line',
    },
    style: {
      fg: 'white',
      bg: 'black',
      border: {
        fg: 'white',
      },
    },
    content: '{center}Loading...{/center}',
    align: 'center',
    valign: 'middle',
    hidden: true,
  });

  return {
    header,
    board,
    footer,
    detailView,
    relationshipGraph,
    loading,
  };
}

/**
 * Setup detail view for a selected issue
 */
function setupDetailView(
  detailBox: blessed.Widgets.BoxElement,
  state: KanbanState,
  apiClient: GraphQLClient
): void {
  // Create the content container
  const contentContainer = blessed.box({
    parent: detailBox,
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    scrollable: true,
    scrollbar: {
      ch: ' ',
      track: {
        bg: 'gray',
      },
      style: {
        inverse: true,
      },
    },
    keys: true,
    mouse: true,
    tags: true,
  });

  // Create the title
  const title = blessed.text({
    parent: contentContainer,
    top: 0,
    left: 0,
    right: 0,
    height: 1,
    content: '',
    style: {
      fg: 'white',
      bold: true,
    },
  });

  // Create the identifier
  const identifier = blessed.text({
    parent: contentContainer,
    top: 1,
    left: 0,
    right: 0,
    height: 1,
    content: '',
    style: {
      fg: 'white',
    },
  });

  // Create the metadata
  const metadata = blessed.text({
    parent: contentContainer,
    top: 3,
    left: 0,
    right: 0,
    height: 6,
    content: '',
    tags: true,
    style: {
      fg: 'white',
    },
  });

  // Create the description
  const description = blessed.box({
    parent: contentContainer,
    top: 10,
    left: 0,
    right: 0,
    height: 10,
    content: '',
    tags: true,
    style: {
      fg: 'white',
    },
    border: {
      type: 'line',
    },
    scrollable: true,
    scrollbar: {
      ch: ' ',
      track: {
        bg: 'gray',
      },
      style: {
        inverse: true,
      },
    },
  });

  // Create the labels section
  const labels = blessed.text({
    parent: contentContainer,
    top: 21,
    left: 0,
    right: 0,
    height: 3,
    content: '',
    tags: true,
    style: {
      fg: 'white',
    },
  });

  // Create the relationships section
  const relationships = blessed.box({
    parent: contentContainer,
    top: 25,
    left: 0,
    right: 0,
    height: 10,
    content: '',
    tags: true,
    style: {
      fg: 'white',
    },
    border: {
      type: 'line',
      fg: 'blue',
    },
    label: ' Relationships ',
    scrollable: true,
    scrollbar: {
      ch: ' ',
      track: {
        bg: 'gray',
      },
      style: {
        inverse: true,
      },
    },
  });

  // Create the comments section
  const comments = blessed.box({
    parent: contentContainer,
    top: 36,
    left: 0,
    right: 0,
    bottom: 0,
    content: '',
    tags: true,
    style: {
      fg: 'white',
    },
    border: {
      type: 'line',
    },
    scrollable: true,
    scrollbar: {
      ch: ' ',
      track: {
        bg: 'gray',
      },
      style: {
        inverse: true,
      },
    },
  });

  // Function to update the detail view with issue data
  function updateDetailView(issue: LinearIssue | null): void {
    if (!issue) {
      title.setContent('No issue selected');
      identifier.setContent('');
      metadata.setContent('');
      description.setContent('');
      labels.setContent('');
      relationships.setContent('');
      comments.setContent('');
      return;
    }

    // Update title
    title.setContent(issue.title);

    // Update identifier
    identifier.setContent(`${issue.identifier}`);

    // Update metadata
    let metadataContent = '';
    metadataContent += `{bold}State:{/bold} ${issue.state.name}\n`;
    metadataContent += `{bold}Priority:{/bold} P${issue.priority}\n`;
    metadataContent += `{bold}Assignee:{/bold} ${issue.assignee ? issue.assignee.name : 'Unassigned'}\n`;
    metadataContent += `{bold}Creator:{/bold} ${issue.creator ? issue.creator.name : 'Unknown'}\n`;
    metadataContent += `{bold}Created:{/bold} ${new Date(issue.createdAt).toLocaleString()}\n`;
    metadataContent += `{bold}Updated:{/bold} ${new Date(issue.updatedAt).toLocaleString()}`;
    metadata.setContent(metadataContent);

    // Update description
    description.setContent(issue.description || 'No description');

    // Update labels
    if (issue.labels && issue.labels.length > 0) {
      const labelText = issue.labels
        .map((label) => `{${label.color}-fg}${label.name}{/}`)
        .join(', ');
      labels.setContent(`{bold}Labels:{/bold} ${labelText}`);
    } else {
      labels.setContent('{bold}Labels:{/bold} None');
    }

    // Update relationships
    let relationshipsContent = '';
    
    // Check for parent
    if (issue.parent) {
      relationshipsContent += `{bold}{green-fg}Parent:{/green-fg}{/bold} ${issue.parent.identifier} - ${issue.parent.title}\n`;
    }

    // Check for children
    if (issue.children && issue.children.length > 0) {
      relationshipsContent += `{bold}{green-fg}Children:{/green-fg}{/bold}\n`;
      issue.children.forEach(child => {
        relationshipsContent += `  • ${child.identifier} - ${child.title}\n`;
      });
    }

    // Check for blocked by
    if (issue.blockedBy && issue.blockedBy.length > 0) {
      relationshipsContent += `{bold}{red-fg}Blocked By:{/red-fg}{/bold}\n`;
      issue.blockedBy.forEach(blocker => {
        relationshipsContent += `  • ${blocker.identifier} - ${blocker.title}\n`;
      });
    }

    // Check for blocking
    if (issue.blocking && issue.blocking.length > 0) {
      relationshipsContent += `{bold}{yellow-fg}Blocking:{/yellow-fg}{/bold}\n`;
      issue.blocking.forEach(blocked => {
        relationshipsContent += `  • ${blocked.identifier} - ${blocked.title}\n`;
      });
    }

    // Check for related
    if (issue.relatedTo && issue.relatedTo.length > 0) {
      relationshipsContent += `{bold}{blue-fg}Related To:{/blue-fg}{/bold}\n`;
      issue.relatedTo.forEach(related => {
        relationshipsContent += `  • ${related.identifier} - ${related.title}\n`;
      });
    }

    if (relationshipsContent) {
      relationships.setContent(relationshipsContent);
    } else {
      relationships.setContent('No relationships found.');
    }

    // Update comments
    if (issue.comments && issue.comments.length > 0) {
      let commentsContent = '{bold}Comments:{/bold}\n\n';
      issue.comments.forEach((comment) => {
        commentsContent += `{bold}${comment.user?.name || 'Unknown'}{/bold} (${new Date(comment.createdAt).toLocaleString()}):\n`;
        commentsContent += `${comment.body}\n\n`;
      });
      comments.setContent(commentsContent);
    } else {
      comments.setContent('{bold}Comments:{/bold} None');
    }

    // Render the screen
    detailBox.screen?.render();
  }

  // Update the detail view when the selected issue changes
  state.events.on('issue-selected', (issueId) => {
    if (issueId) {
      const issue = state.issues.find((i) => i.id === issueId);
      if (issue) {
        updateDetailView(issue);
      }
    }
  });

  // Show/hide the detail view when the view mode changes
  state.events.on('view-mode-changed', (mode) => {
    if (mode === ViewMode.DETAIL) {
      detailBox.show();
    } else {
      detailBox.hide();
    }
    detailBox.screen?.render();
  });

  // Handle escape key to close detail view
  detailBox.key(['escape'], () => {
    state.viewMode = ViewMode.KANBAN;
    state.events.emit('view-mode-changed', ViewMode.KANBAN);
  });
  
  // Add keyboard shortcut to view relationship graph (G)
  detailBox.key(['g'], () => {
    if (state.selectedIssueId) {
      state.viewMode = ViewMode.RELATIONSHIP_GRAPH;
      state.events.emit('view-mode-changed', ViewMode.RELATIONSHIP_GRAPH);
    }
  });

  // Add footer text to show available shortcuts
  const relationshipShortcuts = blessed.text({
    parent: detailBox,
    bottom: 0,
    left: 0,
    right: 0,
    height: 1,
    content: '{bold}Relationships:{/bold} (P)arent, (B)locking, (R)elated, (G)raph',
    tags: true,
    style: {
      fg: 'white',
    },
  });

  // Setup relationship management keyboard shortcuts (implementation omitted for brevity)
}

/**
 * Setup relationship graph visualization
 */
function setupRelationshipGraph(
  graphBox: blessed.Widgets.BoxElement,
  state: KanbanState,
  apiClient: GraphQLClient
): void {
  // Setup relationship graph (implementation omitted for brevity)
  // The basics would involve visualizing issue relationships in a graph structure
}

/**
 * Setup board view with columns for different states
 */
function setupBoard(
  boardBox: blessed.Widgets.BoxElement,
  state: KanbanState
): void {
  // Update when issues, states, or focus changes
  const updateBoard = () => {
    // Clear existing content
    boardBox.children.forEach(child => {
      boardBox.remove(child);
    });

    if (state.workflowStates.length === 0 || state.issues.length === 0) {
      const message = blessed.text({
        parent: boardBox,
        top: 'center',
        left: 'center',
        content: state.workflowStates.length === 0 
          ? 'No workflow states found. Select a team first.'
          : 'No issues found for the current filters.',
        align: 'center',
      });
      boardBox.screen?.render();
      return;
    }

    // Sort states by position
    const sortedStates = [...state.workflowStates].sort((a, b) => a.position - b.position);
    
    // Calculate column width
    const columnWidth = Math.floor(boardBox.width! / sortedStates.length);

    // Create columns
    const columns = sortedStates.map((state, index) => {
      const left = index * columnWidth;

      // Create column header
      const header = blessed.box({
        parent: boardBox,
        top: 0,
        left,
        width: columnWidth,
        height: 3,
        content: `{center}${state.name}{/center}`,
        tags: true,
        style: {
          bg: state.color,
          fg: 'black',
          bold: true,
        },
        border: {
          type: 'line',
        },
      });

      // Create column content
      const column = blessed.box({
        parent: boardBox,
        top: 3,
        left,
        width: columnWidth,
        bottom: 0,
        scrollable: true,
        tags: true,
        border: {
          type: 'line',
        },
        style: {
          scrollbar: {
            bg: 'blue',
          },
        },
        mouse: true,
      });

      // Find issues for this state
      const stateIssues = state.issues.filter(issue => issue.state.id === state.id);
      
      // Create cards for issues
      let cardTop = 0;
      stateIssues.forEach((issue, i) => {
        const isFocused = index === state.focusedColumnIndex && i === state.focusedIssueIndex;
        const card = blessed.box({
          parent: column,
          top: cardTop,
          left: 1,
          width: columnWidth - 4,
          height: 7,
          content: `{bold}${issue.identifier}{/bold}: ${issue.title}`,
          tags: true,
          border: {
            type: 'line',
          },
          style: {
            bg: isFocused ? 'blue' : undefined,
            fg: isFocused ? 'white' : undefined,
            border: {
              fg: PRIORITY_COLORS[issue.priority] || 'white',
            },
          },
        });

        // Add metadata to card
        const meta = blessed.text({
          parent: card,
          top: 1,
          left: 1,
          content: [
            `Assignee: ${issue.assignee?.name || 'Unassigned'}`,
            `Priority: ${PRIORITIES[issue.priority]}`,
            issue.labels.length > 0 ? `Labels: ${issue.labels.map(l => l.name).join(', ')}` : ''
          ].filter(Boolean).join('\n'),
          tags: true,
        });

        // Handle card click
        card.on('click', () => {
          state.selectedIssueId = issue.id;
          state.viewMode = ViewMode.DETAIL;
          state.events.emit('issue-selected', issue.id);
          state.events.emit('view-mode-changed', ViewMode.DETAIL);
        });

        cardTop += 8;
      });

      return { header, column, stateId: state.id };
    });

    boardBox.screen?.render();
  };

  // Update board when data changes
  state.events.on('issues-updated', updateBoard);
  state.events.on('states-updated', updateBoard);
  state.events.on('focused-column-changed', updateBoard);
  state.events.on('focused-issue-changed', updateBoard);

  // Initial render
  updateBoard();
}

/**
 * Setup header with team and filter info
 */
function setupHeader(
  headerBox: blessed.Widgets.BoxElement,
  state: KanbanState
): void {
  const updateHeader = () => {
    const teamInfo = state.selectedTeamId 
      ? `Team: ${state.selectedTeamName || state.selectedTeamId}`
      : 'All Teams';
    
    const assigneeInfo = state.selectedAssigneeId
      ? `Assignee: ${state.users.find(u => u.id === state.selectedAssigneeId)?.name || state.selectedAssigneeId}`
      : 'All Assignees';
    
    const content = ` Linear CLI - ${teamInfo} - ${assigneeInfo}`;
    headerBox.setContent(content);
    headerBox.screen?.render();
  };

  state.events.on('team-selected', updateHeader);
  state.events.on('assignee-selected', updateHeader);

  updateHeader();
}

/**
 * Setup footer with keyboard shortcuts
 */
function setupFooter(
  footerBox: blessed.Widgets.BoxElement,
  state: KanbanState
): void {
  const content = ' {bold}q{/bold}: Quit | {bold}r{/bold}: Refresh | {bold}t{/bold}: Teams | {bold}a{/bold}: Assignees | {bold}↑/↓/←/→{/bold}: Navigate | {bold}Enter{/bold}: Select';
  footerBox.setContent(content);
}

/**
 * Set up key bindings
 */
function setupKeyBindings(
  screen: blessed.Widgets.Screen,
  state: KanbanState,
  apiClient: GraphQLClient
): void {
  // Navigation keys
  screen.key(['up', 'down', 'left', 'right'], (ch, key) => {
    if (state.viewMode !== ViewMode.KANBAN) return;

    if (key.name === 'left') {
      state.focusedColumnIndex = Math.max(0, state.focusedColumnIndex - 1);
      state.events.emit('focused-column-changed', state.focusedColumnIndex);
    } else if (key.name === 'right') {
      state.focusedColumnIndex = Math.min(state.workflowStates.length - 1, state.focusedColumnIndex + 1);
      state.events.emit('focused-column-changed', state.focusedColumnIndex);
    } else if (key.name === 'up') {
      state.focusedIssueIndex = Math.max(0, state.focusedIssueIndex - 1);
      state.events.emit('focused-issue-changed', state.focusedIssueIndex);
    } else if (key.name === 'down') {
      // This is simplified, in reality we would check how many issues are in the column
      state.focusedIssueIndex += 1;
      state.events.emit('focused-issue-changed', state.focusedIssueIndex);
    }
  });

  // Enter key to select an issue
  screen.key(['enter'], () => {
    if (state.viewMode !== ViewMode.KANBAN) return;
    
    // Find the issue at the current focus
    const columnState = state.workflowStates[state.focusedColumnIndex];
    if (!columnState) return;
    
    const columnIssues = state.issues.filter(issue => issue.state.id === columnState.id);
    const selectedIssue = columnIssues[state.focusedIssueIndex];
    
    if (selectedIssue) {
      state.selectedIssueId = selectedIssue.id;
      state.viewMode = ViewMode.DETAIL;
      state.events.emit('issue-selected', selectedIssue.id);
      state.events.emit('view-mode-changed', ViewMode.DETAIL);
    }
  });

  // Quit
  screen.key(['q', 'C-c'], () => {
    screen.destroy();
    process.exit(0);
  });

  // Refresh
  screen.key(['r'], async () => {
    await refreshData(apiClient, state);
  });

  // Team selection
  screen.key(['t'], () => {
    // Team selection would be implemented here
  });

  // Assignee selection
  screen.key(['a'], () => {
    // Assignee selection would be implemented here
  });
}

/**
 * Fetch data from Linear API
 */
async function refreshData(
  apiClient: GraphQLClient,
  state: KanbanState
): Promise<void> {
  try {
    state.isLoading = true;
    state.events.emit('loading-changed', true);

    // Fetch teams
    const teamsData = await apiClient.request(TEAMS_QUERY);
    state.teams = teamsData.teams.nodes;
    state.events.emit('teams-updated', state.teams);

    // Fetch users
    const usersData = await apiClient.request(USERS_QUERY);
    state.users = usersData.users.nodes;
    state.events.emit('users-updated', state.users);

    // Fetch workflow states
    const statesFilter = state.selectedTeamId ? { filter: { team: { id: { eq: state.selectedTeamId } } } } : {};
    const statesData = await apiClient.request(STATES_QUERY, statesFilter);
    state.workflowStates = statesData.workflowStates.nodes;
    state.events.emit('states-updated', state.workflowStates);

    // Fetch issues
    const issuesFilter: any = { first: 100, filter: {} };
    
    if (state.selectedTeamId) {
      issuesFilter.filter.team = { id: { eq: state.selectedTeamId } };
    }
    
    if (state.selectedAssigneeId) {
      issuesFilter.filter.assignee = { id: { eq: state.selectedAssigneeId } };
    }
    
    if (state.startDate) {
      if (!issuesFilter.filter.createdAt) issuesFilter.filter.createdAt = {};
      issuesFilter.filter.createdAt.gte = state.startDate;
    }
    
    if (state.endDate) {
      if (!issuesFilter.filter.createdAt) issuesFilter.filter.createdAt = {};
      issuesFilter.filter.createdAt.lte = state.endDate;
    }
    
    const issuesData = await apiClient.request(ISSUES_QUERY, issuesFilter);
    
    // Transform the issues to include relationships in the format we expect
    const issues: LinearIssue[] = issuesData.issues.nodes.map((issue: any) => {
      // Process relationship fields
      const blocking = issue.blocks?.nodes || [];
      const blockedBy = issue.blockedBy?.nodes || [];
      
      // Process general relations
      const relations = issue.relations?.nodes || [];
      const relatedTo = relations
        .filter((rel: any) => rel.type === 'relates_to')
        .map((rel: any) => rel.relatedIssue);
      
      // Process labels
      const labels = issue.labels?.nodes || [];
      
      // Process comments
      const comments = issue.comments?.nodes || [];
      
      // Process children
      const children = issue.children?.nodes || [];
      
      return {
        ...issue,
        labels,
        children,
        comments,
        blocking,
        blockedBy,
        relatedTo,
      };
    });
    
    state.issues = issues;
    state.events.emit('issues-updated', state.issues);
  } catch (error) {
    console.error('Error refreshing data:', error);
    state.error = error instanceof Error ? error.message : 'Unknown error';
    state.events.emit('error-changed', state.error);
  } finally {
    state.isLoading = false;
    state.events.emit('loading-changed', false);
  }
}

/**
 * Main entry point for the enhanced kanban mode
 */
export async function showEnhancedKanban(options: {
  apiKey: string;
  teamId?: string;
  teamName?: string;
  assigneeId?: string;
  timeframe?: string;
  startDate?: string;
  endDate?: string;
}): Promise<void> {
  console.log(chalk.blue.bold('Starting Enhanced Kanban Mode...'));
  
  try {
    // Setup GraphQL client
    const apiClient = new GraphQLClient('https://api.linear.app/graphql', {
      headers: {
        Authorization: options.apiKey,
      },
    });
    
    // Test connection
    try {
      const result = await apiClient.request(`query { viewer { id name } }`);
      console.log(`Connected as: ${(result as any).viewer.name}`);
    } catch (error) {
      console.error('Failed to connect to Linear API:', error);
      throw new Error('Authentication failed. Check your API key.');
    }
    
    // Initialize state
    const state = initializeState({
      teamId: options.teamId,
      teamName: options.teamName,
      assigneeId: options.assigneeId,
      startDate: options.startDate,
      endDate: options.endDate,
    });
    
    // Setup UI
    const screen = setupScreen();
    const layout = setupLayout(screen);
    
    // Setup components
    setupHeader(layout.header, state);
    setupFooter(layout.footer, state);
    setupBoard(layout.board, state);
    setupDetailView(layout.detailView, state, apiClient);
    setupRelationshipGraph(layout.relationshipGraph, state, apiClient);
    setupKeyBindings(screen, state, apiClient);
    
    // Initial data load
    await refreshData(apiClient, state);
    
    // Show loading indicator for initial load
    state.events.on('loading-changed', (isLoading) => {
      if (isLoading) {
        layout.loading.show();
      } else {
        layout.loading.hide();
      }
      screen.render();
    });
    
    // Handle error display
    state.events.on('error-changed', (error) => {
      if (error) {
        layout.loading.show();
        layout.loading.setContent(`{center}Error: ${error}{/center}`);
        screen.render();
        
        // Hide error after a delay
        setTimeout(() => {
          layout.loading.hide();
          screen.render();
        }, 3000);
      }
    });
    
    // Render screen
    screen.render();
    
    // Return a promise that resolves when the screen is destroyed
    return new Promise<void>((resolve) => {
      screen.on('destroy', () => {
        resolve();
      });
    });
  } catch (error) {
    console.error('Error in enhanced kanban mode:', error);
  }
}