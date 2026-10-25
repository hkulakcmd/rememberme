/** Client-side validation and server field-error helpers. */

export function isValidEmail(value) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(value || '').trim());
}

export function fieldError(errors, name) {
  const value = errors?.[name];
  if (!value) return undefined;
  return Array.isArray(value) ? value[0] : String(value);
}

export function hasErrors(errors) {
  return Boolean(errors && Object.keys(errors).length > 0);
}

export function validateLogin(values) {
  const errors = {};
  if (!String(values.email || '').trim()) {
    errors.email = ['Podaj adres e-mail.'];
  } else if (!isValidEmail(values.email)) {
    errors.email = ['Podaj poprawny adres e-mail.'];
  }
  if (!values.password) {
    errors.password = ['Podaj hasło.'];
  }
  return errors;
}

export function validateRegister(values) {
  const errors = {};
  if (!String(values.firstName || '').trim()) {
    errors.first_name = ['Podaj imię.'];
  }
  if (!String(values.email || '').trim()) {
    errors.email = ['Podaj adres e-mail.'];
  } else if (!isValidEmail(values.email)) {
    errors.email = ['Podaj poprawny adres e-mail.'];
  }
  if (!values.password) {
    errors.password = ['Podaj hasło.'];
  } else if (values.password.length < 8) {
    errors.password = ['Hasło musi mieć co najmniej 8 znaków.'];
  }
  if (values.confirmPassword !== values.password) {
    errors.confirmPassword = ['Hasła nie są identyczne.'];
  }
  return errors;
}

export function validatePasswordResetConfirm(values) {
  const errors = {};
  if (!values.password) {
    errors.new_password = ['Podaj nowe hasło.'];
  } else if (values.password.length < 8) {
    errors.new_password = ['Hasło musi mieć co najmniej 8 znaków.'];
  }
  if (values.confirmPassword !== values.password) {
    errors.confirmPassword = ['Hasła nie są identyczne.'];
  }
  return errors;
}
