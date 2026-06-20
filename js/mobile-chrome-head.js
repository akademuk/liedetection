(function () {
  var ua = navigator.userAgent || '';
  var ref = document.referrer || '';
  var isMessenger = /Telegram/i.test(ua)
    || window.TelegramWebviewProxy != null
    || /t\.me|telegram\.org|telegram\.me/i.test(ref)
    || /Instagram|FBAN|FBAV|Twitter|Line\//i.test(ua);
  if (isMessenger) {
    document.documentElement.classList.add('in-app-browser');
  }
})();
