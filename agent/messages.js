const templates = [
    'יום הולדת שמח NAME! 🎂 שיהיה לך יום מדהים!',
    'NAME, יום הולדת שמח! 🎉 מאחל/ת לך שנה מלאה באושר ובריאות!',
    'מזל טוב NAME! 🥳 שכל המשאלות שלך יתגשמו!',
    'NAME יום הולדת שמח! 🎈 שתמשיך להיות מדהים/ה!',
    'יום הולדת שמח NAME! ❤️ מאחל/ת לך רק דברים טובים!',
    'NAME, מזל טוב! 🌟 שנה חדשה מלאה בהצלחות!',
    'יום הולדת שמח NAME! 🎁 שיהיה מושלם!',
    'מזל טוב NAME! 💫 מאחל/ת לך את כל הטוב שבעולם!',
  ];
  
  export function generateMessage(name) {
    const firstName = name.split(' ')[0];
    const template = templates[Math.floor(Math.random() * templates.length)];
    return template.replace('NAME', firstName);
  }