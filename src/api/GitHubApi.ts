import organizationMockedResponse from '../assets/organization_response_sample.json';
import enterpriseMockedResponse from '../assets/enterprise_response_sample.json';
import axios from 'axios';
import { CopilotUsage } from '../model/Copilot_Usage'; // Assuming Usage is a class
import { CopilotMetrics } from '../model/Copilot_Metrics';

/**
 * Verifies if the provided credentials have access to GitHub Copilot API
 * @param scopeType The type of scope ('organization' or 'enterprise')
 * @param scopeName The name of the scope
 * @param token The GitHub access token
 * @returns true if access is verified, throws error otherwise
 */
export const verifyApiAccess = async (
  scopeType: string,
  scopeName: string,
  token: string
): Promise<boolean> => {
  // Validate input parameters
  if (!["organization", "enterprise"].includes(scopeType)) {
    throw new Error("Invalid scope type");
  }
  if (!token) {
    throw new Error("Token is required");
  }
  if (!scopeName) {
    throw new Error("Scope name is required");
  }

  // Generate the API URL based on the scope type
  const apiUrl = scopeType === 'organization'
    ? `https://api.github.com/orgs/${scopeName}/copilot/metrics`
    : `https://api.github.com/enterprises/${scopeName}/copilot/metrics`;

  try {
    // Make the API request with HEAD method to check access without retrieving data
    await axios({
      method: 'head',
      url: apiUrl,
      headers: {
        Accept: "application/vnd.github+json",
        Authorization: `Bearer ${token}`,
        "X-GitHub-Api-Version": "2022-11-28",
      },
    });
    
    // If no error is thrown, access is verified
    return true;
  } catch (error) {
    const statusCode = (error as any).response?.status;
    if (statusCode === 404) {
      throw new Error(`Resource not found: ${apiUrl}`);
    } else if (statusCode === 401 || statusCode === 403) {
      throw new Error('Authentication failed: invalid token or insufficient permissions');
    } else {
      throw new Error(`API access verification failed: ${(error as any).message}`);
    }
  }
};
