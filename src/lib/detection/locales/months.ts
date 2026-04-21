// Months — full + short — for all major European locales.
export const MONTHS = [
  // English
  'january', 'jan', 'february', 'feb', 'march', 'mar', 'april', 'apr', 'may',
  'june', 'jun', 'july', 'jul', 'august', 'aug', 'september', 'sept', 'sep',
  'october', 'oct', 'november', 'nov', 'december', 'dec',
  // German
  'januar', 'jänner', 'februar', 'märz', 'mär', 'mai', 'juni', 'juli',
  'august', 'september', 'oktober', 'november', 'dezember', 'dez',
  // French
  'janvier', 'janv', 'février', 'fevrier', 'févr', 'fevr', 'mars', 'avril',
  'avr', 'mai', 'juin', 'juillet', 'juil', 'août', 'aout', 'septembre',
  'sept', 'octobre', 'oct', 'novembre', 'nov', 'décembre', 'decembre',
  'déc', 'dec',
  // Spanish
  'enero', 'ene', 'febrero', 'febr', 'marzo', 'mar', 'abril', 'abr', 'mayo',
  'may', 'junio', 'jun', 'julio', 'jul', 'agosto', 'ago', 'septiembre',
  'setiembre', 'sept', 'set', 'octubre', 'oct', 'noviembre', 'nov',
  'diciembre', 'dic',
  // Italian
  'gennaio', 'gen', 'febbraio', 'feb', 'marzo', 'mar', 'aprile', 'apr',
  'maggio', 'mag', 'giugno', 'giu', 'luglio', 'lug', 'agosto', 'ago',
  'settembre', 'set', 'ottobre', 'ott', 'novembre', 'nov', 'dicembre', 'dic',
  // Portuguese
  'janeiro', 'fevereiro', 'março', 'marco', 'abril', 'maio', 'junho',
  'julho', 'agosto', 'setembro', 'outubro', 'novembro', 'dezembro',
  // Dutch
  'januari', 'februari', 'maart', 'april', 'mei', 'juni', 'juli', 'augustus',
  'september', 'oktober', 'november', 'december',
  // Polish (nominative + genitive)
  'styczeń', 'stycznia', 'luty', 'lutego', 'marzec', 'marca', 'kwiecień',
  'kwietnia', 'maj', 'maja', 'czerwiec', 'czerwca', 'lipiec', 'lipca',
  'sierpień', 'sierpnia', 'wrzesień', 'września', 'październik',
  'października', 'listopad', 'listopada', 'grudzień', 'grudnia',
  // Lithuanian (nominative + genitive)
  'sausis', 'sausio', 'vasaris', 'vasario', 'kovas', 'kovo', 'balandis',
  'balandžio', 'gegužė', 'gegužės', 'birželis', 'birželio', 'liepa',
  'liepos', 'rugpjūtis', 'rugpjūčio', 'rugsėjis', 'rugsėjo', 'spalis',
  'spalio', 'lapkritis', 'lapkričio', 'gruodis', 'gruodžio',
  // Latvian
  'janvāris', 'janvāra', 'februāris', 'februāra', 'marts', 'marta',
  'aprīlis', 'aprīļa', 'maijs', 'maija', 'jūnijs', 'jūnija', 'jūlijs',
  'jūlija', 'augusts', 'augusta', 'septembris', 'septembra', 'oktobris',
  'oktobra', 'novembris', 'novembra', 'decembris', 'decembra',
  // Estonian
  'jaanuar', 'veebruar', 'märts', 'aprill', 'mai', 'juuni', 'juuli',
  'august', 'september', 'oktoober', 'november', 'detsember',
  // Finnish
  'tammikuu', 'tammikuuta', 'helmikuu', 'helmikuuta', 'maaliskuu',
  'maaliskuuta', 'huhtikuu', 'huhtikuuta', 'toukokuu', 'toukokuuta',
  'kesäkuu', 'kesäkuuta', 'heinäkuu', 'heinäkuuta', 'elokuu', 'elokuuta',
  'syyskuu', 'syyskuuta', 'lokakuu', 'lokakuuta', 'marraskuu',
  'marraskuuta', 'joulukuu', 'joulukuuta',
  // Swedish
  'januari', 'februari', 'mars', 'april', 'maj', 'juni', 'juli', 'augusti',
  'september', 'oktober', 'november', 'december',
  // Norwegian / Danish
  'januar', 'februar', 'mars', 'april', 'mai', 'juni', 'juli', 'august',
  'september', 'oktober', 'november', 'desember', 'december',
  // Czech / Slovak
  'leden', 'ledna', 'únor', 'února', 'březen', 'března', 'duben', 'dubna',
  'květen', 'května', 'červen', 'června', 'červenec', 'července', 'srpen',
  'srpna', 'září', 'říjen', 'října', 'listopad', 'listopadu', 'prosinec',
  'prosince', 'január', 'februára', 'marca', 'apríl', 'máj', 'jún', 'júl',
  'august', 'september', 'október', 'november', 'december',
  // Hungarian
  'január', 'februári', 'február', 'március', 'április', 'május', 'június',
  'július', 'augusztus', 'szeptember', 'október', 'november', 'december',
  // Romanian
  'ianuarie', 'februarie', 'martie', 'aprilie', 'mai', 'iunie', 'iulie',
  'august', 'septembrie', 'octombrie', 'noiembrie', 'decembrie',
  // Greek
  'ιανουάριος', 'φεβρουάριος', 'μάρτιος', 'απρίλιος', 'μάιος', 'ιούνιος',
  'ιούλιος', 'αύγουστος', 'σεπτέμβριος', 'οκτώβριος', 'νοέμβριος',
  'δεκέμβριος',
  // Bulgarian
  'януари', 'февруари', 'март', 'април', 'май', 'юни', 'юли', 'август',
  'септември', 'октомври', 'ноември', 'декември',
  // Croatian / Slovenian
  'siječanj', 'siječnja', 'veljača', 'veljače', 'ožujak', 'ožujka',
  'travanj', 'travnja', 'svibanj', 'svibnja', 'lipanj', 'lipnja', 'srpanj',
  'srpnja', 'kolovoz', 'kolovoza', 'rujan', 'rujna', 'listopad', 'listopada',
  'studeni', 'studenoga', 'prosinac', 'prosinca', 'januar', 'februar',
  'marec', 'april', 'maj', 'junij', 'julij', 'avgust', 'september',
  'oktober', 'november', 'december',
  // Turkish
  'ocak', 'şubat', 'mart', 'nisan', 'mayıs', 'haziran', 'temmuz', 'ağustos',
  'eylül', 'ekim', 'kasım', 'aralık',
];

export const MONTHS_ALT = Array.from(new Set(MONTHS.map((month) => month.toLowerCase()))).join('|');
