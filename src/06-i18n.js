  // ==== English → German translation (DOM and canvas text).
  // ---- Language: English (source text) or German. DOM text is swapped by a MutationObserver, canvas text in fillText,
  // so game code keeps writing English. Exact phrases first, then patterns for text with numbers, then " / " and " · " pieces.
  const DE = {
    // Home, modes, garage
    'ANTI-GRAVITY RACING SYSTEM': 'ANTI-GRAVITATIONS-RENNSYSTEM', 'THE FUTURE HAS NO SPEED LIMIT': 'DIE ZUKUNFT KENNT KEIN TEMPOLIMIT',
    'Zero gravity. Full throttle.': 'Null Schwerkraft. Vollgas.', 'Leave the ordinary in another dimension.': 'Lass das Gewöhnliche in einer anderen Dimension zurück.',
    'ENTER THE RACE': 'ZUM RENNEN', 'ENTER': 'ENTER', 'TO LAUNCH': 'ZUM STARTEN', 'TAP TO LAUNCH': 'TIPPEN ZUM STARTEN', 'LOCKED CIRCUIT': 'STRECKE GESPERRT',
    'GAME MODE': 'SPIELMODUS', '🏁 GRAND PRIX': '🏁 GRAND PRIX', '⏱ TIME TRIAL': '⏱ ZEITFAHREN', '☣ ENDLESS': '☣ ENDLOS', 'TIME TRIAL': 'ZEITFAHREN', 'GRAND PRIX': 'GRAND PRIX',
    'YOUR MACHINE': 'DEIN GLEITER', 'SELECT LEVEL': 'STRECKE WÄHLEN', 'CLASS': 'KLASSE', 'DISTANCE': 'DISTANZ', 'DIFFICULTY': 'SCHWIERIGKEIT',
    'BALANCED / PRECISION HANDLING': 'AUSGEWOGEN / PRÄZISES HANDLING', 'AGGRESSIVE / HIGH TOP SPEED': 'AGGRESSIV / HOHE SPITZE', 'AGILE / EXTENDED OVERDRIVE': 'WENDIG / LANGER OVERDRIVE',
    'THE ELECTRIC METROPOLIS': 'DIE ELEKTRISCHE METROPOLE', 'BURN THROUGH THE AFTERGLOW': 'BRENN DURCH DAS ABENDROT', 'DIVE INTO THE ULTRAVIOLET': 'TAUCH INS ULTRAVIOLETT',
    'THREAD THE FRACTURED SKYLINE': 'DURCH DIE ZERBROCHENE SKYLINE', 'LOW GRIP / ZERO MARGIN': 'WENIG GRIP / NULL SPIELRAUM', 'RIDE THE GRAVITY SHEAR': 'REITE DIE SCHWERKRAFTSCHERE',
    'LASER GATES / NO BRAKES': 'LASERTORE / KEINE BREMSEN', 'THE FINAL IMPOSSIBLE LINE': 'DIE LETZTE UNMÖGLICHE LINIE',
    '📅 DAILY CHALLENGE': '📅 TAGES-CHALLENGE', 'DAILY CHALLENGE': 'TAGES-CHALLENGE', 'GO ›': 'LOS ›', 'COME BACK TOMORROW': 'KOMM MORGEN WIEDER',
    '📊 STATS': '📊 STATISTIK', '⚙ SETTINGS': '⚙ EINSTELLUNGEN', '☰ CHANGELOG': '☰ NEUIGKEITEN', 'LIVE CIRCUIT FEED': 'LIVE-STRECKENBILD',
    'NO RIVALS, NO UFOS': 'KEINE RIVALEN, KEINE UFOS',
    // HUD
    'POSITION': 'PLATZ', 'LIVES': 'LEBEN', 'LIFE': 'LEBEN', 'LAP': 'RUNDE', 'PAUSE': 'PAUSE', 'CIRCUIT TELEMETRY': 'STRECKEN-TELEMETRIE', '✦ HYPERDRIVE': '✦ HYPERANTRIEB',
    'ANTI-GRAVITY DRIVE ONLINE': 'ANTI-GRAVITATIONSANTRIEB AKTIV', 'LOW ENERGY / RECHARGING': 'WENIG ENERGIE / LÄDT', 'HULL SHIELD': 'RUMPFSCHILD', 'BOOST ENERGY': 'BOOST-ENERGIE',
    'LASER CELLS': 'LASERZELLEN', 'UFO KILLS → MOTHERSHIP': 'UFO-ABSCHÜSSE → MUTTERSCHIFF', 'SPACE': 'LEER', 'BOOST': 'BOOST', 'LASER': 'LASER', '↟ CYAN PADS': '↟ CYAN-PADS',
    'TUTORIAL': 'TUTORIAL', 'SKIP ›': 'ÜBERSPRINGEN ›', 'DRAG ◀ ▶': 'ZIEHEN ◀ ▶', 'TILT ◀ ▶': 'KIPPEN ◀ ▶', 'STEER': 'LENKEN', 'SLIDE ▲': 'WISCHEN ▲', 'SLIDE ▼': 'WISCHEN ▼',
    'BRAKE': 'BREMSE', 'TAP': 'TIPPEN', 'ACCELERATE': 'GAS', 'ESC': 'ESC', 'BEST — —:—': 'BESTZEIT — —:—',
    // Health warning
    '⚠ PLEASE READ BEFORE PLAYING': '⚠ BITTE VOR DEM SPIELEN LESEN', 'HEALTH WARNING': 'GESUNDHEITSHINWEIS', 'Photosensitive seizures.': 'Lichtempfindliche Anfälle.',
    'This game contains flashing lights, rapidly changing colours, strobe-like explosions and fast-moving patterns. A very small percentage of people may experience seizures or blackouts when exposed to such images, even without any history of epilepsy.':
      'Dieses Spiel enthält Blitzlichter, schnell wechselnde Farben, stroboskopartige Explosionen und schnelle Muster. Bei einem sehr kleinen Teil der Menschen können solche Bilder Anfälle oder Bewusstseinsverlust auslösen, auch ohne bekannte Epilepsie.',
    'Stop playing immediately and consult a doctor': 'Hör sofort auf zu spielen und suche einen Arzt auf,',
    'if you or anyone watching experiences dizziness, altered vision, eye or muscle twitching, disorientation, involuntary movements or convulsions. Parents should supervise children while they play.':
      'wenn du oder jemand, der zusieht, Schwindel, Sehstörungen, Augen- oder Muskelzucken, Orientierungslosigkeit, unwillkürliche Bewegungen oder Krämpfe bemerkt. Eltern sollten Kinder beim Spielen beaufsichtigen.',
    'Play safely:': 'Sicher spielen:',
    'sit at a distance from the screen, play in a well-lit room, take a 10–15 minute break every hour and do not play when tired. Motion steering (gyro) and the speed effects can cause motion sickness — switch to touch steering in Settings if you feel unwell. Keep the volume at a comfortable level, especially with headphones.':
      'halte Abstand zum Bildschirm, spiele in einem hellen Raum, mach jede Stunde 10–15 Minuten Pause und spiele nicht, wenn du müde bist. Bewegungssteuerung (Gyro) und die Geschwindigkeitseffekte können Übelkeit verursachen — wechsle in den Einstellungen zur Touch-Steuerung, wenn dir unwohl ist. Halte die Lautstärke angenehm, besonders mit Kopfhörern.',
    'I UNDERSTAND': 'VERSTANDEN',
    // Shop, paints, trophies, stats
    'GARAGE / SHIP UPGRADES': 'GARAGE / SCHIFFS-UPGRADES', 'UPGRADES': 'UPGRADES', 'CREDITS': 'CREDITS',
    'Earn credits for finishing positions, podiums, rival and UFO kills, motherships and bosses.': 'Credits gibt es für Platzierungen, Podien, Abschüsse von Rivalen und UFOs, Mutterschiffe und Bosse.',
    '🛡 HULL ARMOR': '🛡 RUMPFPANZER', '◎ LASER BANK': '◎ LASERSPEICHER', 'ϟ BOOST CORE': 'ϟ BOOST-KERN', 'MAX': 'MAX',
    'PAINT SHOP': 'LACKIEREREI', 'Change the look of your ship. Trophy paint jobs unlock with the named trophy.': 'Ändere das Aussehen deines Schiffs. Trophäen-Lackierungen schaltest du mit der genannten Trophäe frei.',
    'FACTORY': 'WERKSLACK', 'EQUIPPED': 'AUSGERÜSTET', 'STEALTH': 'TARNKAPPE', 'CHROME': 'CHROM', 'HOT RODS': 'FLAMMEN', 'RACING STRIPES': 'RENNSTREIFEN', '24K GOLD': '24K GOLD',
    'NEON KITTY': 'NEON-KÄTZCHEN', 'HYPER RAINBOW': 'HYPER-REGENBOGEN', 'BACK TO THE GARAGE': 'ZURÜCK IN DIE GARAGE',
    'HALL OF FAME': 'RUHMESHALLE', 'TROPHIES': 'TROPHÄEN', 'UNLOCKED': 'FREIGESCHALTET', 'ACHIEVEMENT UNLOCKED': 'ERFOLG FREIGESCHALTET',
    'Finish your first race.': 'Beende dein erstes Rennen.', 'Finish in the top 3.': 'Komm unter die Top 3.', 'Win a race.': 'Gewinne ein Rennen.',
    'Win a race without losing a life.': 'Gewinne ein Rennen, ohne ein Leben zu verlieren.', 'Pixel-poof 10 cats.': 'Pixel-poffe 10 Katzen.', 'Shoot down 25 UFOs.': 'Schieß 25 UFOs ab.',
    'Destroy 50 rivals.': 'Zerstöre 50 Rivalen.', 'Destroy a mothership.': 'Zerstöre ein Mutterschiff.', 'Fly through a star gate.': 'Flieg durch ein Sternentor.',
    'Collect all four power-up types.': 'Sammle alle vier Power-up-Arten.', 'Defeat the final boss and reach the disco.': 'Besiege den Endboss und erreiche die Disco.',
    'Beat all six bosses of Singularity Run.': 'Besiege alle sechs Bosse von Singularity Run.', 'Buy your first upgrade.': 'Kauf dein erstes Upgrade.',
    'Max out every upgrade.': 'Bau jedes Upgrade voll aus.', 'Unlock every circuit.': 'Schalte jede Strecke frei.', 'Find the secret on the title screen.': 'Finde das Geheimnis auf dem Startbildschirm.',
    'Share a race result.': 'Teile ein Rennergebnis.', 'Destroy all three nemeses in one race.': 'Zerstöre alle drei Erzfeinde in einem Rennen.',
    'PILOT RECORD': 'PILOTENAKTE', 'STATS': 'STATISTIK', 'RACES': 'RENNEN', 'WINS': 'SIEGE', 'PODIUMS': 'PODIEN', 'PLAY TIME': 'SPIELZEIT', 'FAVOURITE': 'LIEBLINGSSTRECKE',
    'RIVALS DESTROYED': 'RIVALEN ZERSTÖRT', 'UFOs SHOT DOWN': 'UFOS ABGESCHOSSEN', 'CATS POPPED': 'KATZEN GEPOFFT', 'BOSSES DEFEATED': 'BOSSE BESIEGT',
    'ENDLESS RECORD': 'ENDLOS-REKORD', 'DAILY STREAK': 'TAGESSERIE', 'MOVE YOUR PROGRESS': 'FORTSCHRITT ÜBERTRAGEN',
    'Export a code on this device and import it on another one — credits, upgrades, paints, trophies, circuits, records and settings come along.':
      'Exportiere auf diesem Gerät einen Code und importiere ihn auf einem anderen — Credits, Upgrades, Lackierungen, Trophäen, Strecken, Rekorde und Einstellungen kommen mit.',
    '⤴ EXPORT CODE': '⤴ CODE EXPORTIEREN', '⤵ IMPORT CODE': '⤵ CODE IMPORTIEREN',
    'CODE COPIED — PASTE IT ON YOUR OTHER DEVICE.': 'CODE KOPIERT — FÜGE IHN AUF DEINEM ANDEREN GERÄT EIN.', 'COPY THE CODE BELOW AND PASTE IT ON YOUR OTHER DEVICE.': 'KOPIERE DEN CODE UNTEN UND FÜGE IHN AUF DEINEM ANDEREN GERÄT EIN.',
    'PASTE A PROFILE CODE INTO THE BOX FIRST.': 'FÜGE ZUERST EINEN PROFILCODE IN DAS FELD EIN.', 'THAT CODE DOES NOT LOOK RIGHT. CHECK IT AND TRY AGAIN.': 'DER CODE SIEHT NICHT RICHTIG AUS. PRÜFE IHN UND VERSUCH ES NOCHMAL.',
    // Settings
    'CONTROLS & DISPLAY': 'STEUERUNG & ANZEIGE', 'SETTINGS': 'EINSTELLUNGEN', 'STEERING': 'LENKUNG', '⟲ GYRO': '⟲ GYRO', '☝ TOUCH / KEYS': '☝ TOUCH / TASTEN',
    'EASY': 'LEICHT', 'NORMAL': 'NORMAL', 'HARD': 'SCHWER', 'VIBRATION': 'VIBRATION', '〰 ON': '〰 AN', '∅ OFF': '∅ AUS', 'ON': 'AN', 'OFF': 'AUS',
    'CALM MODE': 'RUHIGER MODUS', 'LESS SHAKE & FLASHING': 'WENIGER WACKELN & BLITZE', 'COLOUR-BLIND': 'FARBENBLIND', '⚠ DANGER MARKS': '⚠ GEFAHRENMARKER',
    'PERFORMANCE': 'LEISTUNG', 'AUTO · WATCHING FPS': 'AUTO · BEOBACHTET FPS', 'AUTO · LOW FPS DETECTED': 'AUTO · NIEDRIGE FPS ERKANNT', 'FEWER EFFECTS': 'WENIGER EFFEKTE', 'ALL EFFECTS': 'ALLE EFFEKTE',
    'AUTO': 'AUTO', 'LOW FX': 'WENIG FX', 'FULL': 'VOLL', 'SUBTITLES': 'UNTERTITEL', 'FOR VOICES': 'FÜR STIMMEN', '↺ PLAY IT AGAIN': '↺ NOCHMAL SPIELEN',
    'SCREEN': 'BILDSCHIRM', '▭ LANDSCAPE': '▭ QUER', '▯ PORTRAIT': '▯ HOCH', 'LANDSCAPE': 'QUERFORMAT', 'PORTRAIT': 'HOCHFORMAT', 'DONE': 'FERTIG', 'LANGUAGE': 'SPRACHE',
    "WHAT'S NEW": 'WAS IST NEU', 'CHANGELOG': 'NEUIGKEITEN', 'CLOSE': 'SCHLIESSEN',
    'ASKING FOR MOTION SENSOR ACCESS…': 'FRAGE NACH ZUGRIFF AUF DEN BEWEGUNGSSENSOR…', 'GYRO NOT AVAILABLE — USING TOUCH': 'GYRO NICHT VERFÜGBAR — TOUCH WIRD GENUTZT',
    'GYRO ON — HOLD YOUR DEVICE NEUTRAL WHEN THE RACE STARTS': 'GYRO AN — HALTE DEIN GERÄT BEIM START NEUTRAL', 'DRAG ON THE TRACK TO STEER': 'ZUM LENKEN AUF DER STRECKE ZIEHEN',
    'VIBRATION ON': 'VIBRATION AN', 'VIBRATION OFF': 'VIBRATION AUS', 'THIS DEVICE CANNOT VIBRATE FROM THE WEB': 'DIESES GERÄT KANN IM BROWSER NICHT VIBRIEREN',
    'THE TUTORIAL RUNS IN YOUR NEXT GRAND PRIX': 'DAS TUTORIAL LÄUFT IN DEINEM NÄCHSTEN GRAND PRIX', 'LOW FPS · PERFORMANCE MODE ON': 'NIEDRIGE FPS · LEISTUNGSMODUS AN',
    // Pause, results, soundtrack, rotate
    'TAKE A BREATH, PILOT': 'DURCHATMEN, PILOT', 'RACE PAUSED': 'RENNEN PAUSIERT', 'The future can wait a moment.': 'Die Zukunft kann einen Moment warten.',
    'BACK TO OVERDRIVE': 'ZURÜCK IN DEN OVERDRIVE', 'RETURN TO GARAGE': 'ZURÜCK IN DIE GARAGE', 'NEON GRAND PRIX / RACE COMPLETE': 'NEON GRAND PRIX / RENNEN BEENDET',
    'PODIUM FINISH.': 'PODIUMSPLATZ.', 'PODIUM FINISH': 'PODIUMSPLATZ', 'LIMITS REDEFINED.': 'GRENZEN NEU DEFINIERT.', 'PURE OVERDRIVE.': 'PURER OVERDRIVE.', 'SHIELDS DOWN.': 'SCHILDE WEG.',
    'RACE TIME': 'RENNZEIT', 'BEST LAP': 'BESTE RUNDE', 'RACE AGAIN': 'NOCHMAL FAHREN', '⤴ SHARE RESULT': '⤴ ERGEBNIS TEILEN', 'NEW BEST TIME!': 'NEUE BESTZEIT!', 'TIME TRIAL DONE.': 'ZEITFAHREN BEENDET.',
    'GALAXY SAVED.': 'GALAXIE GERETTET.', 'ABDUCTED.': 'ENTFÜHRT.', 'GALAXY SAVED': 'GALAXIE GERETTET', 'GALAXY SAVED · INVASION REPELLED': 'GALAXIE GERETTET · INVASION ABGEWEHRT',
    'INTERGALACTIC CHAMPION / INVASION REPELLED': 'INTERGALAKTISCHER CHAMPION / INVASION ABGEWEHRT', 'GAME OVER / THE INVASION WON': 'GAME OVER / DIE INVASION HAT GESIEGT',
    'ENDLESS BOSS RUSH / GAME OVER': 'ENDLOSER BOSS-ANSTURM / GAME OVER', 'TARGET ACQUIRED.': 'ZIEL ERFASST.',
    'SOUNDTRACK / PRESS PLAY': 'SOUNDTRACK / PLAY DRÜCKEN', 'NOW PLAYING / LOCAL SOUNDTRACK': 'LÄUFT GERADE / LOKALER SOUNDTRACK', 'SOUNDTRACK / FILE UNAVAILABLE': 'SOUNDTRACK / DATEI FEHLT',
    'SOUNDTRACK / MUTED': 'SOUNDTRACK / STUMM', 'SOUNDTRACK / TAP TO PLAY': 'SOUNDTRACK / TIPPEN ZUM ABSPIELEN',
    'SYSTEM READY · SINGULARITY STABLE · GO RACE!': 'SYSTEM BEREIT · SINGULARITÄT STABIL · AB INS RENNEN!',
    'ROTATE TO LANDSCAPE': 'INS QUERFORMAT DREHEN', 'ROTATE TO PORTRAIT': 'INS HOCHFORMAT DREHEN', 'Your screen setting is': 'Deine Bildschirm-Einstellung ist', '. Turn your device to play.': '. Dreh dein Gerät zum Spielen.',
    'SWITCH TO': 'WECHSELN ZU', 'INSTEAD': '', 'CONGRATULATIONS!': 'GLÜCKWUNSCH!',
    // Race messages
    'BACK IN THE FIGHT!': 'ZURÜCK IM KAMPF!', 'BACK IN THE RACE!': 'ZURÜCK IM RENNEN!', 'BARRIER CONTACT': 'BANDENKONTAKT', 'BOMB DODGED!': 'BOMBE AUSGEWICHEN!',
    'BOOST DEPLETED': 'BOOST LEER', 'BOOST RAM': 'BOOST-RAMME', 'RIVAL DESTROYED': 'RIVALE ZERSTÖRT', 'HULL CONTACT': 'RUMPFKONTAKT', 'HYPERDRIVE OFFLINE': 'HYPERANTRIEB AUS',
    'HYPERDRIVE!': 'HYPERANTRIEB!', 'LASER CELLS RECHARGING': 'LASERZELLEN LADEN', 'LEGENDARY!  SHIELD + LASER RESTORED': 'LEGENDÄR!  SCHILD + LASER WIEDERHERGESTELLT',
    'LIGHT SPEED': 'LICHTGESCHWINDIGKEIT', 'INVINCIBLE': 'UNVERWUNDBAR', 'MEGA LASER': 'MEGA-LASER', '∞ BOOST': '∞ BOOST', 'MEGA BLAST!': 'MEGA-EXPLOSION!',
    'MOTHERSHIP DESTROYED!': 'MUTTERSCHIFF ZERSTÖRT!', 'NEW UFO INBOUND!': 'NEUES UFO IM ANFLUG!', 'RECHARGE': 'AUFLADEN', 'BOOST + SHIELD + LASER': 'BOOST + SCHILD + LASER',
    'RIVAL LASER LOCK!  BREAK LINE OF SIGHT': 'RIVALE HAT DICH IM VISIER!  RAUS AUS DER SCHUSSLINIE', 'WARNING': 'WARNUNG', 'RIVAL LASER LOCK': 'RIVALE ZIELT',
    'SHIELDS DOWN': 'SCHILDE WEG', 'TOTAL CHAIN REACTION': 'TOTALE KETTENREAKTION', 'SHIP DESTROYED!': 'SCHIFF ZERSTÖRT!', 'SMASHED THROUGH!': 'DURCHGEBROCHEN!',
    'TARGET MISSED': 'DANEBEN', 'LASERS LOW': 'LASER FAST LEER', 'THE MOTHERSHIP HAS ARRIVED': 'DAS MUTTERSCHIFF IST DA', 'SHOOT IT DOWN!': 'SCHIESS ES AB!',
    'THE SKY CLEARS': 'DER HIMMEL KLART AUF', 'TRAMPOLINE!  JUMP + BOOST!': 'TRAMPOLIN!  SPRUNG + BOOST!', 'UFO BOMB RUN!  DODGE OR JUMP!': 'UFO-BOMBENANGRIFF!  AUSWEICHEN ODER SPRINGEN!',
    'UFO BOMB RUN': 'UFO-BOMBENANGRIFF', 'DODGE!': 'AUSWEICHEN!', 'UFO HIT': 'UFO GETROFFEN', 'IT IS GOING DOWN!': 'ES STÜRZT AB!', 'WARNING: MOTHERSHIP!': 'WARNUNG: MUTTERSCHIFF!',
    'WEBBED!  SLOWED DOWN': 'EINGESPONNEN!  VERLANGSAMT', '🎮 GAMEPAD CONNECTED': '🎮 GAMEPAD VERBUNDEN', 'AIRBORNE': 'IN DER LUFT', 'TRAMPOLINE BOOST': 'TRAMPOLIN-BOOST',
    'BUBBLE POPPED!': 'BLASE GEPLATZT!', 'CATASTROPHIC FAILURE / SHIELDS OFFLINE': 'TOTALAUSFALL / SCHILDE OFFLINE', 'CAT PIXEL-POOF!  LASER +1': 'KATZEN-PIXEL-POFF!  LASER +1',
    'CAT PIXEL-POOF!  LASER FULL': 'KATZEN-PIXEL-POFF!  LASER VOLL', 'DRONE COLLISION': 'DROHNEN-KOLLISION', 'ENEMY LASER HIT': 'FEINDLICHER LASERTREFFER',
    'FINAL LAP — MAKE IT COUNT': 'LETZTE RUNDE — JETZT ZÄHLT ES', 'FINISH TOP 3 TO UNLOCK THE NEXT CIRCUIT  ·  WIN TO FACE THE INVASION!': 'TOP 3 SCHALTET DIE NÄCHSTE STRECKE FREI  ·  SIEG FÜHRT ZUR INVASION!',
    'HULL LOST / THE WHOLE PACK WENT NOVA': 'RUMPF VERLOREN / DAS GANZE FELD GING HOCH', 'LASER GATE HIT': 'LASERTOR GETROFFEN', 'MINE STRIKE': 'MINENTREFFER',
    'MOTHERSHIP LASER': 'MUTTERSCHIFF-LASER', 'LIGHTNING STRIKE': 'BLITZEINSCHLAG', 'METEOR STRIKE!': 'METEORTREFFER!', 'UFO BOMB HIT!': 'UFO-BOMBENTREFFER!',
    'RIVAL DESTROYED  /  +1 PLACE': 'RIVALE ZERSTÖRT  /  +1 PLATZ', 'BOSS DOWN': 'BOSS BESIEGT', 'RIVAL DOWN': 'RIVALE ERLEDIGT', 'UFO DOWN': 'UFO ERLEDIGT',
    'MOTHERSHIP DOWN': 'MUTTERSCHIFF ERLEDIGT', 'NEMESIS DOWN': 'ERZFEIND ERLEDIGT', 'DAILY STREAK BONUS': 'TAGESSERIEN-BONUS',
    'WATCH THE IMPACT MARKERS!': 'ACHTE AUF DIE EINSCHLAGMARKER!', 'VISIBILITY DROPPING': 'SICHT SINKT', 'THE TRACK PULLS YOU SIDEWAYS': 'DIE STRECKE ZIEHT DICH ZUR SEITE',
    '☄ METEOR SHOWER': '☄ METEORSCHAUER', '🌪 SANDSTORM': '🌪 SANDSTURM', '〰 GRAVITY WAVES': '〰 SCHWERKRAFTWELLEN',
    'MAGNET': 'MAGNET', 'SHIELD BUBBLE': 'SCHUTZBLASE', 'TIME WARP': 'ZEITLUPE', 'MULTI-LASER': 'MULTI-LASER',
    'PULLS IN PADS, CATS, GATES AND POWER-UPS': 'ZIEHT PADS, KATZEN, TORE UND POWER-UPS AN', 'ABSORBS THE NEXT 3 HITS': 'FÄNGT DIE NÄCHSTEN 3 TREFFER AB',
    'EVERYONE ELSE MOVES IN SLOW MOTION': 'ALLE ANDEREN FAHREN IN ZEITLUPE', 'EVERY SHOT HITS UP TO 3 TARGETS': 'JEDER SCHUSS TRIFFT BIS ZU 3 ZIELE',
    'HOMING MISSILE': 'ZIELSUCH-RAKETE', 'MINE LAYER': 'MINENLEGER', 'EMP BLAST': 'EMP-STOSS', 'LOCKS ON TO THE NEXT RIVAL AHEAD': 'ERFASST DEN NÄCHSTEN RIVALEN VOR DIR',
    'THREE MINES DROPPED BEHIND YOU': 'DREI MINEN HINTER DIR ABGEWORFEN', 'RIVALS AHEAD LOSE BOOST AND LASERS': 'RIVALEN VOR DIR VERLIEREN BOOST UND LASER',
    'MISSILE HIT': 'RAKETENTREFFER', 'RIVAL HIT YOUR MINE!': 'RIVALE AUF DEINE MINE GEFAHREN!', 'SLIPSTREAM': 'WINDSCHATTEN', 'BOOST CHARGING': 'BOOST LÄDT',
    // Tutorial
    'TILT YOUR DEVICE TO STEER': 'KIPPE DEIN GERÄT ZUM LENKEN', 'DRAG LEFT / RIGHT ON THE TRACK TO STEER': 'ZIEH AUF DER STRECKE NACH LINKS / RECHTS ZUM LENKEN',
    'STEER WITH  A / D  OR  ◀ ▶': 'LENKEN MIT  A / D  ODER  ◀ ▶', 'SLIDE UP (OR TAP ϟ) TO BOOST': 'NACH OBEN WISCHEN (ODER ϟ TIPPEN) FÜR BOOST', 'HOLD  SPACE  TO BOOST': 'HALTE  LEERTASTE  FÜR BOOST',
    'TAP THE TRACK (OR ◎) TO FIRE YOUR LASER': 'TIPP AUF DIE STRECKE (ODER ◎) FÜR DEN LASER', 'PRESS  X  TO FIRE YOUR LASER': 'DRÜCKE  X  FÜR DEN LASER',
    'CYAN PADS RECHARGE BOOST, SHIELD AND LASER': 'CYAN-PADS LADEN BOOST, SCHILD UND LASER', 'GRAB POWER-UP BOXES  ·  FLY THROUGH ✦ STAR GATES FOR HYPERDRIVE': 'SCHNAPP DIR POWER-UP-BOXEN  ·  FLIEG DURCH ✦ STERNENTORE FÜR DEN HYPERANTRIEB',
    // Finale
    '⚠ INVASION INCOMING ⚠': '⚠ INVASION IM ANMARSCH ⚠', '◀ ▶ MOVE  ·  FIRE: BLAST A HOLE IN THE WALL, THEN HIT THE OVERLORD': '◀ ▶ BEWEGEN  ·  FEUER: SPRENG EIN LOCH IN DIE WAND, DANN TRIFF DEN OBERHERRN',
    '⚠ WORMHOLE — MOVE!': '⚠ WURMLOCH — WEG DA!', 'FINAL BOSS!': 'ENDBOSS!', 'OVERLORD SPLATTERED!': 'OBERHERR ZERMATSCHT!', 'ENDLESS BOSS RUSH — WAVE 1!': 'ENDLOSER BOSS-ANSTURM — WELLE 1!',
    'HULL SHIELD ': 'RUMPFSCHILD ', 'SLIMED!': 'EINGESCHLEIMT!', 'ACID BURN!': 'SÄUREVERÄTZUNG!', 'MISSILE HIT!': 'RAKETENTREFFER!', 'CRYSTAL SHARD!': 'KRISTALLSPLITTER!', 'ZAPPED!': 'GEGRILLT!',
    'CHOMP!': 'HAPPS!', 'DEATH RAY!': 'TODESSTRAHL!', 'NEXT ONE INCOMING': 'DER NÄCHSTE KOMMT', 'SHARK SPLATTERED!': 'HAI ZERMATSCHT!', 'SPIDER SHATTERED!': 'SPINNE ZERSPLITTERT!',
    'MAGGOT SQUASHED!': 'MADE ZERQUETSCHT!', 'ROBOT SCRAPPED!': 'ROBOTER VERSCHROTTET!', 'CYCLOPS POPPED!': 'ZYKLOP GEPLATZT!',
  };
  const DE_RULES = [
    [/^(\d+) LAPS · (\d+) PILOTS · NO LIMITS$/, '$1 RUNDEN · $2 PILOTEN · OHNE LIMIT'],
    [/^(\d+) PILOTS · (\d+) LAPS · WIN TO FACE THE INVASION$/, '$1 PILOTEN · $2 RUNDEN · GEWINNE UND STELL DICH DER INVASION'],
    [/^CIRCUITS UNLOCKED: (.+)$/, 'STRECKEN FREI: $1'], [/^REWARD (\d+) CR$/, 'BELOHNUNG $1 CR'], [/^🔥 STREAK (\d+)$/, '🔥 SERIE $1'],
    [/^DESTROY (\d+) RIVALS ON (.+)$/, 'ZERSTÖRE $1 RIVALEN AUF $2'], [/^SHOOT DOWN (\d+) UFOs ON (.+)$/, 'SCHIESS $1 UFOS AB AUF $2'], [/^POP (\d+) CATS ON (.+)$/, 'POFFE $1 KATZEN AUF $2'],
    [/^FINISH (.+) WITHOUT LOSING A LIFE$/, 'BEENDE $1 OHNE LEBENSVERLUST'], [/^TOP 3 ON (.+) WITHOUT BOOSTING$/, 'TOP 3 AUF $1 OHNE BOOST'], [/^PODIUM ON (.+) ON HARD$/, 'PODIUM AUF $1 AUF SCHWER'], [/^WIN (.+)$/, 'GEWINNE $1'],
    [/^✓ DONE — (.+)$/, (m, a) => `✓ GESCHAFFT — ${tr(a)}`], [/^📅 DAILY CHALLENGE COMPLETE!  🔥 (\d+)-DAY STREAK$/, '📅 TAGES-CHALLENGE GESCHAFFT!  🔥 $1-TAGE-SERIE'],
    [/^🛠 UPGRADES · (\d+) CR$/, '🛠 UPGRADES · $1 CR'], [/^🏆 TROPHIES (.+)$/, '🏆 TROPHÄEN $1'], [/^NOW: (.+)$/, (m, a) => `JETZT: ${tr(a)}`], [/^NEXT: (.+)$/, (m, a) => `NÄCHSTE: ${tr(a)}`],
    [/^MAXED OUT — (.+)$/, (m, a) => `VOLL AUSGEBAUT — ${tr(a)}`], [/^takes (\d+)% less damage$/, 'nimmt $1 % weniger Schaden'], [/^(\d+) cells, recharge (\d+)% faster$/, '$1 Zellen, lädt $2 % schneller'],
    [/^(\d+)% less drain, \+(\d+)% top speed$/, '$1 % weniger Verbrauch, +$2 % Spitze'], [/^UPGRADE · (\d+) CR$/, 'UPGRADE · $1 CR'], [/^BUY · (\d+) CR$/, 'KAUFEN · $1 CR'],
    [/^(\d+) WAVES?\.?$/, (m, a) => `${a} ${a === '1' ? 'WELLE' : 'WELLEN'}${m.endsWith('.') ? '.' : ''}`], [/^(\d+) DAYS$/, '$1 TAGE'], [/^(\d+)H (\d+)M$/, '$1 STD $2 MIN'],
    [/^BEST (.+)$/, 'BESTZEIT $1'], [/^LAP (\d+) \/ (\d+) — KEEP PUSHING$/, 'RUNDE $1 / $2 — WEITER SO'], [/^P(\d+) FINISH$/, 'PLATZ $1'], [/^TIME TRIAL \/ (.+)$/, 'ZEITFAHREN / $1'],
    [/^\+(\d+) CR EARNED  ·  (\d+) CR TOTAL$/, '+$1 CR VERDIENT  ·  $2 CR GESAMT'], [/^DIFFICULTY: (\w+) · (.*?)(\d+)% CREDITS$/, (m, d, l, c) => `SCHWIERIGKEIT: ${tr(d)} · ${l.replace('+1 LIFE', '+1 LEBEN').replace('-1 LIFE', '-1 LEBEN')}${c} % CREDITS`],
    [/^SHIP DESTROYED  \/  (\d+) LI(?:VES|FE) LEFT$/, 'SCHIFF ZERSTÖRT  /  NOCH $1 LEBEN'], [/^SHIP DESTROYED!  (\d+) LI(?:VES|FE) LEFT$/, 'SCHIFF ZERSTÖRT!  NOCH $1 LEBEN'],
    [/^MOTHERSHIP HIT  \/  (\d+)%$/, 'MUTTERSCHIFF GETROFFEN  /  $1 %'], [/^RIVAL HIT  \/  HULL (.+)$/, 'RIVALE GETROFFEN  /  RUMPF $1'], [/^(.+) HIT  \/  HULL (\d\/6)$/, '$1 GETROFFEN  /  RUMPF $2'],
    [/^EMP  \/  (\d+) RIVALS STALLED$/, 'EMP  /  $1 RIVALEN LAHMGELEGT'], [/^MISSILE GOT (.+)!$/, 'RAKETE ERWISCHT $1!'],
    [/^NEMESIS (.+) DESTROYED!$/, 'ERZFEIND $1 ZERSTÖRT!'], [/^(.+) IS OUT!$/, '$1 IST RAUS!'], [/^(.+) HIT YOU$/, '$1 HAT DICH ERWISCHT'], [/^BUBBLE ABSORBED IT  \/  (\d+) LEFT$/, 'DIE BLASE HAT ES ABGEFANGEN  /  NOCH $1'],
    [/^([^/·]+)  SHIELD -(\d+)$/, (m, a, n) => `${tr(a)}  SCHILD -${n}`], [/^SHIELD -(\d+)$/, 'SCHILD -$1'], [/^([A-Z-]+) HIT  \/  (\d+) TO GO$/, '$1 GETROFFEN  /  NOCH $2'],
    [/^BOSS (\d+)\/(\d+) DOWN  \/  NEXT ONE INCOMING$/, 'BOSS $1/$2 BESIEGT  /  DER NÄCHSTE KOMMT'], [/^WAVE (\d+) CLEARED  \/  NEXT ONE INCOMING$/, 'WELLE $1 GESCHAFFT  /  DIE NÄCHSTE KOMMT'],
    [/^WAVE (\d+): (.+)$/, 'WELLE $1: $2'], [/^FINAL BOSS (\d+)\/(\d+)!$/, 'ENDBOSS $1/$2!'], [/^ALIEN WALL (.+)$/, 'ALIEN-WAND $1'], [/^LIVES (.*)$/, 'LEBEN $1'],
    [/^(\d+)% CREDITS$/, '$1 % CREDITS'], [/^LOADING MUSIC (\d+)%$/, 'MUSIK LÄDT $1 %'], [/^SOUNDTRACK \/ LOADING (\d+)%$/, 'SOUNDTRACK / LÄDT $1 %'],
    [/^ROTATE TO (\w+)$/, (m, a) => `INS ${a === 'LANDSCAPE' ? 'QUERFORMAT' : 'HOCHFORMAT'} DREHEN`], [/^SCREEN: (\w+)$/, (m, a) => `BILDSCHIRM: ${tr(a)}`],
    [/^TUTORIAL (\d+)\/(\d+)$/, 'TUTORIAL $1/$2'], [/^🔒 LOCKED — FINISH TOP 3 ON (.+) TO UNLOCK$/, '🔒 GESPERRT — KOMM AUF $1 UNTER DIE TOP 3'], [/^🔓 NEW CIRCUIT UNLOCKED: (.+)!$/, '🔓 NEUE STRECKE FREI: $1!'],
    [/^✦ NEW ENDLESS RECORD! \(previous best: (\d+)\)$/, '✦ NEUER ENDLOS-REKORD! (bisher: $1)'], [/^BOSS AFTER BOSS UNTIL YOU FALL · RECORD (\d+) WAVES$/, 'BOSS UM BOSS, BIS DU FÄLLST · REKORD $1 WELLEN'],
    [/^(\d+) BOSS(?:ES)? SPLATTERED · (\d+) UFOs$/, '$1 BOSS(E) ZERMATSCHT · $2 UFOS'], [/^(\d+) UFOs SHOT DOWN · (\d+) TROPHIES$/, '$1 UFOS ABGESCHOSSEN · $2 TROPHÄEN'],
    [/^TIME (.+)   BEST LAP (.+)$/, 'ZEIT $1   BESTE RUNDE $2'], [/^(.+)  \/  HYPER VELOCITY$/, '$1  /  HYPERTEMPO'], [/^(\d[\d.,]*) KM$/, '$1 KM'],
    [/^☠ MOTHERSHIP  (\d+)%$/, '☠ MUTTERSCHIFF  $1 %'], [/^(.+) — UPGRADE$/, '$1 — UPGRADE'],
  ];
  const trCache = new Map();
  function trCore(core) {
    if (Object.prototype.hasOwnProperty.call(DE, core)) return DE[core];
    for (const [re, rep] of DE_RULES) if (re.test(core)) return core.replace(re, rep);
    return null;
  }
  function tr(text) {
    if (settings.lang !== 'de' || typeof text !== 'string' || !/[A-Za-z]{2}/.test(text)) return text;
    const hit = trCache.get(text); if (hit !== undefined) return hit;
    const lead = text.match(/^\s*/)[0], core = text.trim(), trail = core ? text.slice(lead.length + core.length) : '';
    let out = trCore(core);
    // Composite messages: translate each piece between " / " and " · " separators.
    if (out === null) out = /\s[\/·]\s/.test(core) ? core.split(/(\s+[\/·]\s+)/).map(p => /[\/·]/.test(p) && !p.trim().replace(/[\/·]/, '') ? p : (trCore(p.trim()) ?? p)).join('') : core;
    out = lead + out + trail; if (trCache.size > 1500) trCache.clear(); trCache.set(text, out); return out;
  }
  // DOM: remember each text node's English source so switching back and forth works, and re-translate whenever code writes text.
  const i18nNodes = new WeakMap();
  function trNode(n) {
    const rec = i18nNodes.get(n), cur = n.nodeValue, en = rec && cur === rec.out ? rec.en : cur, out = tr(en);
    i18nNodes.set(n, { en, out }); if (cur !== out) n.nodeValue = out;
  }
  function trTree(root) {
    if (!root || typeof document.createTreeWalker !== 'function') return;
    if (root.nodeType === 3) { trNode(root); return; }
    if (root.nodeType !== 1 || /^(SCRIPT|STYLE|TEXTAREA)$/.test(root.nodeName) || root.closest?.('[data-no-i18n]')) return;
    const walker = document.createTreeWalker(root, 4); let n;
    while ((n = walker.nextNode())) if (!/^(SCRIPT|STYLE|TEXTAREA)$/.test(n.parentNode.nodeName) && !n.parentNode.closest?.('[data-no-i18n]')) trNode(n);
  }
  function applyLanguage() {
    trCache.clear();
    try { document.documentElement.lang = settings.lang === 'de' ? 'de' : 'en'; } catch { /* ignore */ }
    trTree(document.body);
  }
  if (typeof MutationObserver === 'function' && document.body) {
    new MutationObserver(list => { for (const m of list) { if (m.type === 'characterData') trNode(m.target); else m.addedNodes.forEach(trTree); } })
      .observe(document.body, { childList: true, characterData: true, subtree: true });
  }
  // Canvas text (callouts, finale, HUD on canvas) goes through the same table.
  try {
    const fill = ctx.fillText, stroke = ctx.strokeText;
    if (typeof fill === 'function') { ctx.fillText = function (t, ...a) { return fill.call(this, tr(t), ...a); }; ctx.strokeText = function (t, ...a) { return stroke.call(this, tr(t), ...a); }; }
  } catch { /* fixed context */ }
  settingHooks.lang = applyLanguage;
  window.morbidI18n = { tr, apply: applyLanguage };
