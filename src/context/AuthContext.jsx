import { createContext, useContext, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';

const AuthContext = createContext();

const decodeToken = (token) => {
  try {
    const payload = token.split('.')[1];
    const decodedPayload = atob(payload);
    const parsedPayload = JSON.parse(decodedPayload);
    return parsedPayload.sub || parsedPayload.id || parsedPayload.user_id;
  } catch (error) {
    console.error('Ошибка при декодировании токена:', error.message);
    return null;
  }
};

const refreshToken = async (refreshToken) => {
  const headers = {
    'Content-Type': 'application/json',
  };
  try {
    const refreshUrl = `${process.env.REACT_APP_API_URL}/auth/refresh?refresh_token=${encodeURIComponent(refreshToken)}`;
    const response = await axios.post(refreshUrl, null, { headers });
    const tokens = response.data;
    sessionStorage.setItem('authToken', tokens.access_token);
    sessionStorage.setItem('refreshToken', tokens.refresh_token || '');
    sessionStorage.setItem('tokenExpiresIn', tokens.expires_in || 0);
    sessionStorage.setItem('refreshTokenExpiresIn', tokens.refresh_expires_in || 0);
    return true;
  } catch (error) {
    console.error('Ошибка при обновлении токена:', error.message);
    if (error.response?.status === 401) {
      console.error('Недействительный refresh_token');
    }
    sessionStorage.clear();
    return false;
  }
};

export const AuthProvider = ({ children }) => {
  const navigate = useNavigate();

  useEffect(() => {
    const setupTokenRefresh = () => {
      const authToken = sessionStorage.getItem('authToken');
      const refreshTokenValue = sessionStorage.getItem('refreshToken');
      const tokenExpiresIn = parseInt(sessionStorage.getItem('tokenExpiresIn'), 10);

      if (['/login', '/callback'].includes(window.location.pathname)) {
        console.log('Пропускаем проверку токена для /login или /callback');
        return;
      }

      if (!authToken || !refreshTokenValue || !tokenExpiresIn) {
        console.warn('Отсутствуют токены или данные об их сроке действия.');
        sessionStorage.clear();
        navigate('/login');
        return;
      }

      const refreshInterval = tokenExpiresIn * 1000 * 0.75;
      console.log('Планируем обновление токена через:', refreshInterval / 1000, 'секунд');
      const refreshTimeout = setTimeout(async () => {
        const success = await refreshToken(refreshTokenValue);
        if (!success) {
          navigate('/login');
        }
      }, refreshInterval);

      return () => clearTimeout(refreshTimeout);
    };

    setupTokenRefresh();
  }, [navigate]);

  useEffect(() => {
    const interceptor = axios.interceptors.response.use(
      (response) => response,
      async (error) => {
        if (error.response?.status === 401) {
          const refreshTokenValue = sessionStorage.getItem('refreshToken');
          if (refreshTokenValue) {
            const success = await refreshToken(refreshTokenValue);
            if (success) {
              error.config.headers.Authorization = `Bearer ${sessionStorage.getItem('authToken')}`;
              return axios(error.config);
            }
          }
          sessionStorage.clear();
          navigate('/login');
        }
        return Promise.reject(error);
      }
    );

    return () => axios.interceptors.response.eject(interceptor);
  }, [navigate]);

  return (
    <AuthContext.Provider value={{ decodeToken, refreshToken }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};