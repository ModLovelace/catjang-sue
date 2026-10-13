"use strict";
// Validation at the GNOME boundary; timers and persistence belong to main.js.
function createFeatures(adapter) {
  const intervals = [0, 10, 15, 20, 30, 45, 60, 90, 120];
  function object(value) {
    if (!value || typeof value !== 'object' || Array.isArray(value)) throw new Error('Datos inválidos');
  }
  function preferences(patch) {
    object(patch);
    const validators = {
      stretchIntervalMin: value => intervals.includes(value),
      focusMin: value => Number.isInteger(value) && value >= 1 && value <= 180,
      restSec: value => Number.isInteger(value) && value >= 30 && value <= 3600,
      userName: value => typeof value === 'string' && value.length <= 24,
      fixedMessage: value => typeof value === 'string' && value.length <= 80,
      taskCompleteSoundVolume: value => Number.isFinite(value) && value >= 0 && value <= 1,
    };
    for (const [key, value] of Object.entries(patch))
      if (!Object.hasOwn(validators, key) || !validators[key](value)) throw new Error('Ajustes inválidos');
    adapter.configure(patch);
  }
  function reminder(value) {
    object(value);
    if (typeof value.message !== 'string' || !value.message.trim() || value.message.length > 80 ||
        typeof value.time !== 'string' || !/^([01]\d|2[0-3]):[0-5]\d$/.test(value.time) ||
        !['none', 'daily', 'weekdays', 'weekends', 'custom'].includes(value.repeat) ||
        !Array.isArray(value.days) || value.days.some(day => !Number.isInteger(day) || day < 0 || day > 6) ||
        (value.repeat === 'custom' && !value.days.length)) throw new Error('Recordatorio inválido');
    return {message: value.message, time: value.time, repeat: value.repeat, days: value.days};
  }
  function id(value) {
    if (typeof value !== 'string' || !value || value.length > 128) throw new Error('Recordatorio inválido');
    return value;
  }
  function execute(action, payload) {
    let result;
    switch (action) {
      case 'preferences': preferences(payload); break;
      case 'pomodoro-start': adapter.startPomodoro(); break;
      case 'pomodoro-pause': adapter.pausePomodoro(); break;
      case 'pomodoro-reset': adapter.resetPomodoro(); break;
      case 'reminder-add': result = adapter.addReminder(reminder(payload)); break;
      case 'reminder-update': object(payload); result = adapter.updateReminder(id(payload.id), reminder(payload)); break;
      case 'reminder-delete': result = adapter.deleteReminder(id(payload)); break;
      case 'reminder-enabled':
        object(payload);
        if (typeof payload.enabled !== 'boolean') throw new Error('Recordatorio inválido');
        result = adapter.setReminderEnabled(id(payload.id), payload.enabled); break;
      case 'agents-setup': adapter.openAgents(); break;
      default: throw new Error('Acción no disponible');
    }
    if (result?.ok === false) throw new Error('No se pudo guardar el recordatorio');
    return {...adapter.get(), result};
  }
  return {get: () => adapter.get(), execute};
}
module.exports = {createFeatures};
