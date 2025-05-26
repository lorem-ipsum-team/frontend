import { createContext, useContext, useEffect, useCallback } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';


const AuthContext = createContext();
// Функция декодирования токена (перенесена из CallbackPage)
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

// Функция обновления токена (перенесена из CallbackPage)
const refreshToken = async (refreshToken) => {
  try {
    const refreshUrl = `${process.env.REACT_APP_API_URL}/auth/refresh?refresh_token=${encodeURIComponent(refreshToken)}`;
    const response = await axios.post(refreshUrl, null, {
      headers: { 'Content-Type': 'application/json' },
    });
    const tokens = response.data;
    sessionStorage.setItem('authToken', tokens.access_token);
    sessionStorage.setItem('refreshToken', tokens.refresh_token || '');
    sessionStorage.setItem('tokenExpiresIn', tokens.expires_in || 0);
    sessionStorage.setItem('refreshTokenExpiresIn', tokens.refresh_expires_in || 0);
    return tokens;
  } catch (error) {
    console.error('Ошибка при обновлении токена:', error.message);
    sessionStorage.clear();
    return null;
  }
};

export const AuthProvider = ({ children }) => {
  const navigate = useNavigate();

  // Функция для проверки и обновления токена
  const setupTokenRefresh = useCallback(() => {
    const authToken = sessionStorage.getItem('authToken');
    const refreshTokenValue = sessionStorage.getItem('refreshToken');
    const tokenExpiresIn = parseInt(sessionStorage.getItem('tokenExpiresIn'), 10);

    if (!authToken || !refreshTokenValue || !tokenExpiresIn) {
      console.warn('Токены или время истечения отсутствуют. Перенаправление на логин.');
      sessionStorage.clear();
      navigate('/login');
      return;
    }

    const expiresInMs = tokenExpiresIn * 1000;
    const refreshTime = expiresInMs * 0.75; // Обновляем за 25% до истечения
    const timeUntilRefresh = refreshTime - Date.now();

    const refresh = async () => {
      const newTokens = await refreshToken(refreshTokenValue);
      if (!newTokens) {
        navigate('/login');
        return;
      }
      // Планируем следующее обновление
      const newExpiresIn = newTokens.expires_in * 1000;
      setTimeout(refresh, newExpiresIn * 0.75);
    };

    if (timeUntilRefresh > 0) {
      setTimeout(refresh, timeUntilRefresh);
    } else {
      refresh();
    }
  }, [navigate]);

  // Инициализация при монтировании
  useEffect(() => {
    setupTokenRefresh();
  }, [setupTokenRefresh]);

  // Функция выхода
  const logout = async () => {
    const token = sessionStorage.getItem('authToken');
    const refreshTokenValue = sessionStorage.getItem('refreshToken');

    if (refreshTokenValue) {
      try {
        await axios.post(
          `${process.env.REACT_APP_API_URL}/auth/logout`,
          { refresh_token: refreshTokenValue },
          {
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${token}`,
            },
          }
        );
        console.log('Успешный выход из системы.');
      } catch (error) {
        console.error('Ошибка при выходе:', error.message);
      }
    }

    sessionStorage.clear();
    navigate('/login');
  };

  return (
    <AuthContext.Provider value={{ decodeToken, logout }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);