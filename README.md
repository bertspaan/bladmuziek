# Bladmuziek

Een privébibliotheek voor lyrics en akkoorden, gebouwd met SvelteKit 3, Svelte 5, TypeScript en Tailwind 4. Markdown-bestanden in Obsidian zijn de bron; er is geen database.

## Ontwikkelen

Node ≥22.17 (Mini gebruikt 26.8.2), pnpm 10.

```sh
pnpm install --frozen-lockfile
MUSIC_DIR=/tmp/bladmuziek-dev pnpm dev
```

Zonder `MUSIC_DIR` gebruikt de app `~/Documents/Obsidian/Bladmuziek`. Gebruik een tijdelijke map voor tests. De app maakt deze map pas bij het eerste opslaan. De server luistert op localhost.

```sh
pnpm check
pnpm test
pnpm test:live
```

De unit-tests gebruiken eigen teksten en tijdelijke mappen. `test:live` leest één zoekopdracht en drie openbare bronpagina's, zonder muziek op te slaan. Ultimate Guitar-links behouden hun volledige pad met artiest en titel: de korte `/tab/ID`-link werkt niet voor ieder nummer. Dubbele bronnen worden wel op ID herkend. Bronwebsites kunnen hun opmaak wijzigen of verzoeken blokkeren. De app biedt dan de bronlink en tekst plakken; er worden geen blokkades omzeild.

## Mini

Productie: `https://bladmuziek.mini.bertspaan.nl`, uitsluitend binnen het Tailscale-netwerk. De Node-server luistert op `127.0.0.1:3100`. Geen Funnel of publieke poort nodig.

Caddy gebruikt het bestaande wildcardcertificaat voor `*.mini.bertspaan.nl` en luistert alleen op Tailscale en loopback. De configuratie sluit aan op de boekhouding-app. Op Mini zelf werkt ook `http://127.0.0.1:3100`, inclusief bewerken.

```sh
APP_ORIGIN=https://bladmuziek.mini.bertspaan.nl pnpm build
mkdir -p /home/bert/Documents/Obsidian/Bladmuziek
install -m 644 deploy/bladmuziek.service ~/.config/systemd/user/bladmuziek.service
systemctl --user daemon-reload
systemctl --user enable --now bladmuziek.service
sudo install -m 644 deploy/bladmuziek.caddy /etc/caddy/mini-apps/bladmuziek.caddy
sudo systemctl reload caddy
```

De bestaande Caddy-configuratie importeert `/etc/caddy/mini-apps/*.caddy`. Bovenstaande service is specifiek voor Mini. Bij een andere installatie pas je de paden en Node-binary in de service aan. De ingestelde user-linger op Mini laat de service ook zonder desktopsessie draaien.

`APP_ORIGIN` wordt tijdens het bouwen ingesteld, zoals vereist door SvelteKit 3. `ORIGIN` bij opstarten gebruiken heeft in deze versie geen effect. Het voorbeeldbestand `.env.example` documenteert de instellingen; de productie-service gebruikt expliciete omgevingsvariabelen en leest geen `.env`.

Na wijzigingen:

```sh
pnpm check && pnpm test
APP_ORIGIN=https://bladmuziek.mini.bertspaan.nl pnpm build
systemctl --user restart bladmuziek.service
systemctl --user status bladmuziek.service
journalctl --user -u bladmuziek.service -n 50
```

Stoppen: `systemctl --user disable --now bladmuziek.service`. Om ook de proxyroute te verwijderen: verwijder `/etc/caddy/mini-apps/bladmuziek.caddy` en herlaad Caddy. De muziekbestanden blijven behouden.

Nummerlinks gebruiken artiest en titel, bijvoorbeeld `/muziek/andre-hazes-uit-mijn-bol`. Bij gelijke namen krijgen extra versies een volgnummer. Een gewijzigde titel of artiest verandert de link; oude links worden niet omgeleid. Het interne ID blijft behouden voor opslaan en wijzigingscontrole.

## Tags en mappen

Bij toevoegen of bewerken kun je tags en een map invullen. Tags staan in YAML-frontmatter (`tags: [folk, oefenen]`) en zijn bruikbaar in Obsidian. Een map zoals `Piano/Jazz` wordt een echte submap van Bladmuziek. De bestandslocatie bepaalt de map; er is geen dubbele mapmetadata. Laat het mapveld leeg voor de hoofdmap.

