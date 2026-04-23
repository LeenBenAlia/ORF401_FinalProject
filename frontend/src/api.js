import axios from "axios";

const API_BASE_URL = process.env.REACT_APP_API_BASE_URL || '/api/v1/';

const api = axios.create({
  baseURL: API_BASE_URL,
  timeout: 60000,
});

export default api;
