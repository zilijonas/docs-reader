// Weekdays — full + short — for common European locales.
export const WEEKDAYS = [
  // English
  'monday', 'mon', 'tuesday', 'tue', 'tues', 'wednesday', 'wed', 'thursday', 'thu', 'thur', 'thurs',
  'friday', 'fri', 'saturday', 'sat', 'sunday', 'sun',
  // German
  'montag', 'mo', 'dienstag', 'di', 'mittwoch', 'mi', 'donnerstag', 'do', 'freitag', 'fr', 'samstag',
  'sa', 'sonntag', 'so',
  // French
  'lundi', 'lun', 'mardi', 'mar', 'mercredi', 'mer', 'jeudi', 'jeu', 'vendredi', 'ven', 'samedi',
  'sam', 'dimanche', 'dim',
  // Spanish
  'lunes', 'lun', 'martes', 'mar', 'miércoles', 'miercoles', 'mié', 'mie', 'jueves', 'jue', 'viernes',
  'vie', 'sábado', 'sabado', 'sáb', 'sab', 'domingo', 'dom',
  // Italian
  'lunedì', 'lunedi', 'lun', 'martedì', 'martedi', 'mar', 'mercoledì', 'mercoledi', 'mer', 'giovedì',
  'giovedi', 'gio', 'venerdì', 'venerdi', 'ven', 'sabato', 'sab', 'domenica', 'dom',
  // Portuguese
  'segunda', 'segunda-feira', 'seg', 'terça', 'terca', 'terça-feira', 'terca-feira', 'ter', 'quarta',
  'quarta-feira', 'qua', 'quinta', 'quinta-feira', 'qui', 'sexta', 'sexta-feira', 'sex', 'sábado',
  'sabado', 'sáb', 'sab', 'domingo', 'dom',
  // Lithuanian
  'pirmadienis', 'pir', 'antradienis', 'ant', 'trečiadienis', 'treciadienis', 'tre', 'ketvirtadienis',
  'ket', 'penktadienis', 'pen', 'šeštadienis', 'sestadienis', 'šeš', 'ses', 'sekmadienis', 'sek',
];

export const WEEKDAYS_ALT = Array.from(new Set(WEEKDAYS.map((weekday) => weekday.toLowerCase()))).join('|');
