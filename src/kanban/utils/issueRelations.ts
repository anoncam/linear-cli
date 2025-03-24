/**
 * Issue Relations Utility
 * 
 * This utility handles creating, updating, and managing issue relationships.
 */

import { LinearApiService } from "../services/linearApiService";
import { KanbanState } from "../state/kanbanState";
import { LinearIssue, IssueRelationType } from "../../types/linear";
import { refreshIssue } from "./dataRefresher";

/**
 * Convert an issue identifier to an issue ID
 */
export async function getIssueIdFromIdentifier(
  apiService: LinearApiService,
  identifier: string
): Promise<string | null> {
  try {
    // Search for the issue by identifier
    const result = await apiService.getIssues({
      filter: {
        identifier: {
          eq: identifier
        }
      }
    } as any);

    if (result.issues.length > 0) {
      return result.issues[0].id;
    }
    
    return null;
  } catch (error) {
    console.error(`Error getting issue ID from identifier ${identifier}:`, error);
    return null;
  }
}

/**
 * Set parent relationship between issues
 */
export async function setParentRelation(
  apiService: LinearApiService,
  state: KanbanState,
  issueId: string,
  parentIdentifier: string
): Promise<boolean> {
  try {
    state.setLoading(true);
    
    // Get the parent issue ID from the identifier
    const parentId = await getIssueIdFromIdentifier(apiService, parentIdentifier);
    
    if (!parentId) {
      throw new Error(`Could not find issue with identifier ${parentIdentifier}`);
    }
    
    // Set the parent relationship
    const result = await apiService.setParentIssue({
      issueId,
      parentId
    });
    
    if (result.success) {
      // Refresh the issue to get updated data
      await refreshIssue(apiService, state, issueId);
      return true;
    }
    
    return false;
  } catch (error) {
    console.error(`Error setting parent relation for issue ${issueId}:`, error);
    state.setError(error instanceof Error ? error.message : 'Unknown error setting parent relation');
    return false;
  } finally {
    state.setLoading(false);
  }
}

/**
 * Create a blocking relationship between issues
 */
export async function createBlockingRelation(
  apiService: LinearApiService,
  state: KanbanState,
  issueId: string,
  blockedIdentifier: string
): Promise<boolean> {
  try {
    state.setLoading(true);
    
    // Get the blocked issue ID from the identifier
    const blockedId = await getIssueIdFromIdentifier(apiService, blockedIdentifier);
    
    if (!blockedId) {
      throw new Error(`Could not find issue with identifier ${blockedIdentifier}`);
    }
    
    // Create the blocking relationship
    const result = await apiService.createIssueRelation({
      issueId: issueId,
      relatedIssueId: blockedId,
      type: IssueRelationType.BLOCKS
    });
    
    if (result.success) {
      // Refresh the issue to get updated data
      await refreshIssue(apiService, state, issueId);
      return true;
    }
    
    return false;
  } catch (error) {
    console.error(`Error creating blocking relation for issue ${issueId}:`, error);
    state.setError(error instanceof Error ? error.message : 'Unknown error creating blocking relation');
    return false;
  } finally {
    state.setLoading(false);
  }
}

/**
 * Create a related relationship between issues
 */
export async function createRelatedRelation(
  apiService: LinearApiService,
  state: KanbanState,
  issueId: string,
  relatedIdentifier: string
): Promise<boolean> {
  try {
    state.setLoading(true);
    
    // Get the related issue ID from the identifier
    const relatedId = await getIssueIdFromIdentifier(apiService, relatedIdentifier);
    
    if (!relatedId) {
      throw new Error(`Could not find issue with identifier ${relatedIdentifier}`);
    }
    
    // Create the related relationship
    const result = await apiService.createIssueRelation({
      issueId: issueId,
      relatedIssueId: relatedId,
      type: IssueRelationType.RELATED
    });
    
    if (result.success) {
      // Refresh the issue to get updated data
      await refreshIssue(apiService, state, issueId);
      return true;
    }
    
    return false;
  } catch (error) {
    console.error(`Error creating related relation for issue ${issueId}:`, error);
    state.setError(error instanceof Error ? error.message : 'Unknown error creating related relation');
    return false;
  } finally {
    state.setLoading(false);
  }
}

/**
 * Delete a relationship between issues
 */
export async function deleteRelation(
  apiService: LinearApiService,
  state: KanbanState,
  issueId: string,
  relationId: string
): Promise<boolean> {
  try {
    state.setLoading(true);
    
    // Delete the relationship
    const result = await apiService.deleteIssueRelation(relationId);
    
    if (result.success) {
      // Refresh the issue to get updated data
      await refreshIssue(apiService, state, issueId);
      return true;
    }
    
    return false;
  } catch (error) {
    console.error(`Error deleting relation ${relationId} for issue ${issueId}:`, error);
    state.setError(error instanceof Error ? error.message : 'Unknown error deleting relation');
    return false;
  } finally {
    state.setLoading(false);
  }
}