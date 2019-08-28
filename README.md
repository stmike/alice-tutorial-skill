# Пример создания навыка для Алисы
Простой навык для голосового помощника Алисы (Яндекс), который с помощью стороннего API получает цитаты, и демонстрирует их пользователям.

## Требования
Должен быть установлен [**Node.js с npm**] (https://nodejs.org/en/), а также (опционально, только для тестирования) [**ngrok**] (https://ngrok.com/) и/или необходимо иметь бесплатный или платный аккаунт на [**ZEIT**] (https://zeit.co/home) (для тестирования и развертывания). 

## Установка
* Склонируйте или загрузите и распакуйте навык на локальный диск
* Войдите в каталог: `cd alice-tutorial-skill`
* Установите необходимые пакеты: `npm i`
* Запустите локальный сервер: `npm start`
* Выполните команду `ngrok http 3000`, затем скопируйте URL с протоколом https и вставьте в поле "*Webhook URL*" в консоли Яндекс.Диалоги.
* **Или**, не запуская локальный сервер, выполните команду `now`, затем скопируйте URL в консоли ZEIT, добавьте в конец URL путь к каталогу api (*/api/*) и вставьте в поле "*Webhook URL*" в консоли Яндекс.Диалоги.

## Лицензия
MIT
 
