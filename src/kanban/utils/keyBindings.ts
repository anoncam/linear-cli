/**
 * Key Bindings Utility
 * 
 * This utility sets up keyboard shortcuts for the kanban board.
 */

import { KanbanState, ViewMode, FilterDimension } from '../state/kanbanState';
import { LinearApiService } from '../services/linearApiService';
import { changeTeam, changeAssignee, updateIssueState, updateIssueAssignee, updateIssuePriority, createIssue } from './dataRefresher';

/**
 * Set up key bindings for the kanban board
 */
export function setupKeyBindings(
  screen: any,
  state: KanbanState,
  apiService?: LinearApiService
): void {
  // Navigation keys
  screen.key(['up', 'down', 'left', 'right'], (ch: string, key: any) => {
    if (state.viewMode !== ViewMode.KANBAN) return;

    if (key.name === 'left') {
      // Move to the previous column
      const newIndex = Math.max(0, state.focusedColumnIndex - 1);
      state.setFocusedColumn(newIndex);
    } else if (key.name === 'right') {
      // Move to the next column
      const newIndex = Math.min(state.workflowStates.length - 1, state.focusedColumnIndex + 1);
      state.setFocusedColumn(newIndex);
    } else if (key.name === 'up') {
      // Move to the previous issue
      const newIndex = Math.max(0, state.focusedIssueIndex - 1);
      state.setFocusedIssue(newIndex);
    } else if (key.name === 'down') {
      // Move to the next issue
      const newIndex = state.focusedIssueIndex + 1;
      state.setFocusedIssue(newIndex);
    }
  });

  // Enter key to select an issue
  screen.key(['enter'], () => {
    if (state.viewMode === ViewMode.KANBAN) {
      // Get the selected issue
      const columnState = state.workflowStates[state.focusedColumnIndex];
      if (!columnState) return;

      // Find issues in this column
      const columnIssues = state.issues.filter(issue => issue.state.id === columnState.id);
      const selectedIssue = columnIssues[state.focusedIssueIndex];
      
      if (selectedIssue) {
        state.setSelectedIssue(selectedIssue.id);
        state.setViewMode(ViewMode.DETAIL);
      }
    } else if (state.viewMode === ViewMode.TEAM_SELECT) {
      // Handle team selection
      if (apiService) {
        const selectedTeam = state.teams[state.focusedIssueIndex];
        if (selectedTeam) {
          changeTeam(apiService, state, selectedTeam.id);
          state.setViewMode(ViewMode.KANBAN);
        }
      }
    } else if (state.viewMode === ViewMode.FILTER) {
      // Handle filter selection
      if (apiService) {
        if (state.filterDimension === FilterDimension.ASSIGNEE) {
          const selectedUser = state.users[state.focusedIssueIndex];
          if (selectedUser) {
            changeAssignee(apiService, state, selectedUser.id);
            state.setViewMode(ViewMode.KANBAN);
          }
        }
      }
    }
  });

  // Escape key to go back
  screen.key(['escape'], () => {
    if (state.viewMode === ViewMode.DETAIL) {
      state.setViewMode(ViewMode.KANBAN);
    } else if (state.viewMode === ViewMode.TEAM_SELECT) {
      state.setViewMode(ViewMode.KANBAN);
    } else if (state.viewMode === ViewMode.FILTER) {
      state.setViewMode(ViewMode.KANBAN);
    } else if (state.viewMode === ViewMode.CREATE) {
      state.setViewMode(ViewMode.KANBAN);
    } else if (state.viewMode === ViewMode.HELP) {
      state.setViewMode(ViewMode.KANBAN);
    }
  });

  // T key to open team selection
  screen.key(['t', 'T'], () => {
    if (state.viewMode === ViewMode.KANBAN) {
      state.setViewMode(ViewMode.TEAM_SELECT);
    }
  });

  // F key to open filter selection
  screen.key(['f', 'F'], () => {
    if (state.viewMode === ViewMode.KANBAN) {
      state.setViewMode(ViewMode.FILTER);
    }
  });

  // N key to create a new issue
  screen.key(['n', 'N'], () => {
    if (state.viewMode === ViewMode.KANBAN) {
      state.setViewMode(ViewMode.CREATE);
    }
  });

  // ? key to show help
  screen.key(['?'], () => {
    if (state.viewMode === ViewMode.KANBAN) {
      state.setViewMode(ViewMode.HELP);
    }
  });

  // S key to change state in detail view
  screen.key(['s', 'S'], () => {
    if (state.viewMode === ViewMode.DETAIL && state.selectedIssueId && apiService) {
      // TODO: Implement state change dialog
    }
  });

  // A key to change assignee in detail view
  screen.key(['a', 'A'], () => {
    if (state.viewMode === ViewMode.DETAIL && state.selectedIssueId && apiService) {
      // TODO: Implement assignee change dialog
    }
  });

  // P key to change priority in detail view
  screen.key(['p', 'P'], () => {
    if (state.viewMode === ViewMode.DETAIL && state.selectedIssueId && apiService) {
      // TODO: Implement priority change dialog
    }
  });

  // 1-4 keys to change filter dimension
  screen.key(['1'], () => {
    if (state.viewMode === ViewMode.KANBAN) {
      state.setFilterDimension(FilterDimension.STATE);
    }
  });

  screen.key(['2'], () => {
    if (state.viewMode === ViewMode.KANBAN) {
      state.setFilterDimension(FilterDimension.ASSIGNEE);
    }
  });

  screen.key(['3'], () => {
    if (state.viewMode === ViewMode.KANBAN) {
      state.setFilterDimension(FilterDimension.PRIORITY);
    }
  });

  screen.key(['4'], () => {
    if (state.viewMode === ViewMode.KANBAN) {
      state.setFilterDimension(FilterDimension.LABEL);
    }
  });

  // C key to clear filters
  screen.key(['c', 'C'], () => {
    if (state.viewMode === ViewMode.KANBAN && apiService) {
      state.setSelectedAssignee(null);
      if (apiService) {
        changeAssignee(apiService, state, null);
      }
    }
  });
}