De bibliotheek toont mappen en nummers samen in één uitklapbare lijst. Alle mappen en submappen zijn standaard uitgeklapt, met hun nummers eronder. Klik op een map om de inhoud in of uit te klappen; de keuze blijft in localStorage bewaard. Nieuwe mappen zijn standaard uitgeklapt. De pijl rechts opent een map afzonderlijk; via het mappad ga je terug. Alle nummers toont de volledige bibliotheek alfabetisch. Zoeken en tagfilters tonen resultaten uit alle mappen, ook ingeklapte mappen, zonder de bewaarde uitklapstand te veranderen. Zoeken doorzoekt alle inhoudelijke velden: titel, artiest, tekst, akkoorden, tags, map, toonsoort, capo, bron en bestandsnaam. Zoekwoorden kunnen over verschillende velden verdeeld zijn. Een gekozen tagfilter blijft daarbij actief. Met Nieuwe map maak je een map aan binnen de geselecteerde map (of de hoofdmap bij Alle nummers). Sleep een nummer met het handvat naar een map of een onderdeel van het mappad, of klik op het handvat om een doelmap te kiezen. Tags staan rechts naast het nummer en zijn aanklikbare filters. Nieuwe mappen kunnen ook bij opslaan ontstaan. Verplaatsen behoudt het ID, de inhoud, metadata en transpositievoorkeur. Een bestaande naam in de doelmap krijgt een volgnummer. Wijzigingen in Obsidian worden bij herladen zichtbaar; een externe verplaatsing laat een verouderde opslag mislukken.

## Bestandsformaat

Eén `.md` per nummer: `Artiest - Titel.md`, of `Titel.md` zonder artiest. Bij dubbele bestandsnamen wordt ` (2)`, ` (3)`, enzovoort toegevoegd. Het stabiele `id` staat alleen in YAML. Onbekende YAML-velden en opmerkingen blijven behouden bij bewerken. Gewijzigde titels veranderen de bestandsnaam niet, zodat Obsidian-links blijven werken. Handmatige Markdown-bestanden zonder ID worden ook gelezen en krijgen bij het eerstvolgende opslaan een ID.

```markdown
---
id: eigen-nummer
title: Eigen melodie
artist: Ik
key: Am
capo: 2
source_url: ''
created_at: '2026-10-25T09:00:00.000Z'
updated_at: '2026-10-25T09:00:00.000Z'
preferred_transpose: 0
---

## Couplet
Een [Am]regel met een [G]akkoord.
```

- Toonsoorten gebruiken A–G, eventueel `#` of `b`, en `m` voor mineur. Capo staat los van de geschreven akkoorden.
- `preferred_transpose` is een aantal halve tonen (0–11) ten opzichte van de oorspronkelijke inhoud. Transponeren herschrijft de oorspronkelijke lyrics en akkoorden niet.
- Secties zijn Markdown-kopjes; riff-/tabblokken mogen in fenced code staan. Andere Markdown en HTML worden als tekst getoond, nooit uitgevoerd.
- Alle `.md`-bestanden in Bladmuziek en gewone submappen worden gelezen. Verborgen mappen en symlinks worden overgeslagen. Ongeldige metadata levert een waarschuwing op; het bestand wordt niet aangepast.
- Elke write gebruikt een tijdelijke file en een atomaire vervanging. Een SHA-256-revisie wordt bij opslaan opnieuw vergeleken; gelijktijdige app-writes worden geserialiseerd. Dit voorkomt bekende verouderde wijzigingen, maar is geen volledige synchronisatie-engine: een externe editor kan theoretisch precies tussen de laatste controle en de rename schrijven.
- De app zorgt niet voor Obsidian-synchronisatie of back-ups. Alle apparaten gebruiken dezelfde server en bestanden. Bestaande vault-sync/back-ups blijven apart geregeld.

## Interfaces

- `GET /api/songs`: nummers en leeswaarschuwingen.
- `POST /api/songs`: `{ draft, allowDuplicate? }` → opgeslagen nummer.
- `GET /api/songs/:id`: één nummer, inclusief `revision`.
- `PUT /api/songs/:id`: `{ draft, revision }` → bijgewerkt nummer, of HTTP 409 bij een conflict.
- `PATCH /api/songs/:id`: `{ revision, transpose }` → bewaarde voorkeur.
- `POST /api/import`: `{ url }` → bewerkbare `draft`, `warnings` en optioneel `existing`; schrijft niets.
- `GET /api/search?q=...`: resultaten van Ultimate Guitar en Chordie, plus onafhankelijke bronwaarschuwingen. Resultaten worden vijf minuten in geheugen gecachet.

Een `draft` bestaat uit `title`, `artist`, `key`, `capo` (nummer of null), `sourceUrl` en `body`. De bronadapters hebben `accepts`, `searchUrl`, `parseSearch` en `parseSong`. Websiteverzoeken zijn begrensd tot ondersteunde HTTPS-hosts, publieke DNS-adressen, maximaal drie redirects en 4 MB. Verzoeken veranderen nooit automatisch de bibliotheek.
