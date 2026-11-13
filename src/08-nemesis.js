  // ==== Named nemesis rivals (data is used by the voice clip list).
  const NEMESES = [
    { id: 'vex', name: 'VEX', title: 'THE VIPER QUEEN', color: '#ff2a8a', dark: '#4a0420' },
    { id: 'kronos', name: 'KRONOS', title: 'THE IRON TITAN', color: '#ffb347', dark: '#4a2a04' },
    { id: 'null9', name: 'NULL-9', title: 'THE ROGUE AI', color: '#7dfcff', dark: '#06343a' },
    { id: 'blaze', name: 'BLAZE', title: 'THE SHOW-OFF', color: '#ff5a1c', dark: '#3a0e02' },
  ];
  function nemesisTaunt(r) {
    if (time - (r.tauntAt || 0) < 8) return; r.tauntAt = time;
    const lines = { vex: 'YOU ARE GOING DOWN, ROOKIE!', kronos: 'KRONOS OWNS THIS TRACK!', null9: 'TARGET ACQUIRED.', blaze: 'EAT MY EXHAUST!' };
    showCallout(`${r.nemesis.name}: “${lines[r.nemesis.id]}”`, r.nemesis.color); robotSay(lines[r.nemesis.id], `taunt-${r.nemesis.id}`);
  }
