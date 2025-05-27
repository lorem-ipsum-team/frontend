import { useState, useEffect } from 'react';
import axios from 'axios';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const SwipesPage = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { decodeToken } = useAuth();
  const [matches, setMatches] = useState([]);
  const [swipes, setSwipes] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [activeTab, setActiveTab] = useState('matches');
  const [currentMatchIndex, setCurrentMatchIndex] = useState(0);
  const [currentImageIndex, setCurrentImageIndex] = useState(0);

  // Функция для загрузки мэтчей
  const fetchMatches = async () => {
    const authToken = sessionStorage.getItem('authToken');
    if (!authToken) {
      navigate('/login');
      return [];
    }
    try {
      const response = await axios.get(`${process.env.REACT_APP_API_URL}/matches?page=0&limit=10`, {
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${authToken}`,
        },
      });
      const userIds = response.data;
      console.log('Полученные ID мэтчей:', userIds);

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
            tags: tagsData.map((tag) => ({
              id: tag.id,
              user_id: tag.user_id,
              name: tag.value,
            })),
            about_myself: userData.about_myself || '',
          };
        } catch (error) {
          console.error(`Ошибка загрузки данных пользователя ${id}:`, error.message);
          return null;
        }
      });

      const usersData = (await Promise.all(userPromises)).filter((user) => user !== null);
      console.log('Загруженные мэтчи:', usersData);
      return usersData;
    } catch (error) {
      throw error;
    }
  };

  // Функция для загрузки свайпов
  const fetchSwipes = async () => {
    const authToken = sessionStorage.getItem('authToken');
    if (!authToken) {
      navigate('/login');
      return [];
    }
    try {
      const response = await axios.get(`${process.env.REACT_APP_API_URL}/swipes?page=0&limit=10`, {
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${authToken}`,
        },
      });
      const userIds = response.data;
      console.log('Полученные ID свайпов:', userIds);

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
            tags: tagsData.map((tag) => ({
              id: tag.id,
              user_id: tag.user_id,
              name: tag.value,
            })),
            about_myself: userData.about_myself || '',
          };
        } catch (error) {
          console.error(`Ошибка загрузки данных пользователя ${id}:`, error.message);
          return null;
        }
      });

      const usersData = (await Promise.all(userPromises)).filter((user) => user !== null);
      console.log('Загруженные свайпы:', usersData);
      return usersData;
    } catch (error) {
      throw error;
    }
  };

  // Обработка свайпа
  const handleSwipe = async (targetId, like) => {
    const authToken = sessionStorage.getItem('authToken');
    if (!authToken) {
      navigate('/login');
      return;
    }
    try {
      await axios.post(
        `${process.env.REACT_APP_API_URL}/swipes`,
        {
          targetId,
          like,
        },
        {
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${authToken}`,
          },
        }
      );

      setSwipes((prevSwipes) => prevSwipes.filter((user) => user.id !== targetId));
      setCurrentImageIndex(0);

      if (like) {
        const updatedMatches = await fetchMatches();
        setMatches(updatedMatches);
        setCurrentMatchIndex(0);
      }
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

  // Навигация по мэтчам
  const handlePrevMatch = () => {
    setCurrentMatchIndex((prev) => (prev === 0 ? matches.length - 1 : prev - 1));
    setCurrentImageIndex(0);
  };

  const handleNextMatch = () => {
    setCurrentMatchIndex((prev) => (prev === matches.length - 1 ? 0 : prev + 1));
    setCurrentImageIndex(0);
  };

  // Навигация по фото
  const handlePrevImage = () => {
    setCurrentImageIndex((prev) =>
      prev === 0 ? (matches[currentMatchIndex]?.photos?.length - 1 || 0) : prev - 1
    );
  };

  const handleNextImage = () => {
    setCurrentImageIndex((prev) =>
      prev === (matches[currentMatchIndex]?.photos?.length - 1 || 0) ? 0 : prev + 1
    );
  };

  // Навигация по фото для свайпов
  const handlePrevSwipeImage = (userIndex) => {
    setSwipes((prevSwipes) =>
      prevSwipes.map((user, index) =>
        index === userIndex
          ? { ...user, currentImageIndex: user.currentImageIndex === 0 ? (user.photos?.length - 1 || 0) : user.currentImageIndex - 1 }
          : user
      )
    );
  };

  const handleNextSwipeImage = (userIndex) => {
    setSwipes((prevSwipes) =>
      prevSwipes.map((user, index) =>
        index === userIndex
          ? { ...user, currentImageIndex: user.currentImageIndex === (user.photos?.length - 1 || 0) ? 0 : user.currentImageIndex + 1 }
          : user
      )
    );
  };

  // Загрузка данных
  useEffect(() => {
    const authToken = sessionStorage.getItem('authToken');
    if (!authToken) {
      navigate('/login');
      return;
    }
    const userId = decodeToken(authToken);
    if (!userId) {
      console.error('Невалидный токен');
      sessionStorage.removeItem('authToken');
      navigate('/login');
      return;
    }

    const fetchData = async () => {
      try {
        const [matchesData, swipesData] = await Promise.all([fetchMatches(), fetchSwipes()]);
        setMatches(matchesData);
        setSwipes(swipesData.map(user => ({ ...user, currentImageIndex: 0 })));
        setCurrentMatchIndex(0);
        setCurrentImageIndex(0);
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

    if (location.state?.refreshMatches) {
      fetchMatches().then((matchesData) => {
        setMatches(matchesData);
        setCurrentMatchIndex(0);
        setCurrentImageIndex(0);
      });
    }
  }, [navigate, decodeToken, location.state]);

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
          className={`px-4 py-1 rounded-full text-sm font-semibold ${activeTab === 'matches' ? 'bg-black text-white' : 'bg-white text-black border border-black'}`}
        >
          Мэтчи
        </button>
        <button
          onClick={() => setActiveTab('swipes')}
          className={`px-4 py-1 rounded-full text-sm font-semibold ${activeTab === 'swipes' ? 'bg-black text-white' : 'bg-white text-black border border-black'}`}
        >
          Кому я нравлюсь
        </button>
      </div>

      <div className="w-[90%] sm:w-[80%] md:w-[500px] max-w-[500px] mx-auto mt-4">
        {activeTab === 'matches' && (
          matches.length === 0 ? (
            <p className="text-gray-500 text-center">У вас пока нет мэтчей</p>
          ) : (
            <div className="relative w-[90%] sm:w-[80%] md:w-[500px] max-w-[500px] mx-auto">
              <div className="relative overflow-hidden">
                {(() => {
                  const user = matches[currentMatchIndex];
                  const images = user.photos || [];
                  return (
                    <div key={user.id} className="rounded-lg bg-white border border-gray-200 overflow-hidden">
                      {images.length > 0 ? (
                        <div className="relative w-full pt-[100%]">
                          <img
                            src={images[currentImageIndex]?.url}
                            alt={user.name}
                            className="absolute top-0 left-0 w-full h-full object-cover bg-gray-300 rounded-t-lg"
                          />
                          {images.length > 1 && (
                            <>
                              <button
                                onClick={handlePrevImage}
                                className="absolute top-1/2 left-2 transform -translate-y-1/2 bg-black/50 hover:bg-black/70 rounded-full w-10 h-10 flex justify-center items-center z-10"
                              >
                                <svg
                                  xmlns="http://www.w3.org/2000/svg"
                                  className="h-5 w-5 text-white"
                                  fill="none"
                                  viewBox="0 0 24 24"
                                  stroke="currentColor"
                                >
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                                </svg>
                              </button>
                              <button
                                onClick={handleNextImage}
                                className="absolute top-1/2 right-2 transform -translate-y-1/2 bg-black/50 hover:bg-black/70 rounded-full w-10 h-10 flex justify-center items-center z-10"
                              >
                                <svg
                                  xmlns="http://www.w3.org/2000/svg"
                                  className="h-5 w-5 text-white"
                                  fill="none"
                                  viewBox="0 0 24 24"
                                  stroke="currentColor"
                                >
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                                </svg>
                              </button>
                            </>
                          )}
                        </div>
                      ) : (
                        <div className="w-full pt-[100%] bg-gray-300 flex items-center justify-center rounded-t-lg">
                          <span className="text-gray-600 text-sm">Нет фотографий</span>
                        Wrapper for matches navigation buttons
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
                              <span
                                key={tag.id}
                                className="bg-gray-200 rounded-[15px] px-3 py-1 text-gray-600 text-sm"
                              >
                                {tag.name}
                              </span>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })()}
              </div>
              {matches.length > 1 && (
                <>
                  <button
                    onClick={handlePrevMatch}
                    className="fixed top-1/2 left-[calc(50%-350px)] sm:left-[calc(50%-290px)] md:left-[calc(50%-300px)] transform -translate-y-1/2 text-green-600 w-10 h-10 flex items-center justify-center z-20"
                  >
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      className="h-8 w-8"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                    >
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                    </svg>
                  </button>
                  <button
                    onClick={handleNextMatch}
                    className="fixed top-1/2 right-[calc(50%-350px)] sm:right-[calc(50%-290px)] md:right-[calc(50%-300px)] transform -translate-y-1/2 text-green-600 w-10 h-10 flex items-center justify-center z-20"
                  >
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      className="h-8 w-8"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                    >
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                    </svg>
                  </button>
                </>
              )}
              {matches.length > 1 && (
                <div className="flex justify-center mt-4">
                  <span className="text-gray-600 text-sm">
                    {currentMatchIndex + 1} / {matches.length}
                  </span>
                </div>
              )}
            </div>
          )
        )}

        {activeTab === 'swipes' && (
          swipes.length === 0 ? (
            <p className="text-gray-500 text-center">Пока никто не сделал свайп</p>
          ) : (
            swipes.map((user, index) => (
              <div key={user.id} className="rounded-lg bg-white border border-gray-200 overflow-hidden mb-6">
                {user.photos && user.photos.length > 0 ? (
                  <div className="relative w-full pt-[100%]">
                    <img
                      src={user.photos[user.currentImageIndex || 0]?.url}
                      alt={user.name}
                      className="absolute top-0 left-0 w-full h-full object-cover bg-gray-300 rounded-t-lg"
                    />
                    {user.photos.length > 1 && (
                      <>
                        <button
                          onClick={() => handlePrevSwipeImage(index)}
                          className="absolute top-1/2 left-2 transform -translate-y-1/2 bg-black/50 hover:bg-black/70 rounded-full w-10 h-10 flex justify-center items-center z-10"
                        >
                          <svg
                            xmlns="http://www.w3.org/2000/svg"
                            className="h-5 w-5 text-white"
                            fill="none"
                            viewBox="0 0 24 24"
                            stroke="currentColor"
                          >
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                          </svg>
                        </button>
                        <button
                          onClick={() => handleNextSwipeImage(index)}
                          className="absolute top-1/2 right-2 transform -translate-y-1/2 bg-black/50 hover:bg-black/70 rounded-full w-10 h-10 flex justify-center items-center z-10"
                        >
                          <svg
                            xmlns="http://www.w3.org/2000/svg"
                            className="h-5 w-5 text-white"
                            fill="none"
                            viewBox="0 0 24 24"
                            stroke="currentColor"
                          >
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                          </svg>
                        </button>
                      </>
                    )}
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
                        <span
                          key={tag.id}
                          className="bg-gray-200 rounded-[15px] px-3 py-1 text-gray-600 text-sm"
                        >
                          {tag.name}
                        </span>
                      ))}
                    </div>
                  )}
                </div>

                <div className="flex justify-center gap-4 pb-4">
                  <button
                    onClick={() => handleDislike(user.id)}
                    className="border-2 border-red-600 text-red-600 rounded-full w-16 h-16 flex items-center justify-center bg-transparent hover:bg-red-600/10"
                  >
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      className="h-6 w-6"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M6 18L18 6M6 6l12 12"
                      />
                    </svg>
                  </button>
                  <button
                    onClick={() => handleLike(user.id)}
                    className="border-2 border-green-600 text-green-600 rounded-full w-16 h-16 flex items-center justify-center bg-transparent hover:bg-green-600/10"
                  >
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      className="h-6 w-6"
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
