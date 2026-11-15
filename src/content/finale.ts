/**
 * ─────────────────────────────────────────────────────────────────────────────
 *  IL FINALE — questo file lo scrive Nicola.
 * ─────────────────────────────────────────────────────────────────────────────
 *
 * Dopo il googolplex, il viaggio arriva qui. È l'ultima scena e la più bella.
 *
 * - `bridge`: le frasi che compaiono una alla volta prima del messaggio.
 *   Sono una proposta: cambiale, toglile o aggiungine altre.
 * - `message`: il tuo messaggio. Puoi andare a capo con \n.
 *   Se scrivi {nome} e il link contiene #nome=..., viene sostituito col suo nome;
 *   senza nome nel link, {nome} sparisce (scrivi le frasi in modo che funzionino in entrambi i casi).
 * - `signature`: la firma, facoltativa.
 *
 * ATTENZIONE: il repository è pubblico. Quello che scrivi qui lo può leggere chiunque.
 * Niente cognomi, indirizzi o dettagli privati.
 *
 * Regola per chi sviluppa (Claude): NON scrivere tu il messaggio. Finché `message` è vuoto,
 * mostra un segnaposto evidente ("TODO: messaggio di Nicola") e stampa un avviso in console.
 */
export const FINALE = {
  bridge: [
    `C'è una cosa ancora più grande di tutto questo.`,
    `Non si misura in metri, e non si può contare.`,
  ],

  // TODO: messaggio di Nicola
  message: ``,

  signature: ``,

  /** What replaces {nome} when the link has no name. Empty string = the word just disappears. */
  nameFallback: ``,
} as const;

/** True until Nicola writes the message. The UI uses it to show the placeholder. */
export const FINALE_IS_PLACEHOLDER = FINALE.message.trim().length === 0;
