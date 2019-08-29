const { json, send } = require('micro');
const fetch = require('node-fetch');
const { includes, lowerCase, random, sample } = require('lodash');

// API данных (случайные цитаты):
const api = `http://api.forismatic.com/api/1.0/?method=getQuote&format=json&key=${random(1, 999999)}&lang=ru`;

// URL страницы для сбора донаций (donation -- в данном случае пожертвования на разработку):
const donateUrl = 'https://yasobe.ru/na/vui';


module.exports = async (req, res) => {
  // Код для HTTP-ответа:
  let statusCode = 200;

  // Принимаем только POST-запросы:
  if (req.method !== "POST") {
    statusCode = 400;
    send(res, statusCode, 'Bad Request');
  }

  // API Яндекс.Диалоги:
  const { meta, request, session, version } = await json(req);

  // Текущая сессия не закрыта:
  let isEndSession = false;

  // Получаем фразу юзера или надпись с кнопки которую он нажал (и переводим в нижний регистр): 
  const userUtterance = lowerCase(request.original_utterance);

  // Сообщение юзеру (на всякий случай знак пробела, чтобы застраховаться от ошибки в Яндекс.Диалоги, если соощение окажется пустой строкой):
  let message = ' ';

  // Быстрый ответ (чтобы не делать лишние запросы к стороннему API) на проверочный пинг от Яндекса:
  if (userUtterance === 'ping') {
    message = 'ОК';
    isEndSession = true;
    send(res, statusCode, {
      version,
      session,
      response: {
        text: message,
        end_session: isEndSession
      }
    });
    return;
  }

  // Проверяем есть ли на устройстве юзера экран (т.е. смартфон или колонка):
  const hasScreen = typeof meta.interfaces.screen !== "undefined" ? true : false;

  // Получаем массив всех слов из последней фразы юзера:
  let userWords = [];

  if (request.nlu.tokens.length > 0) {
    const tokensArr = request.nlu.tokens;
    for (let i = 0; i < tokensArr.length; i++) {
      userWords.push(tokensArr[i]);
    }
  }

  // Слот для кнопок (саджестов):
  let buttonSlot = [];

  // Кнопка продолжения (игры):
  const playButton = { "title": "Продолжай", "hide": true };

  // Кнопка справки:
  const helpButton = { "title": "Справка", "hide": true };

  // Кнопка донации:
  const donateButton = { "title": "Поддержи проект", "hide": true, "url": donateUrl };


  // Перманентный вопрос к юзеру из серии: "Хотите продолжить?"
  // С помощью нескольких строковых массивов и функции sample() из библиотеки Lodash, которая 
  // рендомно выбирает элемент массива, создаём вариативность, столь важную для голосовых интерфейсов. 
  // Строковые масивы лучше выносить в отдельный файл, но в данном случае, для наглядности -- всё пишем 
  // в одном файле: 
  const wish = [
    'Хотите',
    'Желаете',
    'Не против'
  ],
    know = [
      'узнать',
      'оценить',
      'услышать',
      'послушать'
    ],
    thought = [
      'ещё одну мысль',
      'следующую мысль',
      'ещё одну цитату',
      'следующую цитату',
      'ещё одну умную мысль',
      'ещё одну интересную цитату',
      'следующую интересную цитату',
      'мысль ещё одного умного человека'
    ];

  // Формируем перманентный вопрос к юзеру:
  const prompt = `${sample(wish)} ${sample(know)} ${sample(thought)}?`;


  // Создадим также (на этот раз для простоты без вариативности) фразы приветствия, справки, прощания, 
  // а также фразу для ответа на непонятые (т.е. те, которые наш код ещё не обрабатывает) вопросыи юзера:
  const hello = 'Привет! У меня много умных мыслей. Хочешь послушать?';
  const help = 'Я умею цитировать умных людей. Чтобы слушать - отвечайте положительно на мои вопросы. Чтобы закрыть - скажите: "Нет", "Выйти" "Закрыть"';
  const bye = 'Спасибо за внимание! До скорой встречи!';
  const unknown = 'Сейчас я не очень хорошо вас понимаю. Вы можете продолжить, получить справку, или завершить сессию. Каким будет ваш выбор?';


  // Теперь стараемся понять юзера. Эту логику также лучше писать в отдельном файле, 
  // поскольку может быть много кода, но в данном весьма упрощённом примере -- пишем здесь.
  // Будем использовать функции includes() из библиотеки Lodash, которая ищет подстроку.

  // Намерения юзера:
  let intent;

  // 1. Юзер хочет слушать цитаты (играть -- в нашей терминологии):
  const playWords = ['продолжай', 'продолжить', 'продолжать', 'хочу', 'желаю', 'не против',
    'да', 'слушать', 'слушаю', 'говори', 'скажи'];

  for (let item of playWords) {
    if (includes(userUtterance, item)) {
      intent = 'play';
      break;
    }
  }

  // 2. Юзер хочет получить справку (на фразы "помощь" и "что ты умеешь" тестируют при модерации навыка):
  const helpWords = ['справка', 'помощь', 'что ты умеешь'];

  for (let item of helpWords) {
    if (includes(userUtterance, item)) {
      intent = 'help';
      break;
    }
  }

  // 3. Юзер хочет закрыть навык:
  const exitWords = ['нет', 'выйти', 'закрыть', 'завершить', 'хватит', 'достаточно'];

  for (let item of exitWords) {
    if (includes(userUtterance, item)) {
      intent = 'exit';
      break;
    }
  }


  // И вот он -- диалог с юзером!:
  if (!userUtterance) {
    // Приветствие при запуске:
    message = hello;
    // Если у юзера есть экран:
    if (hasScreen) {
      // Кнопка "Справка":
      buttonSlot.push(helpButton);
      // Кнопка "Продолжай":
      buttonSlot.push(playButton);
    }
  } else if (intent === 'play') {
    // Определение функции setData() -- в конце кода:
    message = await setData();
    if (hasScreen) {
      // Если значение donateUrl определено -- кнопка донации: 
      if (donateUrl)
        buttonSlot.push(donateButton);
      buttonSlot.push(playButton);
    }
  } else if (intent === 'help') {
    message = `${help} ${prompt}`;
    if (hasScreen) {
      if (donateUrl)
        buttonSlot.push(donateButton);
      buttonSlot.push(playButton);
    }
  } else if (intent === 'exit') {
    message = bye;
    buttonSlot = [];
    isEndSession = true;
  } else {
    message = unknown;
    if (hasScreen) {
      buttonSlot.push(helpButton);
      buttonSlot.push(playButton);
    }
  }


  // Ответ Алисе:
  send(res, statusCode, {
    version,
    session,
    response: {
      text: message,
      buttons: buttonSlot,
      end_session: isEndSession
    }
  });


  // Функция, которая получает данные и возвращает отформатированную цитату:
  async function setData() {
    let quote;
    let author;
    try {
      // Получение "сырых" данных:
      const data = await fetch(api);
      const jData = await data.json();
      // Получение цитаты и имени автора:
      quote = jData.quoteText;
      author = jData.quoteAuthor;
    } catch (err) {
      quote = 'Мысль потеряна! Попробуйте ещё раз.';
      console.error('Fail to fetch data: ' + err);
    }
    // Отформатированная цитата:
    return `${quote}\n${author ? '— ' : ''}${author}\n${prompt}`;
  }
};
