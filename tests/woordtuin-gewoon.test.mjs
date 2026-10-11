import test from 'node:test';
import assert from 'node:assert/strict';
import { vouw } from '../js/shared/talen.js';
import { laadWoordenboek } from '../js/games/woordtuin/woordenboek.js';

// Gewone woorden die een speler zeker mag spelen. Per taal een steekproef over alles wat in het dagelijks leven voorkomt:
// zelfstandige naamwoorden, werkwoordsvormen, bijvoeglijke naamwoorden, kleine woorden, meervouden. Geschreven zoals de taal ze schrijft (met accenten);
// de test vouwt ze zoals het spel dat doet. Staat er een woord niet in de lijst, dan wordt een gewoon woord ten onrechte geweigerd.
const GEWOON = {
  nl: 'huis tuin bloem tafel stoel raam keuken brood water rivier berg blij liep lopen kinderen mensen vriend familie moeder vader zus broer ochtend avond geel oranje paars klein groot mooi stil altijd nooit omdat voor na door tussen onder rond potlood mand boter kaas koffie diner winter zomer herfst lente bos eiland brug ladder deken schaap koe paard vogel vis appel peer druif kers taart soep ziek gezond dokter school boek krant brief fiets trein auto boot straat dorp stad land zee strand wolk regen sneeuw wind zon maan ster',
  en: 'house garden flower table chair window kitchen bread water river mountain happy walked running children people friend family mother father sister brother morning evening yellow orange purple small little large beautiful quiet always never because before after through between under around pencil basket butter cheese coffee dinner winter summer autumn spring forest island bridge ladder blanket sheep cow horse bird fish apple pear grape cherry cake soup sick healthy doctor school book letter bicycle train car boat street village town country sea beach cloud rain snow wind sun moon star said went came saw knew thought heard asked',
  de: 'Haus Garten Blume Tisch Stuhl Fenster Küche Brot Wasser Fluss Berg froh ging gehen Kinder Leute Freund Familie Mutter Vater Schwester Bruder Morgen Abend gelb orange klein groß schön still immer nie weil vor nach durch zwischen unter rund Bleistift Korb Butter Käse Kaffee Winter Sommer Herbst Frühling Wald Insel Brücke Leiter Decke Schaf Kuh Pferd Vogel Fisch Apfel Birne Traube Kirsche Kuchen Suppe krank gesund Arzt Schule Buch Brief Fahrrad Zug Auto Boot Straße Dorf Stadt Land Meer Strand Wolke Regen Schnee Wind Sonne Mond Stern sagte kam sah wusste dachte hörte fragte',
  fr: 'maison jardin fleur table chaise fenêtre cuisine pain eau rivière montagne heureux marcha courir enfants gens ami famille mère père sœur frère matin soir jaune orange violet petit grand beau calme toujours jamais parce avant après entre sous autour crayon panier beurre fromage café dîner hiver été automne printemps forêt île pont échelle couverture mouton vache cheval oiseau poisson pomme poire raisin cerise gâteau soupe malade docteur école livre lettre vélo train voiture bateau rue village ville pays mer plage nuage pluie neige vent soleil lune étoile dit alla vint vit savait pensa entendit',
  es: 'casa jardín flor mesa silla ventana cocina pan agua río montaña feliz caminó correr niños gente amigo familia madre padre hermana hermano mañana tarde amarillo naranja morado pequeño grande bonito tranquilo siempre nunca porque antes después entre bajo lápiz cesta mantequilla queso café cena invierno verano otoño bosque isla puente escalera manta oveja vaca caballo pájaro pez manzana pera uva cereza tarta sopa enfermo sano médico escuela libro carta bicicleta tren coche barco calle pueblo ciudad país mar playa nube lluvia nieve viento sol luna estrella dijo fue vino vio sabía pensó oyó has come once sale',
  it: 'casa giardino fiore tavolo sedia finestra cucina pane acqua fiume montagna felice camminò correre bambini gente amico famiglia madre padre sorella fratello mattina sera giallo arancione viola piccolo grande bello calmo sempre mai perché prima dopo tra sotto matita cesto burro formaggio caffè cena inverno estate autunno bosco isola ponte scala coperta pecora mucca cavallo uccello pesce mela pera uva ciliegia torta zuppa malato sano medico scuola libro lettera bici treno auto barca strada paese città mare spiaggia nuvola pioggia neve vento sole luna stella disse andò venne vide sapeva pensò sentì ago ride come sei',
  pt: 'casa jardim flor mesa cadeira janela cozinha pão água rio montanha feliz andou correr crianças gente amigo família mãe pai irmã irmão manhã tarde amarelo laranja roxo pequeno grande bonito calmo sempre nunca porque antes depois entre debaixo lápis cesto manteiga queijo café jantar inverno verão outono floresta ilha ponte escada manta ovelha vaca cavalo pássaro peixe maçã pera uva cereja bolo sopa doente saudável médico escola livro carta bicicleta comboio carro barco rua aldeia cidade país mar praia nuvem chuva neve vento sol lua estrela disse foi veio viu sabia pensou ouviu',
  pl: 'dom ogród kwiat stół krzesło okno kuchnia chleb woda rzeka góra szczęśliwy szedł biec dzieci ludzie przyjaciel rodzina matka ojciec siostra brat rano wieczór żółty fioletowy mały duży piękny cichy zawsze nigdy ponieważ przed po przez między pod wokół ołówek koszyk masło ser kawa obiad zima lato jesień wiosna las wyspa most drabina koc owca krowa koń ptak ryba jabłko gruszka winogrono wiśnia ciasto zupa chory zdrowy lekarz szkoła książka list rower pociąg auto łódź ulica wieś miasto kraj morze plaża chmura deszcz śnieg wiatr słońce księżyc gwiazda powiedział poszedł przyszedł zobaczył wiedział',
};

for (const [taal, tekst] of Object.entries(GEWOON)) {
  test(`${taal}: gewone woorden worden geaccepteerd`, async () => {
    const { WOORDEN } = await laadWoordenboek(taal);
    const set = new Set(WOORDEN);
    const mist = [];
    for (const w of tekst.split(/\s+/)) {
      const v = vouw(w, taal);
      if (v.length < 3 || v.length > 7) continue;
      if (!set.has(v)) mist.push(w);
    }
    assert.deepEqual(mist, [], `${taal}: gewone woorden die ontbreken: ${mist.join(' ')}`);
  });
}
