const CODE_MESSAGES = {
  network_error:
    'Brak połączenia z serwerem. Sprawdź internet i spróbuj ponownie.',
  throttled: 'Zbyt wiele prób. Odczekaj chwilę i spróbuj ponownie.',
  not_authenticated: 'Nieprawidłowy adres e-mail lub hasło.',
  token_invalid: 'Sesja wygasła. Zaloguj się ponownie.',
  conflict: 'Konto z tym adresem e-mail już istnieje.',
  permission_denied: 'Nie masz dostępu do tego zasobu.',
  not_found: 'Nie znaleziono żądanego zasobu.',
  server_error: 'Wystąpił błąd serwera. Spróbuj ponownie później.',
  validation_error: 'Sprawdź poprawność pól formularza.',
};

const FIELD_MESSAGES = {
  'Enter a valid email address.': 'Podaj poprawny adres e-mail.',
  'This field is required.': 'To pole jest wymagane.',
  'This field may not be blank.': 'To pole nie może być puste.',
  'This password is too short. It must contain at least 8 characters.':
    'Hasło musi mieć co najmniej 8 znaków.',
  'This password is too common.': 'To hasło jest zbyt popularne.',
  'This password is entirely numeric.': 'Hasło nie może składać się tylko z cyfr.',
  'The password is too similar to the email address.':
    'Hasło jest zbyt podobne do adresu e-mail.',
  'The password is too similar to the first name.':
    'Hasło jest zbyt podobne do imienia.',
  'The password is too similar to the last name.':
    'Hasło jest zbyt podobne do nazwiska.',
  'An account with this email already exists.':
    'Konto z tym adresem e-mail już istnieje.',
  'Invalid or expired token.': 'Link jest nieprawidłowy lub wygasł.',
  'Hasła nie są identyczne.': 'Hasła nie są identyczne.',
};

export function humanizeApiError(error) {
  if (!error) return 'Coś poszło nie tak. Spróbuj ponownie.';

  if (error.status === 401 && error.code === 'not_authenticated') {
    return CODE_MESSAGES.not_authenticated;
  }
  if (error.status >= 500) return CODE_MESSAGES.server_error;

  return (
    CODE_MESSAGES[error.code] ||
    error.message ||
    'Coś poszło nie tak. Spróbuj ponownie.'
  );
}

export function humanizeFieldMessage(message) {
  if (!message) return undefined;
  return FIELD_MESSAGES[message] || message;
}

export function firstFieldMessage(errors, name) {
  const value = errors?.[name];
  const message = Array.isArray(value) ? value[0] : value;
  return humanizeFieldMessage(message);
}
