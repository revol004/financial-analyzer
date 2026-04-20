import axios from 'axios';

const API = axios.create({
  baseURL: process.env.REACT_APP_API_URL || 'http://localhost:8000/api',
});

export const companiesApi = {
  getAll: () => API.get('/companies/'),
  create: (data: any) => API.post('/companies/', data),
  delete: (id: number) => API.delete(`/companies/${id}`),
  update: (id: number, data: any) => API.put(`/companies/${id}`, data),
};

export const financialsApi = {
  getByCompany: (companyId: number, quarter?: number) =>
  API.get(`/financials/${companyId}`, { params: quarter !== undefined ? { quarter } : {} }),
upsert: (data: any) => API.post('/financials/', data),
  import: (companyId: number, file: File) => {
    const formData = new FormData();
    formData.append('file', file);
    return API.post(`/financials/import/${companyId}`, formData);
  },
  deleteVariable: (variableName: string) => API.delete(`/financials/variable/${variableName}`),
};

export const indicatorsApi = {
  getAll: () => API.get('/indicators/'),
  create: (data: any) => API.post('/indicators/', data),
  calculate: (data: any) => API.post('/indicators/calculate', data),
  delete: (id: number) => API.delete(`/indicators/${id}`),

  update: (id: number, data: any) =>
    API.patch(`/indicators/${id}`, data), // 🔥 TO JEST KLUCZ

  createAggregate: (data: any) => API.post('/indicators/'),
};