/**
 * API Service - Klient HTTP do komunikacji z backendem
 * 
 * Zawiera:
 * - Axios instance z bazowym URL
 * - Grupy API dla różnych zasobów (companies, financials, indicators)
 * 
 * Użycie:
 * import { indicatorsApi } from '../services/api'
 * await indicatorsApi.calculate({ company_id: 1, ... })
 */
import axios from 'axios';

/**
 * Axios instance z konfigurацją
 * 
 * baseURL: 
 *   - Dev: http://localhost:8000/api
 *   - Prod: z REACT_APP_API_URL (env variable)
 */
const API = axios.create({
  baseURL: process.env.REACT_APP_API_URL || 'http://localhost:8000/api',
});

/**
 * API dla Companies (Spółki)
 * 
 * Operacje CRUD na spółkach
 */
export const companiesApi = {
  // Pobrać listę wszystkich spółek
  getAll: () => API.get('/companies/'),
  // Stworzyć nową spółkę
  create: (data: any) => API.post('/companies/', data),
  // Usunąć spółkę
  delete: (id: number) => API.delete(`/companies/${id}`),
  // Zaktualizować dane spółki
  update: (id: number, data: any) => API.put(`/companies/${id}`, data),
};

/**
 * API dla Financials (Dane Finansowe)
 * 
 * Zarządzanie danymi finansowymi spółek (roczne i kwartalne)
 */
export const financialsApi = {
  // Pobrać dane finansowe dla spółki (quarter: undefined → roczne, quarter: 1-4 → kwartalne)
  getByCompany: (companyId: number, quarter?: number) =>
  API.get(`/financials/${companyId}`, { params: quarter !== undefined ? { quarter } : {} }),
  // Upsert dane finansowe (create or update)
  upsert: (data: any) => API.post('/financials/', data),
  // Import danych z pliku Excel
  import: (companyId: number, file: File) => {
    const formData = new FormData();
    formData.append('file', file);
    return API.post(`/financials/import/${companyId}`, formData);
  },
  // Usunąć zmienną finansową (wszystkie rekordy)
  deleteVariable: (variableName: string) => API.delete(`/financials/variable/${variableName}`),
};

/**
 * API dla Indicators (Wskaźniki Finansowe)
 * 
 * Zarządzanie wskaźnikami, ich obliczeniami i grupami
 */
export const indicatorsApi = {
  // Pobrać wszystkie wskaźniki
  getAll: () => API.get('/indicators/'),
  // Stworzyć nowy wskaźnik
  create: (data: any) => API.post('/indicators/', data),
  // ⭐ KLUCZOWY ENDPOINT: Obliczyć wskaźniki dla spółki
  // Input: { company_id, indicator_ids, years, quarter? }
  // Output: { rok: { wskaźnik: wartość, ... }, ... }
  calculate: (data: any) => API.post('/indicators/calculate', data),
  // Usunąć wskaźnik
  delete: (id: number) => API.delete(`/indicators/${id}`),
  // Zaktualizować wskaźnik
  update: (id: number, data: any) =>
    API.patch(`/indicators/${id}`, data),
  // Stworzyć wskaźnik agregujący
  createAggregate: (data: any) => API.post('/indicators/'),
  // ===== GRUPY WSKAŹNIKÓW =====
  // Pobrać wszystkie grupy wskaźników
  getGroups: () => API.get('/indicators/groups'),
  // Stworzyć nową grupę { name, description?, indicator_ids: [1, 2, 3] }
  createGroup: (data: any) => API.post('/indicators/groups', data),
  // Pobrać konkretną grupę
  getGroup: (id: number) => API.get(`/indicators/groups/${id}`),
  // Zaktualizować grupę
  updateGroup: (id: number, data: any) => API.patch(`/indicators/groups/${id}`, data),
  // Usunąć grupę
  deleteGroup: (id: number) => API.delete(`/indicators/groups/${id}`),
};