/**
 * State management for the Kanban view
 * 
 * This module provides a centralized state management system for the kanban view,
 * including methods to update the state and notify components of changes.
 */

import { EventEmitter } from 'events';
import { LinearIssue, LinearState, LinearTeam, LinearUser } from '../../types/linear';

/**
 * Represents the current view mode of the kanban board
 */
export enum ViewMode {
  KANBAN = 'kanban',
  DETAIL = 'detail',
  TEAM_SELECT = 'team_select',
  FILTER = 'filter',
  CREATE = 'create',
  HELP = 'help',
  RELATIONSHIP_GRAPH = 'relationship_graph',
}

/**
 * Represents the current filter mode for the kanban board
 */
export enum FilterDimension {
  STATE = 'state',
  ASSIGNEE = 'assignee',
  PRIORITY = 'priority',
  LABEL = 'label',
}

/**
 * Represents the state of the kanban board
 */
export interface KanbanState {
  // Data
  issues: LinearIssue[];
  teams: LinearTeam[];
  workflowStates: LinearState[];
  users: LinearUser[];
  
  // Current selections
  selectedTeamId: string | null;
  selectedTeamName: string | null;
  selectedIssueId: string | null;
  selectedStateId: string | null;
  selectedAssigneeId: string | null;
  
  // View state
  viewMode: ViewMode;
  filterDimension: FilterDimension;
  isLoading: boolean;
  error: string | null;
  
  // Filters
  startDate: string | null;
  endDate: string | null;
  
  // UI state
  focusedColumnIndex: number;
  focusedIssueIndex: number;
  
  // Events
  events: EventEmitter;
  
  // Methods to update state
  setIssues: (issues: LinearIssue[]) => void;
  setTeams: (teams: LinearTeam[]) => void;
  setWorkflowStates: (states: LinearState[]) => void;
  setUsers: (users: LinearUser[]) => void;
  setSelectedTeam: (teamId: string | null, teamName: string | null) => void;
  setSelectedIssue: (issueId: string | null) => void;
  setSelectedState: (stateId: string | null) => void;
  setSelectedAssignee: (assigneeId: string | null) => void;
  setViewMode: (mode: ViewMode) => void;
  setFilterDimension: (dimension: FilterDimension) => void;
  setLoading: (isLoading: boolean) => void;
  setError: (error: string | null) => void;
  setDateRange: (startDate: string | null, endDate: string | null) => void;
  setFocusedColumn: (index: number) => void;
  setFocusedIssue: (index: number) => void;
}

/**
 * Initialize the kanban state with default values
 */
export function initializeState(options: {
  teamId?: string;
  teamName?: string;
  assigneeId?: string;
  startDate?: string;
  endDate?: string;
}): KanbanState {
  const events = new EventEmitter();
  
  // Set max listeners to avoid memory leak warnings
  events.setMaxListeners(100);
  
  const state: KanbanState = {
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
    filterDimension: FilterDimension.STATE,
    isLoading: false,
    error: null,
    
    // Filters
    startDate: options.startDate || null,
    endDate: options.endDate || null,
    
    // UI state
    focusedColumnIndex: 0,
    focusedIssueIndex: 0,
    
    // Events
    events,
    
    // Methods to update state
    setIssues: (issues: LinearIssue[]) => {
      state.issues = issues;
      events.emit('issues-updated', issues);
    },
    
    setTeams: (teams: LinearTeam[]) => {
      state.teams = teams;
      events.emit('teams-updated', teams);
    },
    
    setWorkflowStates: (states: LinearState[]) => {
      state.workflowStates = states;
      events.emit('states-updated', states);
    },
    
    setUsers: (users: LinearUser[]) => {
      state.users = users;
      events.emit('users-updated', users);
    },
    
    setSelectedTeam: (teamId: string | null, teamName: string | null) => {
      state.selectedTeamId = teamId;
      state.selectedTeamName = teamName;
      events.emit('team-selected', { teamId, teamName });
    },
    
    setSelectedIssue: (issueId: string | null) => {
      state.selectedIssueId = issueId;
      events.emit('issue-selected', issueId);
    },
    
    setSelectedState: (stateId: string | null) => {
      state.selectedStateId = stateId;
      events.emit('state-selected', stateId);
    },
    
    setSelectedAssignee: (assigneeId: string | null) => {
      state.selectedAssigneeId = assigneeId;
      events.emit('assignee-selected', assigneeId);
    },
    
    setViewMode: (mode: ViewMode) => {
      state.viewMode = mode;
      events.emit('view-mode-changed', mode);
    },
    
    setFilterDimension: (dimension: FilterDimension) => {
      state.filterDimension = dimension;
      events.emit('filter-dimension-changed', dimension);
    },
    
    setLoading: (isLoading: boolean) => {
      state.isLoading = isLoading;
      events.emit('loading-changed', isLoading);
    },
    
    setError: (error: string | null) => {
      state.error = error;
      events.emit('error-changed', error);
    },
    
    setDateRange: (startDate: string | null, endDate: string | null) => {
      state.startDate = startDate;
      state.endDate = endDate;
      events.emit('date-range-changed', { startDate, endDate });
    },
    
    setFocusedColumn: (index: number) => {
      state.focusedColumnIndex = index;
      events.emit('focused-column-changed', index);
    },
    
    setFocusedIssue: (index: number) => {
      state.focusedIssueIndex = index;
      events.emit('focused-issue-changed', index);
    },
  };
  
  return state;
}