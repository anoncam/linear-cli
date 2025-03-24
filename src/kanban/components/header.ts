/**
 * Header Component
 * 
 * This component sets up the header for the kanban board.
 */

import blessed from 'neo-blessed';
import { KanbanState, ViewMode } from '../state/kanbanState';

/**
 * Set up the header for the kanban board
 */
export function setupHeader(
  headerBox: ReturnType<typeof blessed.box>,
  state: KanbanState
): void {
  // Create the title text
  const title = blessed.text({
    parent: headerBox,
    top: 0,
    left: 0,
    content: ' Linear CLI - Enhanced Kanban ',
    tags: true,
    style: {
      fg: 'white',
      bg: 'blue',
      bold: true,
    },
  });

  // Create the team info text
  const teamInfo = blessed.text({
    parent: headerBox,
    top: 1,
    left: 0,
    content: ' Team: Loading... ',
    tags: true,
    style: {
      fg: 'white',
      bg: 'blue',
    },
  });

  // Create the filter info text
  const filterInfo = blessed.text({
    parent: headerBox,
    top: 1,
    left: 'center',
    content: ' Filter: None ',
    tags: true,
    style: {
      fg: 'white',
      bg: 'blue',
    },
  });

  // Create the help text
  const helpText = blessed.text({
    parent: headerBox,
    top: 1,
    right: 0,
    content: ' ? Help ',
    tags: true,
    style: {
      fg: 'white',
      bg: 'blue',
    },
  });

  // Update the header when the team changes
  state.events.on('team-selected', ({ teamId, teamName }) => {
    teamInfo.setContent(` Team: ${teamName || 'All Teams'} `);
    headerBox.screen.render();
  });

  // Update the header when the assignee changes
  state.events.on('assignee-selected', (assigneeId) => {
    if (assigneeId) {
      const user = state.users.find((u) => u.id === assigneeId);
      filterInfo.setContent(` Filter: Assigned to ${user?.name || assigneeId} `);
    } else {
      filterInfo.setContent(' Filter: None ');
    }
    headerBox.screen.render();
  });

  // Update the header when the view mode changes
  state.events.on('view-mode-changed', (mode) => {
    if (mode === ViewMode.DETAIL) {
      title.setContent(' Linear CLI - Issue Details ');
    } else if (mode === ViewMode.TEAM_SELECT) {
      title.setContent(' Linear CLI - Team Selection ');
    } else if (mode === ViewMode.FILTER) {
      title.setContent(' Linear CLI - Filter Selection ');
    } else if (mode === ViewMode.CREATE) {
      title.setContent(' Linear CLI - Create Issue ');
    } else if (mode === ViewMode.HELP) {
      title.setContent(' Linear CLI - Help ');
    } else {
      title.setContent(' Linear CLI - Enhanced Kanban ');
    }
    headerBox.screen.render();
  });

  // Initial render
  if (state.selectedTeamName) {
    teamInfo.setContent(` Team: ${state.selectedTeamName} `);
  } else if (state.selectedTeamId) {
    teamInfo.setContent(` Team: ${state.selectedTeamId} `);
  } else {
    teamInfo.setContent(' Team: All Teams ');
  }

  if (state.selectedAssigneeId) {
    const user = state.users.find((u) => u.id === state.selectedAssigneeId);
    filterInfo.setContent(` Filter: Assigned to ${user?.name || state.selectedAssigneeId} `);
  }

  headerBox.screen.render();
}