import axios from "axios"

const API = axios.create({
  baseURL: "http://localhost:5000/api",
});

API.interceptors.request.use((config) => {
  const token = localStorage.getItem("token");

  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }

  return config;
});

export const createTask = (task) => API.post("/tasks", task);

export const updateTask = (id, task) => {
  return API.put(`/tasks/${id}`, task);
};
export const getTasks = () => API.get("/tasks");