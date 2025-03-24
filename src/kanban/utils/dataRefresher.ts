/**
 * Data Refresher Utility
 * 
 * This utility handles fetching data from the Linear API and updating the state.
 */

import { LinearApiService } from '../services/linearApiService';
import { KanbanState } from '../state/kanbanState';

/**
 * Refresh all data from the Linear API
 */
export async function refreshData(apiService: LinearApiService, state: KanbanState): Promise<void> {
  try {
    state.setLoading(true);
    state.setError(null);

    // Fetch teams if not already loaded
    if (state.teams.length === 0) {
      const teams = await apiService.getTeams();
      state.setTeams(teams);
    }

    // Fetch users if not already loaded
    if (state.users.length === 0) {
      const users = await apiService.getUsers();
      state.setUsers(users);
    }

    // Fetch workflow states for the selected team
    if (state.selectedTeamId) {
      const states = await apiService.getWorkflowStates(state.selectedTeamId);
      state.setWorkflowStates(states);
    } else {
      // Fetch all workflow states if no team is selected
      const states = await apiService.getWorkflowStates();
      state.setWorkflowStates(states);
    }

    // Fetch issues
    await refreshIssues(apiService, state);
  } catch (error) {
    console.error('Error refreshing data:', error);
    state.setError(error instanceof Error ? error.message : 'Unknown error occurred');
  } finally {
    state.setLoading(false);
  }
}

/**
 * Refresh issues from the Linear API
 */
export async function refreshIssues(apiService: LinearApiService, state: KanbanState): Promise<void> {
  try {
    state.setLoading(true);
    state.setError(null);

    // Build query parameters
    const params: any = {
      limit: 100,
    };

    // Add team filter if a team is selected
    if (state.selectedTeamId) {
      params.teams = [state.selectedTeamId];
    }

    // Add assignee filter if an assignee is selected
    if (state.selectedAssigneeId) {
      params.assignees = [state.selectedAssigneeId];
    }

    // Add date range if specified
    if (state.startDate) {
      params.startDate = state.startDate;
    }

    if (state.endDate) {
      params.endDate = state.endDate;
    }

    // Fetch issues
    const result = await apiService.getIssues(params);
    state.setIssues(result.issues);

    // If no issues were found, set an error message
    if (result.issues.length === 0) {
      state.setError('No issues found with the current filters');
    }
  } catch (error) {
    console.error('Error refreshing issues:', error);
    state.setError(error instanceof Error ? error.message : 'Unknown error occurred');
  } finally {
    state.setLoading(false);
  }
}

/**
 * Refresh a single issue from the Linear API
 */
export async function refreshIssue(apiService: LinearApiService, state: KanbanState, issueId: string): Promise<void> {
  try {
    // Fetch the issue
    const result = await apiService.getIssues({
      limit: 1,
      // Use a filter to get only this specific issue
      filter: {
        id: {
          eq: issueId,
        },
      },
    } as any);

    if (result.issues.length > 0) {
      // Update the issue in the state
      const updatedIssue = result.issues[0];
      const updatedIssues = state.issues.map(issue => 
        issue.id === updatedIssue.id ? updatedIssue : issue
      );
      state.setIssues(updatedIssues);
    }
  } catch (error) {
    console.error(`Error refreshing issue ${issueId}:`, error);
  }
}

/**
 * Change the selected team and refresh data
 */
export async function changeTeam(apiService: LinearApiService, state: KanbanState, teamId: string): Promise<void> {
  try {
    // Find the team name
    const team = state.teams.find(t => t.id === teamId);
    const teamName = team ? team.name : null;

    // Update the selected team
    state.setSelectedTeam(teamId, teamName);

    // Refresh workflow states for the new team
    const states = await apiService.getWorkflowStates(teamId);
    state.setWorkflowStates(states);

    // Refresh issues for the new team
    await refreshIssues(apiService, state);
  } catch (error) {
    console.error('Error changing team:', error);
    state.setError(error instanceof Error ? error.message : 'Unknown error occurred');
  }
}

/**
 * Change the selected assignee and refresh data
 */
export async function changeAssignee(apiService: LinearApiService, state: KanbanState, assigneeId: string | null): Promise<void> {
  try {
    // Update the selected assignee
    state.setSelectedAssignee(assigneeId);

    // Refresh issues for the new assignee
    await refreshIssues(apiService, state);
  } catch (error) {
    console.error('Error changing assignee:', error);
    state.setError(error instanceof Error ? error.message : 'Unknown error occurred');
  }
}

/**
 * Update an issue's state
 */
export async function updateIssueState(apiService: LinearApiService, state: KanbanState, issueId: string, stateId: string): Promise<void> {
  try {
    state.setLoading(true);

    // Update the issue
    const result = await apiService.updateIssue({
      id: issueId,
      stateId,
    });

    if (result.success) {
      // Update the issue in the state
      const updatedIssue = result.issue;
      const updatedIssues = state.issues.map(issue => 
        issue.id === updatedIssue.id ? updatedIssue : issue
      );
      state.setIssues(updatedIssues);
    }
  } catch (error) {
    console.error('Error updating issue state:', error);
    state.setError(error instanceof Error ? error.message : 'Unknown error occurred');
  } finally {
    state.setLoading(false);
  }
}

/**
 * Update an issue's assignee
 */
export async function updateIssueAssignee(apiService: LinearApiService, state: KanbanState, issueId: string, assigneeId: string | null): Promise<void> {
  try {
    state.setLoading(true);

    // Update the issue
    const result = await apiService.updateIssue({
      id: issueId,
      assigneeId,
    });

    if (result.success) {
      // Update the issue in the state
      const updatedIssue = result.issue;
      const updatedIssues = state.issues.map(issue => 
        issue.id === updatedIssue.id ? updatedIssue : issue
      );
      state.setIssues(updatedIssues);
    }
  } catch (error) {
    console.error('Error updating issue assignee:', error);
    state.setError(error instanceof Error ? error.message : 'Unknown error occurred');
  } finally {
    state.setLoading(false);
  }
}

/**
 * Update an issue's priority
 */
export async function updateIssuePriority(apiService: LinearApiService, state: KanbanState, issueId: string, priority: number): Promise<void> {
  try {
    state.setLoading(true);

    // Update the issue
    const result = await apiService.updateIssue({
      id: issueId,
      priority,
    });

    if (result.success) {
      // Update the issue in the state
      const updatedIssue = result.issue;
      const updatedIssues = state.issues.map(issue => 
        issue.id === updatedIssue.id ? updatedIssue : issue
      );
      state.setIssues(updatedIssues);
    }
  } catch (error) {
    console.error('Error updating issue priority:', error);
    state.setError(error instanceof Error ? error.message : 'Unknown error occurred');
  } finally {
    state.setLoading(false);
  }
}

/**
 * Create a new issue
 */
export async function createIssue(apiService: LinearApiService, state: KanbanState, params: {
  teamId: string;
  title: string;
  description?: string;
  stateId?: string;
  assigneeId?: string;
  priority?: number;
  labelIds?: string[];
  projectId?: string;
}): Promise<void> {
  try {
    state.setLoading(true);

    // Create the issue
    const result = await apiService.createIssue(params);

    if (result.success) {
      // Add the new issue to the state
      state.setIssues([...state.issues, result.issue]);
    }
  } catch (error) {
    console.error('Error creating issue:', error);
    state.setError(error instanceof Error ? error.message : 'Unknown error occurred');
  } finally {
    state.setLoading(false);
  }
}