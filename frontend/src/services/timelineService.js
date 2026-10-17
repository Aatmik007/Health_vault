import api from './api';

/**
 * Fetch chronological medical document timeline with optional filters
 * @param {Object} params { documentType, startDate, endDate }
 */
export const getTimeline = async (params = {}) => {
  const query = new URLSearchParams();
  if (params.documentType && params.documentType !== 'All') {
    query.append('documentType', params.documentType);
  }
  if (params.startDate) {
    query.append('startDate', params.startDate);
  }
  if (params.endDate) {
    query.append('endDate', params.endDate);
  }

  const queryString = query.toString();
  const url = `/timeline${queryString ? `?${queryString}` : ''}`;
  const response = await api.get(url);
  return response.data;
};
