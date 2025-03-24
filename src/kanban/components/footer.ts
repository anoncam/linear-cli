/**
 * Footer Component
 * 
 * This component sets up the footer for the kanban board.
 */

import blessed from 'neo-blessed';
import { KanbanState, ViewMode, FilterDimension } from '../state/kanbanState';

/**
 * Set up the footer for the kanban board
 */
export function setupFooter(
  footerBox: ReturnType<typeof blessed.box>,
  state: KanbanState
): void {
  // Create the key bindings text
  const keyBindings = blessed.text({
    parent: footerBox,
    top: 0,
    left: 0,
    content: ' ↑/↓/←/→: Navigate | Enter: Select | T: Teams | F: Filter | N: New | Q: Quit ',
    tags: true,
    style: {
      fg: 'white',
      bg: 'blue',
    },
  });

  // Create the status text
  const statusText = blessed.text({
    parent: footerBox,
    top: 1,
    left: 0,
    content: ' Ready ',
    tags: true,
    style: {
      fg: 'white',
      bg: 'blue',
    },
  });
  
  // Create position indicator text
  const positionText = blessed.text({
    parent: footerBox,
    top: 1,
    left: 'center',
    content: ' ',
    tags: true,
    style: {
      fg: 'white',
      bg: 'blue',
    },
  });

  // Create the version text
  const versionText = blessed.text({
    parent: footerBox,
    top: 1,
    right: 0,
    content: ' v1.0.0 ',
    tags: true,
    style: {
      fg: 'white',
      bg: 'blue',
    },
  });

  // Update the footer when the view mode changes
  state.events.on('view-mode-changed', (mode) => {
    if (mode === ViewMode.DETAIL) {
      keyBindings.setContent(' Esc: Back | E: Edit | A: Assign | S: Change State | P: Priority | Q: Quit ');
    } else if (mode === ViewMode.TEAM_SELECT) {
      keyBindings.setContent(' ↑/↓: Navigate | Enter: Select | Esc: Cancel | Q: Quit ');
    } else if (mode === ViewMode.FILTER) {
      keyBindings.setContent(' ↑/↓: Navigate | Enter: Select | Esc: Cancel | Q: Quit ');
    } else if (mode === ViewMode.CREATE) {
      keyBindings.setContent(' Tab: Next Field | Shift+Tab: Prev Field | Enter: Submit | Esc: Cancel | Q: Quit ');
    } else if (mode === ViewMode.HELP) {
      keyBindings.setContent(' Esc: Back | Q: Quit ');
    } else {
      keyBindings.setContent(' ↑/↓/←/→: Navigate | Enter: Select | T: Teams | F: Filter | N: New | Q: Quit ');
    }
    footerBox.screen.render();
  });

  // Update the footer when loading state changes
  state.events.on('loading-changed', (isLoading) => {
    if (isLoading) {
      statusText.setContent(' Loading... ');
      statusText.style.bg = 'yellow';
      statusText.style.fg = 'black';
    } else {
      statusText.setContent(' Ready ');
      statusText.style.bg = 'blue';
      statusText.style.fg = 'white';
    }
    footerBox.screen.render();
  });

  // Update the footer when error state changes
  state.events.on('error-changed', (error) => {
    if (error) {
      statusText.setContent(` Error: ${error} `);
      statusText.style.bg = 'red';
      statusText.style.fg = 'white';
    } else {
      statusText.setContent(' Ready ');
      statusText.style.bg = 'blue';
      statusText.style.fg = 'white';
    }
    footerBox.screen.render();
  });

  // Helper function to update position indicator
  const updatePositionIndicator = () => {
    if (state.viewMode !== ViewMode.KANBAN) {
      positionText.setContent('');
      return;
    }
    
    let info = '';
    
    // Display position based on filter dimension
    if (state.filterDimension === FilterDimension.STATE) {
      const stateIndex = state.focusedColumnIndex;
      const stateName = state.workflowStates[stateIndex]?.name || 'Unknown';
      const stateCount = state.workflowStates.length;
      
      info = `Column: ${stateIndex + 1}/${stateCount} (${stateName})`;
      
      // Get issues for this state
      const stateIssues = state.issues.filter(i => 
        i.state.id === state.workflowStates[stateIndex]?.id);
      const issueCount = stateIssues.length;
      
      if (issueCount > 0) {
        info += ` | Issue: ${state.focusedIssueIndex + 1}/${issueCount}`;
      }
    } else if (state.filterDimension === FilterDimension.ASSIGNEE) {
      const userIndex = state.focusedColumnIndex;
      const userCount = state.users.length;
      const userName = state.users[userIndex]?.name || 'Unassigned';
      
      info = `Assignee: ${userName} (${userIndex + 1}/${userCount})`;
    } else if (state.filterDimension === FilterDimension.PRIORITY) {
      const priorities = ['Urgent', 'High', 'Medium', 'Low', 'No Priority'];
      const priorityIndex = state.focusedColumnIndex;
      const priorityName = priorities[priorityIndex] || 'Unknown';
      
      info = `Priority: ${priorityName} (${priorityIndex + 1}/5)`;
    } else if (state.filterDimension === FilterDimension.LABEL) {
      // For labels, we'd need to get the actual label information
      info = `Label Group: ${state.focusedColumnIndex + 1}`;
    }
    
    positionText.setContent(` ${info} `);
  };
  
  // Update position on column change
  state.events.on('focused-column-changed', () => {
    updatePositionIndicator();
    footerBox.screen.render();
  });
  
  // Update position on issue change
  state.events.on('focused-issue-changed', () => {
    updatePositionIndicator();
    footerBox.screen.render();
  });
  
  // Update position on filter dimension change
  state.events.on('filter-dimension-changed', () => {
    updatePositionIndicator();
    footerBox.screen.render();
  });
  
  // Update position on view mode change
  state.events.on('view-mode-changed', () => {
    updatePositionIndicator();
  });
  
  // Update position on issues updated
  state.events.on('issues-updated', () => {
    updatePositionIndicator();
    footerBox.screen.render();
  });
  
  // Initial position update
  updatePositionIndicator();
  
  // Initial render
  footerBox.screen.render();
}