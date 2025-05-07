import { getUsageApi } from './GitHubApi';

import organizationMockedResponse from '../assets/organization_response_sample.json';
import enterpriseMockedResponse from '../assets/enterprise_response_sample.json';
import { CopilotMetrics } from '../model/Copilot_Metrics';


export const getMetric = async (
  scopeType: string,
  scopeName: string,
  token: string,
  mockData: boolean,
  from: 'github' | 'repo'
): Promise<CopilotMetrics[]> => {
  if (mockData) {
    console.log("Using mock data. Check VUE_APP_MOCKED_DATA variable.");
    const response = scopeType === "organization" ? organizationMockedResponse : enterpriseMockedResponse;
    return response.map((item: any) => new CopilotMetrics(item));
  } else if (from === 'github') {
    return await getUsageApi(scopeType, scopeName, token);
  } else if (from === 'repo') {
    // Logic to read historical data from the stored repo
    // Assuming we have a function getMetricsFromRepo to handle this logic
    return await getMetricsFromRepo(scopeType, scopeName);
  } else {
    throw new Error("Invalid 'from' parameter. It must be either 'github' or 'repo'.");
  }
};

// Assuming we have a function getMetricsFromRepo to handle the logic of reading historical data from the stored repo
const getMetricsFromRepo = async (scopeType: string, scopeName: string): Promise<CopilotMetrics[]> => {
  // Implement the logic to read historical data from the stored repo
  // For example, reading data from the local file system or a database
  // This is just a sample implementation
  const response = await fetch(`/metrics/${scopeType}/${scopeName}`);
  const data = await response.json();
  return data.map((item: any) => new CopilotMetrics(item));
};