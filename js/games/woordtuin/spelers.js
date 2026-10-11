// Virtuele spelers voor Woordtuin: de computer met een naam, een niveau en een eigen tempo. Ze spelen op jouw apparaat,
// dus zonder account of internet, en ze zijn ook als zodanig te herkennen ("virtuele speler"): het zijn geen echte mensen.
// niveau = een niveau uit engine.js (NIVEAUS); wacht = hoeveel langer of korter ze over een zet doen dan de computer (1 = gewoon).
export const SPELERS = [
  { id: 'fien', naam: 'Fien', niveau: 'makkelijk', wacht: 1.2 },
  { id: 'cor', naam: 'Cor', niveau: 'makkelijk', wacht: 2.6 },
  { id: 'bram', naam: 'Bram', niveau: 'gemiddeld', wacht: 1 },
  { id: 'gert', naam: 'Gert', niveau: 'gemiddeld', wacht: 1.8 },
  { id: 'els', naam: 'Els', niveau: 'moeilijk', wacht: 1.1 },
  { id: 'hanna', naam: 'Hanna', niveau: 'extreem', wacht: 1.4 },
];
export const speler = (id) => SPELERS.find((s) => s.id === id) || null;
