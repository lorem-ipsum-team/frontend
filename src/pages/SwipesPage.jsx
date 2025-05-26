import { useState, useEffect } from 'react';
import axios from 'axios';

const SwipesPage = () => {
  const [matches, setMatches] = useState([]);
  const [swipes, setSwipes] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [activeTab, setActiveTab] = useState('matches'); // 'matches' или 'swipes'

  // Загрузка мэтчей
  const fetchMatches = async () => {
    const authToken = sessionStorage.getItem('authToken');
    try {
      const response = await axios.get(`${process.env.REACT_APP_API_URL}/matches?page=0&limit=4`, {
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${authToken}`,
        },
      });
      const userIds = response.data;

      const userPromises = userIds.map(async (id) => {
        try {
          const userResponse = await axios.get(`${process.env.REACT_APP_API_URL}/users/${id}`, {
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${authToken}`,
            },
          });
          const userData = userResponse.data;

          let photosData = [];
          try {
            const photosResponse = await axios.get(`${process.env.REACT_APP_API_URL}/users/${id}/photos`, {
              headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${authToken}`,
              },
            });
            photosData = photosResponse.data;
          } catch (photoError) {
            console.warn(`Не удалось загрузить фото для пользователя ${id}:`, photoError.message);
          }

          let tagsData = [];
          try {
            const tagsResponse = await axios.get(`${process.env.REACT_APP_API_URL}/users/${id}/tags`, {
              headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${authToken}`,
              },
            });
            tagsData = tagsResponse.data;
          } catch (tagError) {
            console.warn(`Не удалось загрузить теги для пользователя ${id}:`, tagError.message);
          }

          return {
            ...userData,
            photos: photosData,
            tags: tagsData.map(tag => ({
              id: tag.id,
              user_id: tag.user_id,
              name: tag.value,
            })),
          };
        } catch (error) {
          console.error(`Ошибка загрузки данных пользователя ${id}:`, error.message);
          return null;
        }
      });

      const usersData = (await Promise.all(userPromises)).filter(user => user !== null);
      return usersData;
    } catch (error) {
      throw error;
    }
  };

  // Загрузка свайпов
  const fetchSwipes = async () => {
    const authToken = sessionStorage.getItem('authToken');
    try {
      const response = await axios.get(`${process.env.REACT_APP_API_URL}/swipes?page=0&limit=4`, {
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${authToken}`,
        },
      });
      const userIds = response.data;

      const userPromises = userIds.map(async (id) => {
        try {
          const userResponse = await axios.get(`${process.env.REACT_APP_API_URL}/users/${id}`, {
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${authToken}`,
            },
          });
          const userData = userResponse.data;

          let photosData = [];
          try {
            const photosResponse = await axios.get(`${process.env.REACT_APP_API_URL}/users/${id}/photos`, {
              headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${authToken}`,
              },
            });
            photosData = photosResponse.data;
          } catch (photoError) {
            console.warn(`Не удалось загрузить фото для пользователя ${id}:`, photoError.message);
          }

          let tagsData = [];
          try {
            const tagsResponse = await axios.get(`${process.env.REACT_APP_API_URL}/users/${id}/tags`, {
              headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${authToken}`,
              },
            });
            tagsData = tagsResponse.data;
          } catch (tagError) {
            console.warn(`Не удалось загрузить теги для пользователя ${id}:`, tagError.message);
          }

          return {
            ...userData,
            photos: photosData,
            tags: tagsData.map(tag => ({
              id: tag.id,
              user_id: tag.user_id,
              name: tag.value,
            })),
          };
        } catch (error) {
          console.error(`Ошибка загрузки данных пользователя ${id}:`, error.message);
          return null;
        }
      });

      const usersData = (await Promise.all(userPromises)).filter(user => user !== null);
      return usersData;
    } catch (error) {
      throw error;
    }
  };

  // Обработка свайпа (оценка)
  const handleSwipe = async (targetId, like) => {
    const authToken = sessionStorage.getItem('authToken');
    try {
      await axios.post(`${process.env.REACT_APP_API_URL}/swipes`, {
        targetId,
        like,
      }, {
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${authToken}`,
        },
      });

      // Удаляем пользователя из списка свайпов после оценки
      setSwipes(prevSwipes => prevSwipes.filter(user => user.id !== targetId));
    } catch (error) {
      console.error('Ошибка при свайпе:', error.message);
      if (error.response) {
        console.error('Ответ сервера:', error.response.status, error.response.data);
        setError(`Не удалось выполнить свайп: ${error.response.data.message || error.message}`);
      } else if (error.request) {
        console.error('Возможная причина: CORS или сервер недоступен.');
        setError('Не удалось выполнить свайп: проблема с подключением к серверу');
      } else {
        setError(`Не удалось выполнить свайп: ${error.message}`);
      }
    }
  };

  const handleLike = (userId) => {
    handleSwipe(userId, true);
  };

  const handleDislike = (userId) => {
    handleSwipe(userId, false);
  };

  // Загрузка данных при монтировании
  useEffect(() => {
    const fetchData = async () => {
      try {
        const [matchesData, swipesData] = await Promise.all([fetchMatches(), fetchSwipes()]);
        setMatches(matchesData);
        setSwipes(swipesData);
        setError(null);
      } catch (error) {
        console.error('Ошибка загрузки данных:', error.message);
        if (error.response) {
          console.error('Ответ сервера:', error.response.status, error.response.data);
          setError(`Не удалось загрузить данные: ${error.response.data.message || error.message}`);
        } else if (error.request) {
          console.error('Возможная причина: CORS или сервер недоступен.');
          setError('Не удалось загрузить данные: проблема с подключением к серверу');
        } else {
          setError(`Не удалось загрузить данные: ${error.message}`);
        }
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();
  }, []);

  if (isLoading) {
    return <div className="min-h-screen bg-white flex items-center justify-center">Загрузка...</div>;
  }

  if (error) {
    return (
      <div className="min-h-screen bg-white flex flex-col items-center justify-center">
        <p className="text-red-500">{error}</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white flex flex-col pb-14">
      <header className="fixed top-0 left-0 right-0 bg-black z-10">
        <div className="flex justify-center px-0 py-2">
          <span className="text-white font-bold text-xl">Мои связи</span>
        </div>
      </header>

      <div className="mt-14" />

      <div className="flex justify-center gap-4 py-2 w-[90%] sm:w-[80%] md:w-[500px] max-w-[500px] mx-auto">
        <button
          onClick={() => setActiveTab('matches')}
          className={`px-4 py-1 rounded-full text-sm font-semibold ${activeTab === 'matches' ? 'bg-black text-white' : 'bg-white text-black border border-black'
            }`}
        >
          Мэтчи
        </button>
        <button
          onClick={() => setActiveTab('swipes')}
          className={`px-4 py-1 rounded-full text-sm font-semibold ${activeTab === 'swipes' ? 'bg-black text-white' : 'bg-white text-black border border-black'
            }`}
        >
          Кому я нравлюсь
        </button>
      </div>

      <div className="w-[90%] sm:w-[80%] md:w-[500px] max-w-[500px] mx-auto mt-4 space-y-6">
        {activeTab === 'matches' && (
          matches.length === 0 ? (
            <p className="text-gray-500 text-center">У вас пока нет мэтчей</p>
          ) : (
            matches.map((user) => (
              <div key={user.id} className="rounded-lg bg-white border border-gray-200 overflow-hidden">
                {user.photos && user.photos.length > 0 ? (
                  <div className="relative w-full pt-[100%]">
                    <img
                      src={user.photos[0].url}
                      alt={user.name}
                      className="absolute top-0 left-0 w-full h-full object-cover bg-gray-300 rounded-t-lg"
                    />
                  </div>
                ) : (
                  <div className="w-full pt-[100%] bg-gray-300 flex items-center justify-center rounded-t-lg">
                    <span className="text-gray-600 text-sm">Нет фотографий</span>
                  </div>
                )}

                <div className="p-4 sm:p-6">
                  <h2 className="text-lg sm:text-xl font-bold">
                    {user.name}, {user.gender === 'MALE' ? 'М' : user.gender === 'FEMALE' ? 'Ж' : user.gender},{' '}
                    {user.age || '20'} лет, {user.jung_result || 'INTP'}
                  </h2>
                  <p className="text-gray-600 mt-2 text-sm sm:text-base">
                    {user.about_myself || 'Нет описания'}
                  </p>
                  {user.tags && user.tags.length > 0 && (
                    <div className="flex flex-wrap gap-2 mt-2">
                      {user.tags.map((tag) => (
                        <span key={tag.id} className="bg-gray-200 rounded-[15px] px-3 py-1 text-gray-600 text-sm">
                          {tag.name}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            ))
          )
        )}

        {activeTab === 'swipes' && (
          swipes.length === 0 ? (
            <p className="text-gray-500 text-center">Пока никто не сделал свайп</p>
          ) : (
            swipes.map((user) => (
              <div key={user.id} className="rounded-lg bg-white border border-gray-200 overflow-hidden">
                {user.photos && user.photos.length > 0 ? (
                  <div className="relative w-full pt-[100%]">
                    <img
                      src={user.photos[0].url}
                      alt={user.name}
                      className="absolute top-0 left-0 w-full h-full object-cover bg-gray-300 rounded-t-lg"
                    />
                  </div>
                ) : (
                  <div className="w-full pt-[100%] bg-gray-300 flex items-center justify-center rounded-t-lg">
                    <span className="text-gray-600 text-sm">Нет фотографий</span>
                  </div>
                )}

                <div className="p-4 sm:p-6">
                  <h2 className="text-lg sm:text-xl font-bold">
                    {user.name}, {user.gender === 'MALE' ? 'М' : user.gender === 'FEMALE' ? 'Ж' : user.gender},{' '}
                    {user.age || '20'} лет, {user.jung_result || 'INTP'}
                  </h2>
                  <p className="text-gray-600 mt-2 text-sm sm:text-base">
                    {user.about_myself || 'Нет описания'}
                  </p>
                  {user.tags && user.tags.length > 0 && (
                    <div className="flex flex-wrap gap-2 mt-2">
                      {user.tags.map((tag) => (
                        <span key={tag.id} className="bg-gray-200 rounded-[15px] px-3 py-1 text-gray-600 text-sm">
                          {tag.name}
                        </span>
                      ))}
                    </div>
                  )}
                </div>

                <div className="flex justify-center gap-4 pb-4">
                  <button
                    onClick={() => handleDislike(user.id)}
                    className="border-2 border-red-400 text-red-400 rounded-full w-10 h-10 flex justify-center items-center bg-transparent hover:bg-red-400/10"
                  >
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      className="h-5 w-5"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                    >
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                  <button
                    onClick={() => handleLike(user.id)}
                    className="border-2 border-green-400 text-green-400 rounded-full w-10 h-10 flex justify-center items-center bg-transparent hover:bg-green-400/10"
                  >
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      className="h-5 w-5"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z"
                      />
                    </svg>
                  </button>
                </div>
              </div>
            ))
          )
        )}
      </div>
    </div>
  );
};

export default SwipesPage;