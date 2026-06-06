import axios from 'axios';

const api = axios.create({
    baseURL: import.meta.env.VITE_API_URL,
    headers: {
        // ADD THIS WHEN YOU GET TOKEN
        // 'Authorization': `Bearer ${token}`,
        // 'Content-Type': 'application/json',
        'x-service-secret': import.meta.env.VITE_SERVICE_SECRET,
    },
});

export default api;