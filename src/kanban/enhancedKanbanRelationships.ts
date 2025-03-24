/**
 * Enhanced Kanban Relationships Mode
 * 
 * This is the entry point for the relationship visualization feature.
 * It provides a terminal-based UI for visualizing and managing Linear issue relationships.
 */

import blessed from 'neo-blessed';
import { EventEmitter } from 'events';
import { LinearApiService } from './services/linearApiService';
import { setupRelationshipGraph } from './components/relationshipGraph';
import { setupDetailView } from './components/detailView';
import { ViewMode } from './state/kanbanState';

/**
 * Main entry point for the Enhanced Kanban Relationships mode
 */
export async function showEnhancedKanbanRelationships(options: {
  apiKey: string;
  teamId?: string;
  teamName?: string;
  assigneeId?: string;
  startDate?: string;
  endDate?: string;
}): Promise<void> {
  console.log('Starting Enhanced Kanban with Relationship Visualization...');
  
  // Initialize the Linear API service
  const apiService = new LinearApiService(options.apiKey);
  
  // Try to verify connection
  try {
    await apiService.testConnection();
    console.log('Linear API connection established successfully.');
  } catch (error) {
    console.error('Error connecting to Linear API:', error);
    throw new Error('Failed to connect to Linear API. Please check your API key.');
  }
  
  // Create a shared state object for components
  const state: any = {
    issues: [],
    selectedIssueId: null,
    viewMode: ViewMode.RELATIONSHIP_GRAPH,
    events: new EventEmitter(),
    setSelectedIssue: (id: string | null) => {
      state.selectedIssueId = id;
      state.events.emit('issue-selected', id);
    },
    setViewMode: (mode: ViewMode) => {
      state.viewMode = mode;
      state.events.emit('view-mode-changed', mode);
    }
  };
  
  // Load issues from Linear if we have a team ID
  if (options.teamId) {
    try {
      console.log(`Loading issues for team ID: ${options.teamId}...`);
      const result = await apiService.getIssues({
        teams: [options.teamId],
        limit: 100
      });
      
      state.issues = result.issues;
      console.log(`Loaded ${state.issues.length} issues from Linear API.`);
    } catch (error) {
      console.error('Error loading issues:', error);
    }
  } else {
    try {
      // No team specified, load issues from all teams
      console.log('Loading issues from all teams...');
      const result = await apiService.getIssues({
        limit: 100
      });
      
      state.issues = result.issues;
      console.log(`Loaded ${state.issues.length} issues from Linear API.`);
    } catch (error) {
      console.error('Error loading issues:', error);
    }
  }
  
  // Create the screen for our terminal UI
  const screen = blessed.screen({
    smartCSR: true,
    title: 'Linear CLI - Relationship Visualization',
    cursor: {
      artificial: true,
      shape: 'line',
      blink: true,
      color: 'white',
    },
  });
  
  // Create header
  const header = blessed.box({
    top: 0,
    left: 0,
    width: '100%',
    height: 3,
    content: ` {bold}Linear CLI - Relationship Visualization{/bold} | Team: ${options.teamName || 'All Teams'} | Press ? for help`,
    tags: true,
    style: {
      fg: 'white',
      bg: 'blue',
    },
  });
  
  // Create footer
  const footer = blessed.box({
    bottom: 0,
    left: 0,
    width: '100%',
    height: 3,
    content: ' {bold}q{/bold}: Quit | {bold}r{/bold}: Refresh | {bold}d{/bold}: Detail View | {bold}s{/bold}: Select Issue | {bold}g{/bold}: Back to Graph | {bold}←/→{/bold}: Navigate',
    tags: true,
    style: {
      fg: 'white',
      bg: 'blue',
    },
  });
  
  // Main board area
  const board = blessed.box({
    top: 3,
    left: 0,
    right: 0,
    bottom: 3,
  });
  
  // Create issue selection box
  let issueSelector = blessed.list({
    parent: board,
    top: 0,
    left: 0,
    width: '100%',
    height: '100%',
    items: state.issues.map((issue: any) => `${issue.identifier}: ${issue.title}`),
    border: {
      type: 'line',
    },
    style: {
      selected: {
        bg: 'blue',
        fg: 'white',
      },
      border: {
        fg: 'white',
      },
    },
    scrollable: true,
    keys: true,
    vi: true,
    mouse: true,
    label: ' Select an Issue to Visualize Relationships ',
  });
  
  // Create relationship graph (initially hidden)
  const relationshipGraph = blessed.box({
    parent: screen,
    top: 3,
    left: 0,
    right: 0,
    bottom: 3,
    border: {
      type: 'line',
    },
    style: {
      border: {
        fg: 'cyan',
      },
    },
    hidden: true,
  });
  
  // Create detail view (initially hidden)
  const detailView = blessed.box({
    parent: screen,
    top: 3,
    left: 0,
    right: 0,
    bottom: 3,
    border: {
      type: 'line',
    },
    style: {
      border: {
        fg: 'white',
      },
    },
    hidden: true,
  });
  
  // Set up the relationship graph component
  setupRelationshipGraph(relationshipGraph, state, apiService);
  
  // Set up the detail view component
  setupDetailView(detailView, state, apiService);
  
  // List item selection handler
  issueSelector.on('select', (item: any, index: number) => {
    const issue = state.issues[index];
    if (issue) {
      state.setSelectedIssue(issue.id);
      state.setViewMode(ViewMode.RELATIONSHIP_GRAPH);
    }
  });
  
  // Key binding handlers
  screen.key(['escape', 'q', 'C-c'], () => {
    screen.destroy();
    process.exit(0);
  });
  
  screen.key(['s', 'S'], () => {
    issueSelector.show();
    board.show();
    relationshipGraph.hide();
    detailView.hide();
    issueSelector.focus();
    screen.render();
  });
  
  screen.key(['g', 'G'], () => {
    if (state.selectedIssueId) {
      state.setViewMode(ViewMode.RELATIONSHIP_GRAPH);
    } else {
      // Show message to select an issue first
      const message = blessed.message({
        parent: screen,
        border: 'line',
        style: {
          fg: 'white',
          bg: 'red',
          border: {
            fg: 'white'
          },
        },
        width: 'half',
        height: 'shrink',
        top: 'center',
        left: 'center',
      });
      
      message.display('No issue selected. Please select an issue first.', 3);
      issueSelector.focus();
    }
  });
  
  screen.key(['d', 'D'], () => {
    if (state.selectedIssueId) {
      state.setViewMode(ViewMode.DETAIL);
    } else {
      // Show message to select an issue first
      const message = blessed.message({
        parent: screen,
        border: 'line',
        style: {
          fg: 'white',
          bg: 'red',
          border: {
            fg: 'white'
          },
        },
        width: 'half',
        height: 'shrink',
        top: 'center',
        left: 'center',
      });
      
      message.display('No issue selected. Please select an issue first.', 3);
      issueSelector.focus();
    }
  });
  
  screen.key(['r', 'R'], () => {
    // Refresh the issue list
    if (options.teamId) {
      apiService.getIssues({
        teams: [options.teamId],
        limit: 100
      }).then((result) => {
        state.issues = result.issues;
        
        // Recreate the list with new items
        board.remove(issueSelector);
        
        issueSelector = blessed.list({
          parent: board,
          top: 0,
          left: 0,
          width: '100%',
          height: '100%',
          items: state.issues.map((issue: any) => `${issue.identifier}: ${issue.title}`),
          border: {
            type: 'line',
          },
          style: {
            selected: {
              bg: 'blue',
              fg: 'white',
            },
            border: {
              fg: 'white',
            },
          },
          scrollable: true,
          keys: true,
          vi: true,
          mouse: true,
          label: ' Select an Issue to Visualize Relationships ',
        });
        
        // Reattach event handlers
        issueSelector.on('select', (item: any, index: number) => {
          const issue = state.issues[index];
          if (issue) {
            state.setSelectedIssue(issue.id);
            state.setViewMode(ViewMode.RELATIONSHIP_GRAPH);
          }
        });
        
        screen.render();
      }).catch((error) => {
        console.error('Error refreshing issues:', error);
      });
    } else {
      apiService.getIssues({
        limit: 100
      }).then((result) => {
        state.issues = result.issues;
        
        // Recreate the list with new items
        board.remove(issueSelector);
        
        issueSelector = blessed.list({
          parent: board,
          top: 0,
          left: 0,
          width: '100%',
          height: '100%',
          items: state.issues.map((issue: any) => `${issue.identifier}: ${issue.title}`),
          border: {
            type: 'line',
          },
          style: {
            selected: {
              bg: 'blue',
              fg: 'white',
            },
            border: {
              fg: 'white',
            },
          },
          scrollable: true,
          keys: true,
          vi: true,
          mouse: true,
          label: ' Select an Issue to Visualize Relationships ',
        });
        
        // Reattach event handlers
        issueSelector.on('select', (item: any, index: number) => {
          const issue = state.issues[index];
          if (issue) {
            state.setSelectedIssue(issue.id);
            state.setViewMode(ViewMode.RELATIONSHIP_GRAPH);
          }
        });
        
        screen.render();
      }).catch((error) => {
        console.error('Error refreshing issues:', error);
      });
    }
  });
  
  // View mode change event handler
  state.events.on('view-mode-changed', (mode: string) => {
    // Hide all views first
    board.hide();
    relationshipGraph.hide();
    detailView.hide();
    
    // Show the selected view
    switch (mode) {
      case ViewMode.KANBAN:
        board.show();
        issueSelector.focus();
        break;
      case ViewMode.RELATIONSHIP_GRAPH:
        relationshipGraph.show();
        relationshipGraph.focus();
        break;
      case ViewMode.DETAIL:
        detailView.show();
        detailView.focus();
        break;
    }
    
    screen.render();
  });
  
  // Add components to screen
  screen.append(header);
  screen.append(footer);
  screen.append(board);
  board.append(issueSelector);
  
  // Start with the issue selector
  issueSelector.focus();
  
  // Render the screen
  screen.render();
  
  // Return a promise that resolves when the screen is destroyed
  return new Promise<void>((resolve) => {
    screen.on('destroy', () => {
      resolve();
    });
  });
}