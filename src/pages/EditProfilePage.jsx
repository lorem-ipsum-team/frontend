import { useState, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import axios from 'axios';

// Функция для декодирования JWT-токена и получения user_id
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

// Функция для получения данных пользователя
async function fetchData(userId) {
  const token = sessionStorage.getItem('authToken');
  if (!token) {
    throw new Error('Токен отсутствует. Пожалуйста, авторизуйтесь снова.');
  }
  try {
    const userResponse = await axios.get(`${process.env.REACT_APP_API_URL}/users/${userId}`, {
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
    });
    const data = userResponse.data;
    const photos = data.photos || [];
    const tags = data.tags || [];
    const primaryPhotoUrl = data.primary_photo;

    const formattedPhotos = photos.map(photo => ({
      id: photo.id,
      url: photo.url,
    }));

    const primaryPhotoId = formattedPhotos.find(photo => photo.url === primaryPhotoUrl)?.id || null;

    return {
      ...data,
      primary_photo: primaryPhotoUrl,
      primaryPhotoId,
      photos: formattedPhotos,
      tags: tags.map(tag => ({ id: tag.id, user_id: tag.user_id, name: tag.value })),
    };
  } catch (error) {
    console.error('Ошибка запроса:', error.message);
    if (error.response?.status === 404) {
      throw new Error('Ресурс не найден (404). Проверьте URL или эндпоинт.');
    }
    throw error;
  }
}

const EditProfilePage = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const [newTag, setNewTag] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [formData, setFormData] = useState({
    name: '',
    gender: 'М',
    birthDate: '',
    description: '',
    personality: 'INTP',
    createdAt: '',
    age: '',
    photos: [],
    about_myself: '',
    surname: '',
    tags: [],
    primaryPhotoId: null,
  });
  const [age, setAge] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState(null);
  const [userId, setUserId] = useState(null);
  const [geoData, setGeoData] = useState(null);
  const [geoError, setGeoError] = useState(null);

  useEffect(() => {
    const token = sessionStorage.getItem('authToken');
    if (!token) {
      setError('Токен отсутствует. Пожалуйста, авторизуйтесь снова.');
      setIsLoading(false);
      navigate('/login');
      return;
    }

    const id = decodeToken(token);
    if (!id) {
      setError('Не удалось определить ID пользователя из токена.');
      setIsLoading(false);
      navigate('/login');
      return;
    }
    setUserId(id);
  }, [navigate]);

  const calculateAge = (birthDate) => {
    if (!birthDate || !/^\d{2}\.\d{2}\.\d{4}$/.test(birthDate)) return '';
    const [day, month, year] = birthDate.split('.').map(Number);
    const birth = new Date(year, month - 1, day);
    if (isNaN(birth.getTime()) || birth.getFullYear() !== year || birth.getMonth() !== month - 1 || birth.getDate() !== day) {
      return '';
    }
    const today = new Date();
    let age = today.getFullYear() - birth.getFullYear();
    const monthDiff = today.getMonth() - birth.getMonth();
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birth.getDate())) age--;
    return age.toString();
  };

  const formatDateToISO = (dateString) => {
    if (!dateString || !/^\d{2}\.\d{2}\.\d{4}$/.test(dateString)) return null;
    const [day, month, year] = dateString.split('.');
    return `${year}-${month}-${day}T00:00:00Z`;
  };

  const uploadPhoto = async (file) => {
    const token = sessionStorage.getItem('authToken');
    if (!token) {
      navigate('/login');
      return null;
    }

    const formData = new FormData();
    formData.append('photo', file);

    try {
      const response = await axios.post(`${process.env.REACT_APP_API_URL}/users/${userId}/addphoto`, formData, {
        headers: { 'Authorization': `Bearer ${token}` },
        timeout: 5000,
      });
      if (!response.data.url) {
        throw new Error('URL фотографии не вернулся с сервера.');
      }
      return { id: response.data.id, url: response.data.url };
    } catch (error) {
      console.error('Ошибка при загрузке фото:', error.message);
      if (error.response) {
        if (error.response.status === 404) alert('Ресурс не найден (404).');
        else if (error.response.status === 403) alert('Доступ запрещён (403).');
        else alert(`Не удалось загрузить фото: ${error.response.data.message || error.message}`);
      } else {
        alert('Не удалось загрузить фото: проблема с подключением.');
      }
      return null;
    }
  };

  const handleAddTag = async () => {
    const trimmedTag = newTag.trim();
    if (!trimmedTag || trimmedTag.length > 50 || !/^[a-zA-Zа-яА-Я0-9\s]+$/.test(trimmedTag)) {
      alert('Тег невалиден (пустой, длиннее 50 символов или содержит запрещённые символы)');
      return;
    }

    const token = sessionStorage.getItem('authToken');
    if (!token) {
      navigate('/login');
      return;
    }

    try {
      const response = await axios.put(`${process.env.REACT_APP_API_URL}/users/${userId}/tag`, { tag: trimmedTag }, {
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        timeout: 5000,
      });
      const addedTag = response.data;
      setFormData(prev => ({
        ...prev,
        tags: [...prev.tags, { id: addedTag.id, user_id: addedTag.user_id, name: addedTag.value }],
      }));
      setNewTag('');
    } catch (error) {
      console.error('Ошибка при добавлении тега:', error.message);
      if (error.response) {
        if (error.response.status === 404) alert('Ресурс не найден (404).');
        else if (error.response.status === 403) alert('Доступ запрещён (403).');
        else alert(`Не удалось добавить тег: ${error.response.data.message || error.message}`);
      } else {
        alert('Не удалось добавить тег: проблема с подключением.');
      }
    }
  };

  const handleRemoveTag = async (tagId) => {
    const token = sessionStorage.getItem('authToken');
    if (!token) {
      navigate('/login');
      return;
    }

    try {
      await axios.delete(`${process.env.REACT_APP_API_URL}/users/${userId}/tags/${tagId}`, {
        headers: { 'Authorization': `Bearer ${token}` },
        timeout: 5000,
      });
      setFormData(prev => ({
        ...prev,
        tags: prev.tags.filter(tag => tag.id !== tagId),
      }));
    } catch (error) {
      console.error('Ошибка при удалении тега:', error.message);
      if (error.response) {
        if (error.response.status === 404) alert('Ресурс не найден (404).');
        else if (error.response.status === 403) alert('Доступ запрещён (403).');
        else alert(`Не удалось удалить тег: ${error.response.data.message || error.message}`);
      } else {
        alert('Не удалось удалить тег: проблема с подключением.');
      }
    }
  };

  const handlePrevImage = () => setCurrentImageIndex(prev => (prev === 0 ? formData.photos.length - 1 : prev - 1));
  const handleNextImage = () => setCurrentImageIndex(prev => (prev === formData.photos.length - 1 ? 0 : prev + 1));

  const handleSetPrimaryPhoto = async () => {
    if (!formData.photos.length) {
      alert('Нет фотографий для назначения основной.');
      return;
    }
    const photoId = formData.photos[currentImageIndex].id;
    const token = sessionStorage.getItem('authToken');
    if (!token) {
      navigate('/login');
      return;
    }

    try {
      await axios.patch(
        `${process.env.REACT_APP_API_URL}/users/${userId}/primary_photo`,
        { id: photoId },
        { headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` }, timeout: 5000 }
      );
      setFormData(prev => ({ ...prev, primaryPhotoId: photoId }));
      alert('Основная фотография успешно назначена!');
    } catch (error) {
      console.error('Ошибка при назначении основной фотографии:', error.message);
      if (error.response) {
        if (error.response.status === 404) alert('Фотография или пользователь не найдены (404).');
        else if (error.response.status === 403) alert('Доступ запрещён (403).');
        else alert(`Не удалось назначить основную фотографию: ${error.response.data.message || error.message}`);
      } else {
        alert('Не удалось назначить основную фотографию: проблема с подключением.');
      }
    }
  };

  useEffect(() => {
    if (!userId) return;
    const loadData = async () => {
      try {
        const userData = await fetchData(userId);
        if (userData) {
          const formattedData = {
            name: userData.name || '',
            surname: userData.surname || '',
            gender: userData.gender === 'MALE' ? 'М' : 'Ж',
            birthDate: userData.birth_date ? new Date(userData.birth_date).toLocaleDateString('ru-RU') : '',
            description: userData.about_myself || '',
            personality: userData.jung_result || 'INTP',
            createdAt: userData.created_at ? new Date(userData.created_at).toLocaleDateString('ru-RU') : '04.04.25',
            age: userData.birth_date ? calculateAge(new Date(userData.birth_date).toLocaleDateString('ru-RU')) : '',
            photos: userData.photos || [],
            about_myself: userData.about_myself || '',
            tags: userData.tags || [],
            primaryPhotoId: userData.primaryPhotoId || null,
          };
          setFormData(formattedData);
          setAge(formattedData.age);
          const primaryIndex = formattedData.photos.findIndex(photo => photo.id === formattedData.primaryPhotoId);
          if (primaryIndex !== -1) setCurrentImageIndex(primaryIndex);
        } else {
          setError('Не удалось загрузить данные с сервера.');
        }
      } catch (error) {
        setError(error.message);
      }
      setIsLoading(false);
    };
    loadData();
  }, [userId]);

  useEffect(() => setAge(calculateAge(formData.birthDate)), [formData.birthDate]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    if (name === 'birthDate') {
      if (value && !/^\d{2}\.\d{2}\.\d{4}$/.test(value)) {
        setError('Дата рождения должна быть в формате ДД.ММ.ГГГГ');
        return;
      }
      const [day, month, year] = value.split('.').map(Number);
      const date = new Date(year, month - 1, day);
      if (isNaN(date.getTime()) || date.getFullYear() !== year || date.getMonth() !== month - 1 || date.getDate() !== day) {
        setError('Некорректная дата рождения');
        return;
      }
      setError(null);
    }
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handlePhotoChange = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const uploadedPhoto = await uploadPhoto(file);
    if (uploadedPhoto) {
      setFormData(prev => ({ ...prev, photos: [...prev.photos, uploadedPhoto] }));
      setCurrentImageIndex(formData.photos.length);
    }
  };

  const handleRemovePhoto = async () => {
    if (!formData.photos.length) return;
    const token = sessionStorage.getItem('authToken');
    if (!token) {
      navigate('/login');
      return;
    }
    const photoId = formData.photos[currentImageIndex].id;
    try {
      await axios.delete(`${process.env.REACT_APP_API_URL}/users/${userId}/photos/${photoId}`, {
        headers: { 'Authorization': `Bearer ${token}` },
        timeout: 5000,
      });
      setFormData(prev => {
        const newPhotos = prev.photos.filter((_, i) => i !== currentImageIndex);
        const newPrimaryPhotoId = prev.primaryPhotoId === photoId ? (newPhotos.length > 0 ? newPhotos[0].id : null) : prev.primaryPhotoId;
        return { ...prev, photos: newPhotos, primaryPhotoId: newPrimaryPhotoId };
      });
      setCurrentImageIndex(prev => (prev >= formData.photos.length - 1 && prev > 0 ? prev - 1 : 0));
    } catch (error) {
      console.error('Ошибка при удалении фото:', error.message);
      if (error.response) {
        if (error.response.status === 404) alert('Фотография не найдена (404).');
        else if (error.response.status === 403) alert('Доступ запрещён (403).');
        else alert(`Не удалось удалить фото: ${error.response.data.message || error.message}`);
      } else {
        alert('Не удалось удалить фото: проблема с подключением.');
      }
    }
  };

  const handleShareGeo = () => {
    setGeoError(null);
    setGeoData(null);
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          const { latitude, longitude } = position.coords;
          setGeoData({ latitude, longitude });
          console.log('Геолокация успешно получена:', { latitude, longitude });
        },
        (error) => {
          const errorMessage = `Не удалось получить геолокацию: ${error.message}`;
          setGeoError(errorMessage);
          console.error(errorMessage, error); // Логируем ошибку в консоль
        },
        { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
      );
    } else {
      const errorMessage = 'Геолокация не поддерживается вашим устройством.';
      setGeoError(errorMessage);
      console.error(errorMessage); // Логируем ошибку в консоль
    }
  };

  const handleSave = async (e) => {
    e.stopPropagation();
    e.preventDefault();
    setIsSaving(true);
    const token = sessionStorage.getItem('authToken');
    if (!token) {
      navigate('/login');
      setIsSaving(false);
      return;
    }

    try {
      if (geoData) {
        try {
          await axios.post(
            `${process.env.REACT_APP_API_URL}/geo`,
            geoData,
            {
              headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
            }
          );
          console.log('Геолокация успешно отправлена:', geoData);
        } catch (geoError) {
          console.error('Ошибка при отправке геолокации:', geoError.message);
          alert('Не удалось отправить геолокацию, но профиль будет сохранен.');
        }
      }

      const updatedAge = calculateAge(formData.birthDate);
      const apiData = {
        name: formData.name,
        surname: formData.surname,
        gender: formData.gender === 'М' ? 'MALE' : 'FEMALE',
        birth_date: formatDateToISO(formData.birthDate),
        about_myself: formData.description, // Убедимся, что отправляем description как about_myself
        jung_result: formData.personality,
        jung_last_attempt: new Date().toISOString(),
      };

      console.log('Отправляем данные на сервер:', apiData); // Логирование для отладки

      const response = await axios.patch(
        `${process.env.REACT_APP_API_URL}/users/${userId}/profile`,
        apiData,
        {
          headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        }
      );

      console.log('Ответ сервера после PATCH:', response.data); // Логирование ответа сервера

      const updatedData = {
        ...formData,
        age: updatedAge !== '' ? updatedAge : formData.age,
        about_myself: formData.description, // Явно задаем about_myself
      };

      console.log('Сохраняем в sessionStorage:', updatedData); // Логирование данных в sessionStorage

      sessionStorage.setItem('updatedUser', JSON.stringify(updatedData));
      navigate('/profile', { state: { updatedUser: updatedData } });
    } catch (error) {
      console.error('Ошибка при сохранении:', error.message);
      if (error.response) {
        if (error.response.status === 404) alert('Ресурс не найден (404).');
        else if (error.response.status === 403) alert('Доступ запрещён (403).');
        else alert(`Не удалось сохранить изменения: ${error.response.data.message || error.message}`);
      } else {
        alert('Не удалось сохранить изменения: проблема с подключением.');
      }
    } finally {
      setIsSaving(false);
    }
  };

  const handleTestRedirect = () => window.location.href = 'https://www.16personalities.com/ru/test-lichnosti';
  const personalityTypes = ['INTP', 'INTJ', 'ENTP', 'ENTJ', 'INFJ', 'INFP', 'ENFJ', 'ENFP', 'ISTJ', 'ISFJ', 'ESTJ', 'ESFJ', 'ISTP', 'ISFP', 'ESTP', 'ESFP'];

  if (isLoading) return <div className="min-h-screen bg-white flex items-center justify-center">Загрузка...</div>;


  return (
    <div className="min-h-screen bg-white flex flex-col pb-14">
      <header className="fixed top-0 left-0 right-0 bg-black z-50">
        <div className="flex justify-center px-4 py-2">
          <span className="text-white font-bold text-xl">Мой профиль</span>
        </div>
      </header>
      <div className="relative w-full max-w-[500px] mx-auto mt-12">
        <div className="relative w-full pt-[100%] bg-gray-300">
          <div className="absolute top-2 right-2 z-20 flex gap-2">
            <button
              onClick={() => document.getElementById('photoInput').click()}
              className="bg-black/50 hover:bg-black/70 rounded-full w-10 h-10 flex justify-center items-center"
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                className="h-5 w-5 text-white"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
            </button>
            {formData.photos.length > 0 && (
              <button
                onClick={handleRemovePhoto}
                className="bg-black/50 hover:bg-black/70 rounded-full w-10 h-10 flex justify-center items-center"
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
                    d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                  />
                </svg>
              </button>
            )}
            {formData.photos.length > 0 && (
              <button
                onClick={handleSetPrimaryPhoto}
                className={`bg-black/50 hover:bg-black/70 rounded-full w-10 h-10 flex justify-center items-center ${formData.photos[currentImageIndex].id === formData.primaryPhotoId ? 'bg-green-500' : ''
                  }`}
                disabled={formData.photos[currentImageIndex].id === formData.primaryPhotoId}
                title={
                  formData.photos[currentImageIndex].id === formData.primaryPhotoId
                    ? 'Это основная фотография'
                    : 'Назначить основной'
                }
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  className="h-5 w-5 text-white"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              </button>
            )}
          </div>
          {formData.photos.length > 0 ? (
            <>
              <img
                src={formData.photos[currentImageIndex].url}
                alt="Profile"
                className="absolute top-0 left-0 w-full h-full object-cover"
              />
              {formData.photos.length > 1 && (
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
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
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
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
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
          <input id="photoInput" type="file" accept="image/*" onChange={handlePhotoChange} className="hidden" />
        </div>
        <div className="absolute bottom-0 w-full border-b-2 border-black" />
        <div className="absolute bottom-0 right-[35px] transform translate-y-1/2 z-10">
          <button
            onClick={handleSave}
            disabled={isSaving}
            className={`rounded-full w-10 h-10 flex justify-center items-center border-2 border-black ${isSaving ? 'bg-gray-400' : 'bg-green-600'
              }`}
          >
            {isSaving ? (
              <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
            ) : (
              <svg
                xmlns="http://www.w3.org/2000/svg"
                className="h-6 w-6 text-white"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            )}
          </button>
        </div>
      </div>

      <div className="w-[90%] max-w-[500px] mx-auto flex flex-col gap-2 mt-2">
        <div className="flex flex-col text-left">
          <p className="text-gray-600 text-sm">Создано: {formData.createdAt}</p>
        </div>
        <div className="w-[100%] max-w-[500px] mx-auto flex flex-col gap-2 mt-4">
          <button
            onClick={handleShareGeo}
            className="bg-blue-600 text-white px-4 py-2 border-2 border-black rounded-[15px] flex items-center gap-2"
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
                d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"
              />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
            Поделиться геолокацией
          </button>
        </div>
        <div className="flex flex-col gap-2 mt-2">
          <div>
            <label className="block text-gray-600 text-sm mb-1">Имя</label>
            <input
              type="text"
              name="name"
              value={formData.name}
              onChange={handleChange}
              className="w-full border-2 border-black rounded-[15px] p-2 text-black"
              placeholder="Имя"
            />
          </div>
          <div>
            <label className="block text-gray-600 text-sm mb-1">Фамилия</label>
            <input
              type="text"
              name="surname"
              value={formData.surname}
              onChange={handleChange}
              className="w-full border-2 border-black rounded-[15px] p-2 text-black"
              placeholder="Фамилия"
            />
          </div>
          <div className="flex gap-4">
            <div className="flex-1">
              <label className="block text-gray-600 text-sm mb-1">Пол:</label>
              <div className="flex gap-4">
                <label className="flex items-center">
                  <input
                    type="radio"
                    name="gender"
                    value="М"
                    checked={formData.gender === 'М'}
                    onChange={handleChange}
                    className="mr-2"
                  />
                  М
                </label>
                <label className="flex items-center">
                  <input
                    type="radio"
                    name="gender"
                    value="Ж"
                    checked={formData.gender === 'Ж'}
                    onChange={handleChange}
                    className="mr-2"
                  />
                  Ж
                </label>
              </div>
            </div>
            <div className="flex-1">
              <label className="block text-gray-600 text-sm mb-1">Дата рождения:</label>
              <input
                type="text"
                name="birthDate"
                value={formData.birthDate}
                onChange={handleChange}
                className="w-full border-2 border-black rounded-[15px] p-2 text-black"
                placeholder="ДД.ММ.ГГГГ"
              />
              {age && <p className="text-gray-600 text-sm mt-1">Возраст: {age} лет</p>}
            </div>
          </div>
          <div>
            <label className="block text-gray-600 text-sm mb-1">О себе</label>
            <textarea
              name="description"
              value={formData.description}
              onChange={handleChange}
              className="w-full border-2 border-black rounded-[15px] p-2 text-black h-32 resize-none"
              placeholder="О себе"
            ></textarea>
          </div>
          <div className="flex gap-4 items-end">
            <div className="flex-1">
              <label className="block text-gray-600 text-sm mb-1">Тип Юнга:</label>
              <select
                name="personality"
                value={formData.personality}
                onChange={handleChange}
                className="w-full border-2 border-black rounded-[15px] p-2 text-black"
              >
                {personalityTypes.map((type) => (
                  <option key={type} value={type}>
                    {type}
                  </option>
                ))}
              </select>
            </div>
            <button
              onClick={handleTestRedirect}
              className="bg-gray-200 text-gray-600 px-4 py-2 border-2 border-black rounded-[15px]"
            >
              Тестирование
            </button>
          </div>
          <div>
            <label className="block text-gray-600 text-sm mb-1">Теги:</label>
            <div className="flex gap-2">
              <input
                type="text"
                value={newTag}
                onChange={(e) => setNewTag(e.target.value)}
                className="flex-1 border-2 border-black rounded-[15px] p-2 text-black"
                placeholder="Новый тег"
              />
              <button
                onClick={handleAddTag}
                className="bg-gray-200 text-gray-600 px-4 py-2 border-2 border-black rounded-[15px]"
              >
                Добавить
              </button>
            </div>
            <div className="flex flex-wrap gap-2 mt-2">
              {formData.tags.map((tag) => (
                <div key={tag.id} className="flex items-center bg-gray-200 rounded-[15px] px-3 py-1">
                  <span className="text-gray-600 text-sm">{tag.name}</span>
                  <button
                    onClick={() => handleRemoveTag(tag.id)}
                    className="ml-2 text-red-500 hover:text-red-700"
                  >
                    ×
                  </button>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
      <div className="h-20" />
    </div>
  );

};

export default EditProfilePage;