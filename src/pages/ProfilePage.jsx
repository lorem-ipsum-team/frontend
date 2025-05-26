import { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import axios from 'axios';

const ProfilePage = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [isLoading, setIsLoading] = useState(true);
  const [user, setUser] = useState(null);
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const [error, setError] = useState(null);

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

  const fetchData = async (userId, token) => {
    const userUrl = `${process.env.REACT_APP_API_URL}/users/${userId}`;

    try {
      const userResponse = await axios.get(userUrl, {
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
      });
      const data = userResponse.data;

      let photosData = [];
      try {
        const photosResponse = await axios.get(`${process.env.REACT_APP_API_URL}/users/${userId}/photos`, {
          headers: {
            'Authorization': `Bearer ${token}`,
          },
        });
        photosData = photosResponse.data || [];
      } catch (photoError) {
        console.warn('Не удалось загрузить фотографии:', photoError.message);
      }

      let tagsData = [];
      try {
        const tagsResponse = await axios.get(`${process.env.REACT_APP_API_URL}/users/${userId}/tags`, {
          headers: {
            'Authorization': `Bearer ${token}`,
          },
        });
        tagsData = tagsResponse.data || [];
      } catch (tagError) {
        console.warn('Не удалось загрузить теги:', tagError.message);
      }

      return {
        ...data,
        photos: photosData,
        tags: tagsData.map(tag => ({
          id: tag.id,
          user_id: tag.user_id,
          name: tag.value,
        })) || [],
      };
    } catch (error) {
      console.error('Ошибка запроса:', error.message);
      return null;
    }
  };

  useEffect(() => {
    const loadData = async () => {
      const token = sessionStorage.getItem('authToken');
      if (!token) {
        setError('Токен отсутствует. Пожалуйста, авторизуйтесь снова.');
        setIsLoading(false);
        return;
      }

      const userId = decodeToken(token);
      if (!userId) {
        setError('Не удалось определить ID пользователя из токена.');
        setIsLoading(false);
        return;
      }

      const { state } = location;
      if (state?.updatedUser) {
        setUser(state.updatedUser);
      } else {
        const serverData = await fetchData(userId, token);
        if (serverData) {
          setUser({
            ...serverData,
            gender: serverData.gender === 'MALE' ? 'М' : serverData.gender === 'FEMALE' ? 'Ж' : serverData.gender || 'М',
            age: serverData.birth_date ? calculateAge(new Date(serverData.birth_date).toLocaleDateString('ru-RU')) : '',
            personality: serverData.jung_result || 'INTP',
            about_myself: serverData.about_myself || '',
          });
        } else {
          const savedData = localStorage.getItem('updatedUser');
          setUser(savedData ? JSON.parse(savedData) : {
            name: '',
            gender: 'М',
            age: '',
            personality: 'INTP',
            about_myself: '',
            photos: [],
            tags: [],
          });
          setError('Не удалось загрузить данные с сервера. Используются сохранённые или дефолтные данные.');
        }
      }
      setIsLoading(false);
    };

    const calculateAge = (birthDate) => {
      if (!birthDate || !/^\d{2}\.\d{2}\.\d{4}$/.test(birthDate)) return '';
      const [day, month, year] = birthDate.split('.').map(Number);
      const birth = new Date(year, month - 1, day);
      const today = new Date();
      let age = today.getFullYear() - birth.getFullYear();
      const monthDiff = today.getMonth() - birth.getMonth();
      if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birth.getDate())) {
        age--;
      }
      return age.toString();
    };

    loadData();

    const handleStorageChange = () => {
      const savedData = localStorage.getItem('updatedUser');
      if (savedData) {
        setUser(JSON.parse(savedData));
      }
    };

    window.addEventListener('storage', handleStorageChange);
    return () => window.removeEventListener('storage', handleStorageChange);
  }, [location]);

  const handleEditToggle = () => {
    console.log('Navigating to edit-profile with user:', user);
    navigate('/edit-profile', { state: { user } });
  };

  const handlePrevImage = () => {
    setCurrentImageIndex((prev) => (prev === 0 ? (user.photos.length - 1) : prev - 1));
  };

  const handleNextImage = () => {
    setCurrentImageIndex((prev) => (prev === user.photos.length - 1 ? 0 : prev + 1));
  };

  const handleLogout = () => {
    sessionStorage.clear();
    navigate('/login');
  };

  if (isLoading || !user) {
    return <div className="min-h-screen bg-white flex items-center justify-center">Загрузка...</div>;
  }

  return (
    <div className="min-h-screen bg-white flex flex-col pb-14">
      <header className="fixed top-0 left-0 right-0 bg-black z-10">
        <div className="flex justify-center px-4 py-2">
          <span className="text-white font-bold text-xl">Мой профиль</span>
        </div>
      </header>

      <div className="mt-10" />

      {error && (
        <div className="w-[90%] max-w-[500px] mx-auto text-red-500 text-sm mb-2">
          {error}
        </div>
      )}

      <div className="relative w-full max-w-[500px] mx-auto">
        <div className="relative w-full pt-[100%] bg-gray-300">
          {user.photos && user.photos.length > 0 ? (
            <>
              <img
                src={user.photos[currentImageIndex]?.url}
                alt="Profile"
                className="absolute top-0 left-0 w-full h-full object-cover"
                
              />
              {user.photos.length > 1 && (
                <>
                  <button
                    onClick={handlePrevImage}
                    className="absolute top-1/2 left-2 transform -translate-y-1/2 bg-black/50 hover:bg-black/70 rounded-full w-10 h-10 flex justify-center items-center"
                  >
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      className="h-5 w-5 text-white"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M15 19l-7-7 7-7"
                      />
                    </svg>
                  </button>
                  <button
                    onClick={handleNextImage}
                    className="absolute top-1/2 right-2 transform -translate-y-1/2 bg-black/50 hover:bg-black/70 rounded-full w-10 h-10 flex justify-center items-center"
                  >
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      className="h-5 w-5 text-white"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M9 5l7 7-7 7"
                      />
                    </svg>
                  </button>
                </>
              )}
            </>
          ) : (
            <div className="absolute top-0 left-0 w-full h-full flex items-center justify-center">
              <span className="text-gray-600 text-sm">Нет фото</span>
            </div>
          )}
        </div>

        <div className="absolute bottom-0 w-full border-b-2 border-black" />

        <button
          onClick={handleEditToggle}
          className="absolute bottom-0 right-[35px] transform translate-y-1/2 bg-green-500 rounded-full w-10 h-10 flex justify-center items-center z-10 border-2 border-black"
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            className="h-5 w-5 text-white"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z"
            />
          </svg>
        </button>
      </div>

      <div className="w-[90%] max-w-[500px] mx-auto flex flex-col gap-2 mt-1">
        <div className="flex flex-col text-left">
          <h2 className="text-[32px] font-bold">{user.name || 'Имя не указано'}</h2>
          <p className="text-[20px] text-gray-600 mt-2">
            {user.gender === 'М' || user.gender === 'MALE' ? 'М' : user.gender === 'Ж' || user.gender === 'FEMALE' ? 'Ж' : 'Пол не указан'},{' '}
            {user.age || 'Возраст не указан'} лет, {user.personality || 'Тип Юнга не указан'}
          </p>
          <p className="text-gray-600 text-sm mt-1">{user.about_myself || 'О себе не указано'}</p>
          {user.tags && user.tags.length > 0 && (
            <div className="flex flex-wrap gap-2 mt-2">
              {user.tags.map(tag => (
                <span
                  key={tag.id}
                  className="bg-gray-200 rounded-[15px] px-3 py-1 text-gray-600 text-sm"
                >
                  {tag.name || tag.value || 'Без названия'}
                </span>
              ))}
            </div>
          )}
          <a href="#" onClick={(e) => { e.preventDefault(); handleLogout(); }} className="text-red-500 underline hover:text-red-700 mt-4 cursor-pointer">
            Выйти
          </a>
        </div>
      </div>
    </div>
  );
};

export default ProfilePage;